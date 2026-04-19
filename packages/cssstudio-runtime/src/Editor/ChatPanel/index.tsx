import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/use-store';
import { getElementInfoById } from '../InPagePanel/element-info';
import styles from './ChatPanel.module.css';

interface Attachment {
    nodeId: number;
    label: string;
}

interface ChatPanelProps {
    onSend: (text: string, attachments: Attachment[]) => void;
    mode?: string;
}

export function ChatPanel({ onSend, mode }: ChatPanelProps) {
    const chatMessages = useStore((s) => s.chatMessages);
    const agentResponding = useStore((s) => s.agentResponding);
    const mcpStatus = useStore((s) => s.mcpStatus);
    const isConnected = mcpStatus === 'connected' || mode === 'demo';
    const pendingAttachments = useStore((s) => s.pendingAttachments);
    const removePendingAttachment = useStore((s) => s.removePendingAttachment);
    const clearPendingAttachments = useStore((s) => s.clearPendingAttachments);
    const selectedNodeIds = useStore((s) => s.selectedNodeIds);
    const domTree = useStore((s) => s.domTree);

    const autoAttachments = useMemo(() => {
        if (selectedNodeIds.length === 0 || !domTree) return [];
        return selectedNodeIds
            .filter((id) => !pendingAttachments.some((a) => a.nodeId === id))
            .map((id) => {
                const info = getElementInfoById(id);
                return { nodeId: id, label: info.element };
            });
    }, [selectedNodeIds, pendingAttachments, domTree]);

    const [inputValue, setInputValue] = useState('');
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = messagesRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [chatMessages.length, agentResponding]);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSend = useCallback(() => {
        const text = inputValue.trim();
        if (!text) return;
        onSend(text, [...autoAttachments, ...pendingAttachments]);
        setInputValue('');
        clearPendingAttachments();
    }, [inputValue, autoAttachments, pendingAttachments, onSend, clearPendingAttachments]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }, [handleSend]);

    return (
        <div className={styles.chatContent}>
            <div className={styles.messages} ref={messagesRef}>
                {chatMessages.map((msg: { id: string; role: string; text: string; isError?: boolean; pending?: boolean; attachments?: Attachment[] }) => {
                    if (msg.role === 'status') {
                        return <div key={msg.id} className={styles.statusMsg} data-error={msg.isError || undefined}>{msg.text}</div>;
                    }
                    if (msg.role === 'user') {
                        return (
                            <div key={msg.id} className={`${styles.userMsg}${msg.pending ? ` ${styles.userMsgPending}` : ''}`}>
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className={styles.msgAttachments}>
                                        {msg.attachments.map((a) => <span key={a.nodeId} className={styles.msgChip}>{a.label}</span>)}
                                    </div>
                                )}
                                {msg.text}
                            </div>
                        );
                    }
                    return <div key={msg.id} className={styles.agentMsg} data-error={msg.isError || undefined}>{msg.text}</div>;
                })}
                {agentResponding && (
                    <div className={styles.agentMsg}>
                        <span className={styles.typingDots}><span /><span /><span /></span>
                    </div>
                )}
            </div>
            {(autoAttachments.length > 0 || pendingAttachments.length > 0) && (
                <div className={styles.attachments}>
                    {autoAttachments.map((a) => <span key={a.nodeId} className={`${styles.chip} ${styles.chipAuto}`}>{a.label}</span>)}
                    {pendingAttachments.map((a) => (
                        <span key={a.nodeId} className={styles.chip}>
                            {a.label}
                            <button className={styles.chipRemove} onClick={() => removePendingAttachment(a.nodeId)} title="Remove">×</button>
                        </span>
                    ))}
                </div>
            )}
            <div className={styles.inputRow}>
                <textarea
                    ref={inputRef}
                    className={styles.input}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={!isConnected ? 'Agent not connected' : mode === 'demo' ? 'Try sending a message…' : 'Message agent…'}
                    disabled={!isConnected}
                    rows={1}
                />
                <button className={styles.sendButton} onClick={handleSend} disabled={!isConnected || !inputValue.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
}
