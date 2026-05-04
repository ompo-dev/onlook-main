"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info, Paperclip, Send, Smartphone, Sparkles } from "lucide-react";
import { buildClipboardPrompt } from "../utils/build-clipboard-prompt";
import { getElementInfoById } from "../InPagePanel/element-info";
import { useStore } from "../state/use-store";
import { selectActiveDraft, type ChatDraft } from "../state/slices/chat-slice";
import { setVariantSelectorMode } from "../state/variant-controls";
import { CopyIcon } from "../icons/CopyIcon";
import { DrawElementIcon } from "../icons/DrawElementIcon";
import { LoginIcon } from "../icons/LoginIcon";
import { SelectElementIcon } from "../icons/SelectElementIcon";
import { TickIcon } from "../icons/TickIcon";
import { XIcon } from "../icons/XIcon";
import { Markdown } from "./Markdown";
import { PendingEditsSection } from "./PendingEditsSection";
import { TaskRail } from "./TaskRail";
import { BrailleSpinner } from "./BrailleSpinner";
import { useTrayPosition } from "./use-tray-position";
import { InstallPopover } from "../InstallPopover";
import styles from "./ChatTray.module.css";

const COPY_RESET_MS = 1500;
const ICON_TRANSITION = { duration: 0.18, ease: "easeOut" as const };
const InfoIcon = Info as any;
const PaperclipIcon = Paperclip as any;
const SendIcon = Send as any;
const SmartphoneIcon = Smartphone as any;
const SparklesIcon = Sparkles as any;

function hasVariantsHtml(result: unknown) {
  if (!result || typeof result !== "object") return false;
  const html = (result as { html?: unknown }).html;
  return typeof html === "string" && html.length > 0;
}

