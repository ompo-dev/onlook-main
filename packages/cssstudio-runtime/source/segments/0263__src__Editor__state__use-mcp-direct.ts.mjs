// src/Editor/state/use-mcp-direct.ts
import { useCallback as useCallback4, useEffect as useEffect6, useRef as useRef4 } from "react";
var AUTO_SEND_DEBOUNCE = 1e3;
var WARM_RECONNECT_INITIAL = 2e3;
var WARM_RECONNECT_MAX = 15e3;
var VISIBILITY_PROBE_COOLDOWN = 5e3;
var DEFAULT_PORT = 9877;
function useMcpDirect(mcpPort, mode) {
  const socketRef = useRef4(null);
  const reconnectRef = useRef4(null);
  const connectRef = useRef4(() => {
  });
  const activeRef = useRef4(true);
  const hasEverConnectedRef = useRef4(false);
  const lastProbeRef = useRef4(0);
  const offlineQueueRef = useRef4([]);
  const disconnectTimerRef = useRef4(null);
  function flushOfflineQueue(ws) {
    for (const item of offlineQueueRef.current.splice(0)) {
      ws.send(JSON.stringify({
        type: "user-message",
        text: item.text,
        attachments: item.attachments,
        clientMsgId: item.id
      }));
    }
  }
  const autoApply = useStore2((s) => s.autoApply);
  const editVersion = useStore2((s) => s.editVersion);
  const isAuthenticated = useStore2((s) => s.isAuthenticated);
  const port = mcpPort ?? DEFAULT_PORT;
  const isDemo = mode === "demo";
  useEffect6(() => {
    if (isDemo) {
      return;
    }
    activeRef.current = true;
    let reconnectDelay = WARM_RECONNECT_INITIAL;
    function connect() {
      if (!activeRef.current || socketRef.current) return;
      lastProbeRef.current = Date.now();
      const { setMcpStatus } = useStore2.getState();
      if (!hasEverConnectedRef.current) setMcpStatus("connecting");
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.onopen = () => {
        socketRef.current = ws;
        hasEverConnectedRef.current = true;
        reconnectDelay = WARM_RECONNECT_INITIAL;
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        setMcpStatus("connected");
        useStore2.getState().setAgentResponding(false);
        sendPageInfo(ws);
        const { stagedChanges, clearStagedChanges, setApplying } = useStore2.getState();
        if (stagedChanges.length > 0) {
          ws.send(JSON.stringify({
            type: "style-update",
            changes: stagedChanges,
            timestamp: Date.now()
          }));
          setApplying(true);
          clearStagedChanges();
        }
        flushOfflineQueue(ws);
      };
      ws.onclose = () => {
        socketRef.current = null;
        if (!activeRef.current) {
          setMcpStatus("disconnected");
          return;
        }
        if (hasEverConnectedRef.current) {
          if (!disconnectTimerRef.current) {
            disconnectTimerRef.current = setTimeout(() => {
              disconnectTimerRef.current = null;
              if (!socketRef.current) {
                setMcpStatus("disconnected");
              }
            }, WARM_RECONNECT_MAX);
          }
          scheduleReconnect();
        } else {
          setMcpStatus("disconnected");
        }
      };
      ws.onerror = () => {
        ws.close();
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const store = useStore2.getState();
          if (msg.type === "panic") {
            store.setPanic({ reason: msg.reason, element: msg.element });
            const reason = msg.reason === "element_not_found" ? "I couldn't find this element in the source code." : `Error: ${msg.reason}`;
            const text = msg.element ? `${reason}

\`${msg.element}\`` : reason;
            store.addChatMessage({ role: "agent", text, isError: true });
            store.openChat();
          } else if (msg.type === "calm") {
            store.setPanic(null);
          } else if (msg.type === "ask") {
            store.setQuestion({ question: msg.question, options: msg.options });
          } else if (msg.type === "ready") {
            store.setApplying(false);
          } else if (msg.type === "drained") {
            store.clearStagedChanges();
            if (msg.implementing) {
              store.setAgentStatus("implementing");
            } else {
              store.setApplying(false);
            }
          } else if (msg.type === "polling") {
            if (msg.active) {
              if (store.agentStatus === "implementing") store.setApplying(false);
              store.setAgentStatus("polling");
              flushOfflineQueue(ws);
            } else if (store.agentStatus !== "implementing") {
              store.setAgentStatus("idle");
            }
          } else if (msg.type === "user-message-ack") {
            store.acknowledgeMessages(msg.ids);
          } else if (msg.type === "agent-message") {
            store.addChatMessage({ role: "agent", text: msg.text });
            store.setAgentResponding(false);
          } else if (msg.type === "agent-responding") {
            store.setAgentResponding(msg.active);
          }
        } catch {
        }
      };
    }
    connectRef.current = connect;
    function scheduleReconnect() {
      if (reconnectRef.current || !activeRef.current) return;
      reconnectRef.current = setTimeout(() => {
        reconnectRef.current = null;
        if (activeRef.current) connect();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, WARM_RECONNECT_MAX);
    }
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (socketRef.current) return;
      if (!activeRef.current) return;
      if (Date.now() - lastProbeRef.current < VISIBILITY_PROBE_COOLDOWN) return;
      connect();
    }
    if (isAuthenticated) {
      connect();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    function onResize() {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        sendPageInfo(socketRef.current);
      }
    }
    window.addEventListener("resize", onResize);
    return () => {
      activeRef.current = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [port, isAuthenticated]);
  function sendPageInfo(ws) {
    ws.send(JSON.stringify({
      type: "page-info",
      url: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    }));
  }
  const sendAnswer = useCallback4((answer) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "answer", answer }));
    }
    useStore2.getState().setQuestion(null);
  }, []);
  const sendEdit = useCallback4(() => {
    const { stagedChanges, clearStagedChanges, setApplying, addChatMessage, mcpStatus } = useStore2.getState();
    if (stagedChanges.length === 0) return;
    if (isDemo) {
      const count2 = stagedChanges.length;
      setApplying(false);
      clearStagedChanges();
      addChatMessage({ role: "status", text: `Applied ${count2} change${count2 === 1 ? "" : "s"} (demo mode)` });
      return;
    }
    if (!socketRef.current || mcpStatus !== "connected") {
      if (!socketRef.current && Date.now() - lastProbeRef.current > VISIBILITY_PROBE_COOLDOWN) {
        connectRef.current();
      }
      return;
    }
    const count = stagedChanges.length;
    const ws = socketRef.current;
    ws.send(JSON.stringify({
      type: "style-update",
      changes: stagedChanges,
      timestamp: Date.now()
    }));
    setApplying(true);
    clearStagedChanges();
    addChatMessage({ role: "status", text: `Sent ${count} change${count === 1 ? "" : "s"}` });
  }, []);
  const sendUserMessage = useCallback4((text, attachments) => {
    const store = useStore2.getState();
    const msgAttachments = attachments.length > 0 ? attachments : void 0;
    if (isDemo) {
      store.addChatMessage({ role: "user", text, attachments: msgAttachments });
      store.addChatMessage({
        role: "agent",
        text: "This chat is for demo purposes only! No agent is listening. But, you can use the edit panel to make real changes to this website!",
        isError: false
      });
      return;
    }
    const id3 = crypto.randomUUID();
    const ws = socketRef.current;
    const canSendNow = ws && ws.readyState === WebSocket.OPEN;
    store.addChatMessage({ id: id3, role: "user", text, attachments: msgAttachments, pending: true });
    if (canSendNow) {
      flushOfflineQueue(ws);
      ws.send(JSON.stringify({
        type: "user-message",
        text,
        attachments: msgAttachments,
        clientMsgId: id3
      }));
    } else {
      if (offlineQueueRef.current.length < 50) {
        offlineQueueRef.current.push({ id: id3, text, attachments: msgAttachments });
      }
      if (!ws && Date.now() - lastProbeRef.current > VISIBILITY_PROBE_COOLDOWN) {
        connectRef.current();
      }
    }
  }, []);
  useEffect6(() => {
    if (!autoApply || editVersion === 0) return;
    const timer = setTimeout(sendEdit, AUTO_SEND_DEBOUNCE);
    return () => clearTimeout(timer);
  }, [autoApply, editVersion, sendEdit]);
  useEffect6(() => {
    if (editVersion === 0) return;
    if (socketRef.current) return;
    if (Date.now() - lastProbeRef.current < VISIBILITY_PROBE_COOLDOWN) return;
    connectRef.current();
  }, [editVersion]);
  const reconnect = useCallback4(() => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    useStore2.getState().setMcpStatus("connecting");
    connectRef.current();
  }, []);
  return { sendEdit, sendAnswer, sendUserMessage, reconnect };
}

