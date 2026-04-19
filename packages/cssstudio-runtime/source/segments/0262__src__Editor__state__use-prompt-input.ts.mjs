// src/Editor/state/use-prompt-input.ts
import { useEffect as useEffect5, useRef as useRef3 } from "react";
function usePromptInput(onPromptIconClick, options) {
  const selectedNodeId = useStore2((s) => s.selectedNodeId);
  const isPickingElement = useStore2((s) => s.isPickingElement);
  const callbackRef = useRef3(onPromptIconClick);
  callbackRef.current = onPromptIconClick;
  const authRef = useRef3(options.isAuthenticated);
  authRef.current = options.isAuthenticated;
  const loginRef = useRef3(options.onLogin);
  loginRef.current = options.onLogin;
  useEffect5(() => {
    if (isPickingElement || selectedNodeId === null) {
      hidePromptIcon();
      return;
    }
    showPromptIcon((nodeId) => {
      if (!authRef.current) {
        loginRef.current();
        return;
      }
      callbackRef.current(nodeId);
    });
    return () => {
      hidePromptIcon();
    };
  }, [selectedNodeId, isPickingElement]);
}