export function ChatTray({
  mcp,
  undoTask,
  revertTask,
  isPicking,
  isDrawing,
  onTogglePicker,
  onToggleDraw,
  onLogin,
}: {
  mcp: {
    startTask: (input: any) => Promise<void>;
    sendTaskTurn: (input: any) => Promise<void>;
    dismissTask: (taskId: string) => void;
    acceptTask: (taskId: string) => void;
    addDraftImagesFromFiles: (files: FileList | File[]) => Promise<void>;
    reconnect: () => void;
    sendAnswer: (taskId: string, answer: string) => void;
  };
  undoTask?: (taskId: string) => void;
  revertTask?: (taskId: string) => void;
  isPicking: boolean;
  isDrawing: boolean;
  onTogglePicker: () => void;
  onToggleDraw: () => void;
  onLogin: () => void;
}) {
  const {
    startTask,
    sendTaskTurn,
    dismissTask,
    acceptTask,
    addDraftImagesFromFiles,
    reconnect: onReconnect,
    sendAnswer: onAnswer,
  } = mcp;

  const mcpStatus = useStore((s) => s.mcpStatus);
  const agentPolling = useStore((s: any) => s.agentPolling);
  const isAuthChecking = useStore((s: any) => s.isAuthChecking);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const removePendingAttachment = useStore((s) => s.removePendingAttachment);
  const selectedNodeIds = useStore((s) => s.selectedNodeIds);
  const domTree = useStore((s) => s.domTree);
  const tasks = useStore((s: any) => s.tasks);
  const taskOrder = useStore((s: any) => s.taskOrder);
  const responsiveMode = useStore((s: any) => s.responsiveMode);
  const responsiveViewport = useStore((s: any) => s.responsiveViewport);
  const breakpoints = useStore((s: any) => s.breakpoints);
  const primaryBreakpointIndex = useStore((s: any) => s.primaryBreakpointIndex);
  const chatOpen = useStore((s: any) => s.chatOpen ?? true);
  const draft = useStore((state: any) => selectActiveDraft(state) as ChatDraft);
  const setDraftText = useStore((s) => s.setDraftText);
  const removeDraftImage = useStore((s) => s.removeDraftImage);
  const clearActiveDraft = useStore((s) => s.clearActiveDraft);
  const activeTaskId = useStore((s: any) => s.activeTaskId);
  const chatFocusToken = useStore((s: any) => s.chatFocusToken);

  const sessionCount = mcpStatus === "connected" ? 1 : 0;
  const isConnected = mcpStatus === "connected" && sessionCount > 0;
  const draftText = draft.text;
  const draftImages = draft.images;
  const pendingAttachments = draft.pendingAttachments;
  const hasTasks = taskOrder.length > 0;
  const { containerRef, dragHandlers } = useTrayPosition(hasTasks);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const autoAttachments = useMemo(() => {
    if (selectedNodeIds.length === 0 || !domTree) return [];
    return selectedNodeIds
      .filter(
        (id: number) =>
          !pendingAttachments.some(
            (attachment: any) => attachment.nodeId === id,
          ),
      )
      .map((id: number) => {
        const info = getElementInfoById(id);
        return { nodeId: id, label: info.element };
      });
  }, [selectedNodeIds, pendingAttachments, domTree]);

  const activeTask = activeTaskId ? (tasks[activeTaskId] ?? null) : null;
  const hasText = draftText.trim().length > 0 || draftImages.length > 0;
  const hasPendingEdits = (activeTask?.pendingEdits.length ?? 0) > 0;
  const canSend = isAuthenticated ? hasText || hasPendingEdits : true;
  const canVariants = isAuthenticated && selectedNodeIds.length > 0;
  const desktopWidth = breakpoints[primaryBreakpointIndex]?.width ?? 1440;
  const showAdaptViewport =
    responsiveMode && responsiveViewport.width < desktopWidth;
  const hasAttachments = autoAttachments.length + pendingAttachments.length > 0;
  const canAdaptViewport =
    isAuthenticated && showAdaptViewport && hasAttachments;
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendKind = !isAuthenticated
    ? "login"
    : copied
      ? "tick"
      : isConnected
        ? "send"
        : "copy";
  const sendLabel = !isAuthenticated
    ? "Log in"
    : copied
      ? "Copied"
      : !isConnected
        ? "Copy prompt"
        : activeTask
          ? "Reply"
          : "Send";

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopyPrompt = useCallback(async () => {
    const text = draftText.trim();
    const activePendingEdits =
      activeTaskId && tasks[activeTaskId]
        ? tasks[activeTaskId].pendingEdits
        : undefined;
    if (
      text.length === 0 &&
      draftImages.length === 0 &&
      (activePendingEdits?.length ?? 0) === 0
    ) {
      return;
    }
    const nodeIds = [
      ...autoAttachments.map((attachment) => attachment.nodeId),
      ...pendingAttachments.map((attachment: any) => attachment.nodeId),
    ];
    const prompt = buildClipboardPrompt({
      text,
      nodeIds,
      pendingEdits: activePendingEdits,
      imageAttachments: draftImages,
    });
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      return;
    }
    setCopied(true);
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = setTimeout(
      () => setCopied(false),
      COPY_RESET_MS,
    );
  }, [
    activeTaskId,
    autoAttachments,
    draftImages,
    draftText,
    pendingAttachments,
    tasks,
  ]);

  const resetDraft = useCallback(() => {
    clearActiveDraft();
    const element = inputRef.current;
    if (element) {
      element.style.height = "auto";
    }
  }, [clearActiveDraft]);

  const handleSubmit = useCallback(
    async (kind: "prompt" | "variant" | "responsive") => {
      const text = draftText.trim();
      const activePendingEditCount = activeTaskId
        ? (tasks[activeTaskId]?.pendingEdits.length ?? 0)
        : 0;
      const hasContent =
        text.length > 0 || draftImages.length > 0 || activePendingEditCount > 0;
      if (kind === "prompt" && !hasContent) {
        return;
      }

      const allElementAttachments = [...autoAttachments, ...pendingAttachments];
      const draftWithMessages =
        activeTaskId && (tasks[activeTaskId]?.payload.messages.length ?? 0) > 0;

      if (draftWithMessages && kind === "prompt") {
        const activeTaskForTurn = tasks[activeTaskId];
        if (
          activeTaskForTurn?.payload.kind === "variant" &&
          activeTaskForTurn.result
        ) {
          const selector = activeTaskForTurn.payload.attachments[0]?.selector;
          if (selector) {
            setVariantSelectorMode(selector, "iterating");
          }
        }
        await sendTaskTurn({
          taskId: activeTaskId,
          text,
          images: draftImages,
          elementAttachments: allElementAttachments,
        });
        resetDraft();
        return;
      }

      const primary = selectedNodeIds[selectedNodeIds.length - 1];
      const hasElement = typeof primary === "number";
      if (kind === "variant" && !hasElement) {
        return;
      }

      const effectiveText =
        kind === "variant" && text.length === 0 ? "Generate variants" : text;
      resetDraft();
      await startTask({
        kind,
        nodeIds: hasElement ? [primary] : [],
        text: effectiveText,
        images: draftImages,
        elementAttachments: allElementAttachments,
      });
    },
    [
      activeTaskId,
      autoAttachments,
      draftImages,
      draftText,
      pendingAttachments,
      resetDraft,
      selectedNodeIds,
      sendTaskTurn,
      startTask,
      tasks,
    ],
  );

  const handleAdaptViewport = useCallback(async () => {
    if (!canAdaptViewport) return;
    const allElementAttachments = [...autoAttachments, ...pendingAttachments];
    const nodeIds = allElementAttachments.map(
      (attachment) => attachment.nodeId,
    );
    const { width, height } = responsiveViewport;
    await startTask({
      kind: "responsive",
      nodeIds,
      text: `Adapt these elements for the active responsive viewport (${width}×${height}). Prefer responsive overrides at this breakpoint over changing base styles.`,
      elementAttachments: allElementAttachments,
    });
    resetDraft();
  }, [
    autoAttachments,
    canAdaptViewport,
    pendingAttachments,
    resetDraft,
    responsiveViewport,
    startTask,
  ]);

  const submitFromShortcut = useCallback(() => {
    if (!isAuthenticated) onLogin();
    else if (isConnected) void handleSubmit("prompt");
    else void handleCopyPrompt();
  }, [handleCopyPrompt, handleSubmit, isAuthenticated, isConnected, onLogin]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitFromShortcut();
      }
    },
    [submitFromShortcut],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      let active: Element | null = document.activeElement;
      while ((active as any)?.shadowRoot?.activeElement) {
        active = (active as any).shadowRoot.activeElement;
      }
      if (active === inputRef.current) return;
      event.preventDefault();
      submitFromShortcut();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submitFromShortcut]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      dragCounterRef.current += 1;
      setIsDragActive(true);
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
    },
    [],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDragActive(false);
    },
    [],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragActive(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        await addDraftImagesFromFiles(files);
      }
    },
    [addDraftImagesFromFiles],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        event.preventDefault();
        await addDraftImagesFromFiles(files);
      }
    },
    [addDraftImagesFromFiles],
  );

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        await addDraftImagesFromFiles(files);
      }
      event.target.value = "";
    },
    [addDraftImagesFromFiles],
  );

  useEffect(() => {
    if (chatFocusToken > 0) {
      inputRef.current?.focus();
    }
  }, [chatFocusToken]);

  const prevActiveTaskIdRef = useRef<string | null>(activeTaskId);
  useEffect(() => {
    const prev = prevActiveTaskIdRef.current;
    prevActiveTaskIdRef.current = activeTaskId;
    if (prev === activeTaskId) return;
    if (prev === null || activeTaskId === null) return;
    inputRef.current?.focus();
  }, [activeTaskId]);

  return (
    <div
      ref={containerRef}
      className={styles.wrap}
      data-cs-has-rail={hasTasks || undefined}
      style={chatOpen ? undefined : { display: "none" }}
    >
      <AnimatePresence initial={false}>
        {hasTasks && (
          <TaskRail
            key="task-rail"
            dismissTask={dismissTask}
            undoTask={undoTask}
            acceptTask={acceptTask}
            revertTask={revertTask}
          />
        )}
      </AnimatePresence>

      <div
        className={styles.tray}
        data-cs-drag-active={isDragActive || undefined}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={styles.dragHandle}
          {...dragHandlers}
          aria-label="Drag tray"
        />
        <ConnectionStatusBar
          onReconnect={onReconnect}
          isAuthenticated={isAuthenticated}
          isAuthChecking={isAuthChecking}
          mcpStatus={mcpStatus}
          agentPolling={agentPolling}
          sessionCount={sessionCount}
        />

        <MessagePane task={activeTask} onAnswer={onAnswer} />

        {(autoAttachments.length > 0 ||
          pendingAttachments.length > 0 ||
          draftImages.length > 0) && (
          <div className={styles.attachments}>
            {autoAttachments.map((attachment) => (
              <span
                key={`auto-${attachment.nodeId}`}
                className={`${styles.chip} ${styles.chipAuto}`}
              >
                {attachment.label}
              </span>
            ))}
            {pendingAttachments.map((attachment: any) => (
              <span key={`pin-${attachment.nodeId}`} className={styles.chip}>
                {attachment.label}
                <button
                  className={styles.chipRemove}
                  onClick={() => removePendingAttachment(attachment.nodeId)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            {draftImages.map((image: any) => (
              <span
                key={`img-${image.id}`}
                className={`${styles.chip} ${styles.chipImage}`}
                title={image.filename}
              >
                <img src={image.dataUrl} alt="" className={styles.chipThumb} />
                {image.filename}
                <button
                  className={styles.chipRemove}
                  onClick={() => removeDraftImage(image.id)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={draftText}
            onChange={(event) => {
              setDraftText(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              activeTask ? "Reply in this task…" : "Describe a change 2"
            }
            rows={1}
          />
        </div>

        <div className={styles.actionRow}>
          <div className={styles.actionLeft}>
            <button
              type="button"
              className={`${styles.iconButton}${isPicking ? ` ${styles.iconButtonActive}` : ""}`}
              onClick={onTogglePicker}
              title="Select element (⌥C)"
              aria-label="Select element"
              aria-pressed={isPicking}
            >
              <SelectElementIcon />
            </button>
            <button
              type="button"
              className={`${styles.iconButton}${isDrawing ? ` ${styles.iconButtonActive}` : ""}`}
              onClick={onToggleDraw}
              title="Draw element (⌥F)"
              aria-label="Draw element"
              aria-pressed={isDrawing}
            >
              <DrawElementIcon />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
              aria-label="Attach image"
            >
              <PaperclipIcon size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.hiddenFileInput}
              onChange={handleFileInputChange}
            />
          </div>

          <div className={styles.spacer} />

          <div className={styles.actionRight}>
            {showAdaptViewport && (
              <button
                type="button"
                className={`${styles.iconButton} ${styles.iconButtonAction}`}
                onClick={() => void handleAdaptViewport()}
                disabled={!canAdaptViewport}
                title={
                  !isAuthenticated
                    ? "Sign in to adapt for viewport"
                    : !hasAttachments
                      ? "Attach an element to adapt for the active viewport"
                      : `Adapt attached elements for ${responsiveViewport.width}×${responsiveViewport.height}`
                }
                aria-label="Adapt for viewport"
              >
                <SmartphoneIcon size={16} />
              </button>
            )}

            <button
              type="button"
              className={`${styles.iconButton} ${styles.iconButtonAction}`}
              onClick={() => void handleSubmit("variant")}
              disabled={!canVariants}
              title={
                !isAuthenticated
                  ? "Sign in to generate variants"
                  : selectedNodeIds.length === 0
                    ? "Select an element to generate variants"
                    : "Generate variants of the selected element"
              }
              aria-label="Generate variants"
            >
              <SparklesIcon size={16} />
            </button>

            <button
              type="button"
              className={styles.sendButton}
              onClick={() => {
                if (!isAuthenticated) onLogin();
                else if (isConnected) void handleSubmit("prompt");
                else void handleCopyPrompt();
              }}
              disabled={!canSend}
              title={sendLabel}
              aria-label={sendLabel}
            >
              <AnimatePresence mode="sync" initial={false}>
                <motion.span
                  key={sendKind}
                  className={styles.sendButtonIcon}
                  initial={{ opacity: 0, filter: "blur(2px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(2px)" }}
                  transition={ICON_TRANSITION}
                >
                  {sendKind === "login" ? (
                    <LoginIcon />
                  ) : sendKind === "tick" ? (
                    <TickIcon color="currentColor" />
                  ) : sendKind === "send" ? (
                    <SendIcon size={18} />
                  ) : copied ? (
                    <TickIcon color="currentColor" />
                  ) : isConnected ? (
                    <SendIcon size={18} />
                  ) : (
                    <CopyIcon />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectionStatusBar({
  onReconnect,
  isAuthenticated,
  isAuthChecking,
  mcpStatus,
  agentPolling,
  sessionCount,
}: {
  onReconnect: () => void;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  mcpStatus: string;
  agentPolling: boolean;
  sessionCount: number;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const mcpConnected = mcpStatus === "connected";
  const mcpConnecting = mcpStatus === "connecting";
  const agentConnected = mcpConnected && sessionCount > 0;
  const hasProblem =
    isAuthenticated &&
    !isAuthChecking &&
    !mcpConnecting &&
    (!mcpConnected || !agentConnected);
  const mcpPillState = mcpConnecting
    ? "pending"
    : mcpConnected
      ? "true"
      : "false";
  const agentPillState = agentConnected ? "true" : "false";
  const agentLabel = sessionCount > 1 ? `Agent (${sessionCount})` : "Agent";

  return (
    <div className={styles.connectionRegion}>
      <div
        className={styles.connectionBar}
        data-cs-status={mcpStatus}
        data-cs-open={hasProblem || undefined}
      >
        <div className={styles.statusPills}>
          <span className={styles.statusPill} data-cs-ok={mcpPillState}>
            <span className={styles.statusPillIcon}>
              {mcpConnecting ? (
                <BrailleSpinner size={10} />
              ) : mcpConnected ? (
                <TickIcon />
              ) : (
                <XIcon size={12} />
              )}
            </span>
            MCP
          </span>
          <span className={styles.statusPill} data-cs-ok={agentPillState}>
            <span className={styles.statusPillIcon}>
              {agentConnected ? <TickIcon /> : <XIcon size={12} />}
            </span>
            {agentLabel}
          </span>
          {agentPolling && (
            <span className={styles.statusPill} data-cs-ok="true">
              <BrailleSpinner size={10} />
              polling
            </span>
          )}
        </div>

        <button
          ref={anchorRef}
          type="button"
          className={styles.connectionInfo}
          onClick={() => setPopoverOpen((value) => !value)}
          title="Details"
          aria-label="Connection details"
        >
          <InfoIcon size={14} />
        </button>
      </div>

      {popoverOpen && (
        <InstallPopover
          anchorRef={anchorRef}
          onClose={() => setPopoverOpen(false)}
          onReconnect={onReconnect}
        />
      )}
    </div>
  );
}

function MessagePane({
  task,
  onAnswer,
}: {
  task: any;
  onAnswer: (taskId: string, answer: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [
    task?.payload.messages.length,
    task?.pendingEdits.length,
    task?.responding,
    task?.verb,
    task?.question?.askId,
    task?.panic?.reason,
    task?.id,
  ]);

  if (!task) return null;

  const messages = task.payload.messages;
  if (
    messages.length === 0 &&
    task.pendingEdits.length === 0 &&
    !task.question &&
    !task.panic &&
    !task.responding
  ) {
    return null;
  }

  const attachments = task.payload.attachments;

  return (
    <div ref={scrollRef} className={styles.messages}>
      {messages.map((message: any) => {
        if (message.role === "status") {
          return (
            <div
              key={message.id}
              className={styles.statusMsg}
              data-error={message.isError || undefined}
            >
              {message.text}
            </div>
          );
        }

        if (message.role === "user") {
          const flags = task.localFlags?.[message.id];
          const pending = flags?.pending;
          const queued = flags?.queued;
          const msgElements = (message.attachments ?? [])
            .map((index: number) => attachments[index] ?? index)
            .filter(Boolean);
          const msgImages = task.localMessageImages?.[message.id] ?? [];
          const msgEdits = task.localMessageEdits?.[message.id] ?? [];
          const hasBubbleContent =
            message.text.length > 0 ||
            msgElements.length > 0 ||
            msgImages.length > 0;

          const bubbleClasses = [
            styles.userMsg,
            pending ? styles.userMsgPending : "",
            queued ? styles.userMsgQueued : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={message.id}>
              {msgEdits.length > 0 && (
                <PendingEditsSection edits={msgEdits} title="Edits" />
              )}
              {hasBubbleContent && (
                <div
                  className={bubbleClasses}
                  title={
                    queued
                      ? "Queued — will send when current turn completes"
                      : undefined
                  }
                >
                  {(msgElements.length > 0 || msgImages.length > 0) && (
                    <div className={styles.msgAttachments}>
                      {msgElements.map((attachment: any, index: number) => (
                        <span
                          key={`el-${attachment.nodeId ?? index}-${attachment.label ?? attachment.selector}`}
                          className={styles.msgChip}
                        >
                          {attachment.label ?? attachment.selector}
                        </span>
                      ))}
                      {msgImages.map((image: any) => (
                        <span
                          key={`img-${image.id}`}
                          className={`${styles.msgChip} ${styles.msgChipImage}`}
                          title={image.filename}
                        >
                          <img
                            src={image.dataUrl}
                            alt=""
                            className={styles.msgChipThumb}
                          />
                          {image.filename}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.text}
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={styles.agentMsg}
            data-error={message.isError || undefined}
          >
            <Markdown text={message.text} />
          </div>
        );
      })}

      {(() => {
        const lastMsg = messages[messages.length - 1];
        const awaitingAgent =
          lastMsg?.role === "user" &&
          (task.status === "queued" || task.status === "in-progress");
        if (!task.responding && !awaitingAgent) return null;
        return (
          <div className={styles.respondingLine}>
            <BrailleSpinner size={12} />
            <span>{task.verb ? `${task.verb}…` : "Working…"}</span>
          </div>
        );
      })()}

      {task.question && !task.question.answered && (
        <TaskAskInline task={task} onAnswer={onAnswer} />
      )}

      {task.question?.answered && task.question.answer && (
        <div className={styles.userMsg}>
          You answered: {task.question.answer}
        </div>
      )}

      {task.pendingEdits.length > 0 && (
        <PendingEditsSection edits={task.pendingEdits} />
      )}
    </div>
  );
}

function TaskAskInline({
  task,
  onAnswer,
}: {
  task: any;
  onAnswer: (taskId: string, answer: string) => void;
}) {
  const leaseState = task.leaseState ?? "none";
  const locked = leaseState === "theirs";
  const question = task.question;
  if (!question) return null;

  return (
    <div className={styles.agentMsg}>
      <div>
        <Markdown text={question.text} />
      </div>
      {question.options && question.options.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}
        >
          {question.options.map((option: string) => (
            <button
              key={option}
              type="button"
              className={styles.secondaryButton}
              style={{
                width: "auto",
                height: 24,
                padding: "4px 10px",
                fontSize: 11,
              }}
              disabled={locked}
              onClick={() => onAnswer(task.id, option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {locked && (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }}>
          Answering in another window…
        </div>
      )}
    </div>
  );
}
