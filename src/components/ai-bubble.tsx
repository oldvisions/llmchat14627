import { useChatContext } from "@/context/chat/provider";
import { useSessionsContext } from "@/context/sessions/provider";
import { useSettings } from "@/context/settings/context";
import { TChatMessage } from "@/hooks/use-chat-session";
import { useClipboard } from "@/hooks/use-clipboard";
import { useMarkdown } from "@/hooks/use-mdx";
import { useModelList } from "@/hooks/use-model-list";
import { TToolKey, useTools } from "@/hooks/use-tools";
import { useTextSelection } from "@/hooks/usse-text-selection";
import { Check, Copy, Quotes, TrashSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import * as Selection from "selection-popover";
import { RegenerateWithModelSelect } from "./regenerate-model-select";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Flex } from "./ui/flex";
import Spinner from "./ui/loading-spinner";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Type } from "./ui/text";
import { Tooltip } from "./ui/tooltip";

export type TAIMessageBubble = {
  chatMessage: TChatMessage;
  isLast: boolean;
};

export const AIMessageBubble = ({ chatMessage, isLast }: TAIMessageBubble) => {
  const {
    id,
    rawAI,
    isLoading,
    stop,
    stopReason,
    isToolRunning,
    toolName,
    inputProps,
  } = chatMessage;

  const { getToolInfoByKey } = useTools();

  const toolUsed = toolName
    ? getToolInfoByKey(toolName as TToolKey)
    : undefined;
  const messageRef = useRef<HTMLDivElement>(null);
  const { showCopied, copy } = useClipboard();
  const { getModelByKey, getAssistantByKey } = useModelList();
  const { renderMarkdown, links } = useMarkdown();
  const { open: openSettings } = useSettings();
  const { removeMessage, currentSession } = useSessionsContext();
  const { handleRunModel, setContextValue, editor } = useChatContext();
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const { selectedText } = useTextSelection();

  const modelForMessage = getModelByKey(inputProps.assistant.baseModel);

  const handleCopyContent = () => {
    messageRef?.current && rawAI && copy(rawAI);
  };

  const renderStopReason = () => {
    if (stopReason === "error") {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            Something went wrong. please make sure your api is working properly{" "}
            <Button
              variant="link"
              size="link"
              onClick={() => {
                openSettings();
              }}
            >
              Check API Key
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (stopReason === "cancel") {
      return (
        <Type size="sm" textColor="tertiary" className="italic">
          Chat session ended
        </Type>
      );
    }
    if (stopReason === "apikey") {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            Invalid API Key{" "}
            <Button
              variant="link"
              size="link"
              onClick={() => {
                openSettings();
              }}
            >
              Check API Key
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (stopReason === "recursion") {
      return (
        <Alert variant="destructive">
          {" "}
          <AlertDescription>Recursion detected</AlertDescription>
        </Alert>
      );
    }
  };

  return (
    <div className="flex flex-row mt-6 w-full">
      <div className="p-2 md:px-3 md:py-2">{modelForMessage?.icon("sm")}</div>
      <Flex
        ref={messageRef}
        direction="col"
        gap="md"
        items="start"
        className="w-full p-2 flex-1 overflow-hidden"
      >
        {toolUsed && (
          <Type
            size="xs"
            className="flex flex-row gap-2 items-center"
            textColor="tertiary"
          >
            {isToolRunning ? <Spinner /> : toolUsed.smallIcon()}
            {isToolRunning ? (
              <Type size="sm" textColor="tertiary">
                {toolUsed.loadingMessage}
              </Type>
            ) : (
              <Type size="sm" textColor="tertiary">
                {toolUsed.resultMessage}
              </Type>
            )}
          </Type>
        )}

        {rawAI && (
          <Selection.Root>
            <Selection.Trigger asChild>
              <article className="prose dark:prose-invert w-full prose-zinc prose-h3:font-medium prose-h3:text-lg prose-heading:font-medium prose-strong:font-medium prose-headings:text-lg prose-th:text-sm">
                {renderMarkdown(rawAI, !!isLoading, id)}
              </article>
            </Selection.Trigger>
            <Selection.Portal
              container={document?.getElementById("chat-container")}
            >
              <Selection.Content sticky="always" sideOffset={10}>
                {selectedText && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setContextValue(selectedText);
                      editor?.commands.clearContent();
                      editor?.commands.focus("end");
                    }}
                  >
                    <Quotes size="16" weight="bold" /> Reply
                  </Button>
                )}
              </Selection.Content>
            </Selection.Portal>
          </Selection.Root>
        )}
        {stop && stopReason && renderStopReason()}

        <Flex
          justify="between"
          items="center"
          className="w-full pt-1 opacity-70 hover:opacity-100 transition-opacity "
        >
          {isLoading && !isToolRunning && (
            <Flex gap="sm">
              <Spinner />
              {
                <Type size="sm" textColor="tertiary">
                  {!!rawAI?.length ? "Typing ..." : "Thinking ..."}
                </Type>
              }
            </Flex>
          )}
          {!isLoading && !isToolRunning && (
            <div className="flex flex-row gap-1">
              <Tooltip content="Copy">
                <Button
                  variant="ghost"
                  size="iconSm"
                  rounded="lg"
                  onClick={handleCopyContent}
                >
                  {showCopied ? (
                    <Check size={16} weight="bold" />
                  ) : (
                    <Copy size={16} weight="bold" />
                  )}
                </Button>
              </Tooltip>
              {chatMessage && isLast && (
                <RegenerateWithModelSelect
                  onRegenerate={(assistant: string) => {
                    const props = getAssistantByKey(assistant);
                    if (!props?.assistant) {
                      return;
                    }
                    handleRunModel({
                      input: chatMessage.rawHuman,
                      messageId: chatMessage.id,
                      assistant: props.assistant,
                      sessionId: chatMessage.sessionId,
                    });
                  }}
                />
              )}
              <Tooltip content="Delete">
                <Popover
                  open={openDeleteConfirm}
                  onOpenChange={setOpenDeleteConfirm}
                >
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="iconSm" rounded="lg">
                      <TrashSimple size={16} weight="bold" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <p className="text-sm md:text-base font-medium pb-2">
                      Are you sure you want to delete this message?
                    </p>
                    <div className="flex flex-row gap-1">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          removeMessage(id);
                        }}
                      >
                        Delete Message
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setOpenDeleteConfirm(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </Tooltip>
            </div>
          )}
          {!isLoading && !isToolRunning && (
            <div className="flex flex-row gap-2 items-center text-xs text-zinc-500">
              {modelForMessage?.name}
            </div>
          )}
        </Flex>
      </Flex>
    </div>
  );
};
