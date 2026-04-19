import { useEffect, useRef } from 'react';
import { useStore } from './use-store';
import { showPromptIcon, hidePromptIcon } from './dom-bridge';

export function usePromptInput(
    onPromptIconClick: (nodeId: number) => void,
    options: {
        isAuthenticated: boolean;
        onLogin: () => void;
    },
) {
    const selectedNodeId = useStore((s) => s.selectedNodeId);
    const isPickingElement = useStore((s) => s.isPickingElement);
    const callbackRef = useRef(onPromptIconClick);
    callbackRef.current = onPromptIconClick;
    const authRef = useRef(options.isAuthenticated);
    authRef.current = options.isAuthenticated;
    const loginRef = useRef(options.onLogin);
    loginRef.current = options.onLogin;

    useEffect(() => {
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
