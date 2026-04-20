import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../state/use-store';
import { IconButton } from './IconButton';
import { Bot, Cable, Copy, Square } from 'lucide-react';
import { Settings } from '../Settings';
import { Dropdown } from '../Dropdown';
import { InstallPopover } from '../InstallPopover';
import { QuestionPopover } from '../QuestionPopover';
import { buildCopyPrompt } from '../utils/studio-prompt';
import styles from './Toolbar.module.css';
import type { QuestionInfo } from '../state/slices/error-slice';

const blurFade = {
    initial: { opacity: 0, filter: 'blur(2px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(2px)' },
    transition: { duration: 0.15 },
    style: { display: 'flex', alignItems: 'center' },
};

const blurScale = {
    ...blurFade,
    initial: { ...blurFade.initial, scale: 0.9 },
    animate: { ...blurFade.animate, scale: 1 },
    exit: { ...blurFade.exit, scale: 0.9 },
};

const COLLAPSED_KEY = 'cssstudio-toolbar-collapsed';

function useToolbarCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
    });
    const toggle = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    }, []);
    return [collapsed, toggle];
}

interface ToolbarProps {
    isPicking: boolean;
    isDrawing: boolean;
    onTogglePicker: () => void;
    onToggleDraw: () => void;
    onLogin: () => void;
    onSendEdit: () => void;
    onAnswer: (answer: string) => void;
    onReconnect: () => void;
    mode?: string;
}

export function Toolbar({ isPicking, isDrawing, onTogglePicker, onToggleDraw, onLogin, onSendEdit, onAnswer, onReconnect, mode }: ToolbarProps) {
    const { isAuthenticated, isAuthChecking, mcpStatus, agentPolling, autoApply, pendingChanges, stagedChanges, applying, panic, question, clearPendingChanges } = useStore();
    const navigatorOpen = useStore((s) => s.panels.navigator.open);
    const chatOpen = useStore((s) => s.panels.navigator.open && s.panels.navigator.activeTab === 'chat');
    const togglePanel = useStore((s) => s.togglePanel);
    const togglePanelTab = useStore((s) => s.togglePanelTab);
    const [collapsed, toggleCollapsed] = useToolbarCollapsed();
    const [showInstallPopover, setShowInstallPopover] = useState(false);
    const [showDemoPopover, setShowDemoPopover] = useState(false);
    const [applied, setApplied] = useState(false);
    const wasApplyingRef = useRef(false);
    const cableRef = useRef<HTMLSpanElement>(null);
    const applyRef = useRef<HTMLSpanElement>(null);
    const isConnected = mcpStatus === 'connected';
    const isAgentActive = (isConnected && agentPolling) || mode === 'demo';
    const showCopy = !isAuthChecking && (isAuthenticated || mode === 'demo');
    const showApply = isAgentActive;
    const copyIsPrimary = showCopy && !showApply;
    const hasChanges = stagedChanges.length > 0;
    const applyDisabled = autoApply || applying || applied || !hasChanges;
    const activeQuestion: QuestionInfo | undefined =
        showInstallPopover && question ? question : undefined;

    useEffect(() => {
        if (applying) {
            wasApplyingRef.current = true;
            setApplied(false);
        } else if (wasApplyingRef.current) {
            wasApplyingRef.current = false;
            setApplied(true);
        }
    }, [applying]);

    useEffect(() => { if (hasChanges) setApplied(false); }, [hasChanges]);
    useEffect(() => { if (question) setShowInstallPopover(true); }, [question]);

    const demoRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!e.altKey || e.metaKey || e.ctrlKey) return;
            if (e.code === 'Period') { e.preventDefault(); toggleCollapsed(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toggleCollapsed]);

    return (
        <div data-cs-toolbar className={`${styles.toolbar} ${collapsed ? styles.toolbarCollapsed : ''}`} style={mode === 'demo' && !collapsed ? { paddingTop: 22 } : undefined}>
            {!collapsed && (
                <>
                    {mode === 'demo' && (
                        <>
                            <button ref={demoRef} className={styles.demoStrip} onClick={() => setShowDemoPopover((v) => !v)}>Demo</button>
                            {showDemoPopover && <DemoPopover anchorRef={demoRef} onClose={() => setShowDemoPopover(false)} />}
                        </>
                    )}
                    <Settings />
                    <IconButton active={navigatorOpen} onClick={() => togglePanel('navigator')} title="Toggle Elements panel (⌥E)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 6h16M4 12h10M4 18h6" />
                        </svg>
                    </IconButton>
                    <div className={styles.separator} />
                    <IconButton active={isPicking} onClick={onTogglePicker} title="Select element (⌥C)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
                        </svg>
                    </IconButton>
                    <IconButton active={isDrawing} onClick={onToggleDraw} title="Draw element (⌥F)">
                        <Square size={16} />
                    </IconButton>
                    <div className={styles.separator} />
                    {false && (
                        <span ref={cableRef} className={styles.agentStatus}>
                            <IconButton
                                active={chatOpen}
                                title={
                                    !isAuthenticated ? 'Sign in to connect agent' :
                                    question ? 'Agent has a question — click to answer' :
                                    panic ? 'Agent error — click to view' :
                                    isConnected ? 'Chat with agent (⌥T)' :
                                    'Agent not connected — click to install'
                                }
                                onClick={() => {
                                    if (!isAuthenticated) { onLogin(); return; }
                                    if (question) { setShowInstallPopover((v) => !v); }
                                    else if (!isAgentActive && !panic) { setShowInstallPopover((v) => !v); }
                                    else { togglePanelTab('navigator', 'chat'); }
                                }}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {panic ? (
                                        <motion.span key="panic" {...blurScale}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg></motion.span>
                                    ) : question ? (
                                        <motion.span key="question" {...blurScale}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cs-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg></motion.span>
                                    ) : (
                                        <motion.span key="default" {...blurScale} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: !isAgentActive ? '#f59e0b' : undefined }}>
                                            {isAgentActive || mode === 'demo' ? <Bot size={16} /> : <Cable size={16} />}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </IconButton>
                            {activeQuestion ? (
                                <QuestionPopover question={activeQuestion as QuestionInfo} anchorRef={cableRef} onAnswer={(answer) => { onAnswer(answer); setShowInstallPopover(false); }} onClose={() => setShowInstallPopover(false)} />
                            ) : null}
                            {showInstallPopover && !isAgentActive && !panic && !question && (
                                <InstallPopover anchorRef={cableRef} onClose={() => setShowInstallPopover(false)} onReconnect={onReconnect} />
                            )}
                        </span>
                    )}
                    {showCopy && (
                        <CopyPromptButton
                            stagedChanges={stagedChanges}
                            onCopied={clearPendingChanges}
                            mode={copyIsPrimary ? 'primary' : undefined}
                            muted={!hasChanges || (autoApply && isAgentActive)}
                            isAuthenticated={isAuthenticated}
                            onLogin={onLogin}
                            isDemo={mode === 'demo'}
                        />
                    )}
                    {showApply && (
                        <span ref={applyRef} style={{ display: 'flex', position: 'relative' }}>
                            <IconButton
                                mode="primary"
                                disabled={mode === 'demo' ? !hasChanges : applyDisabled}
                                onClick={() => { if (mode === 'demo') { setShowDemoPopover((v) => !v); } else { onSendEdit(); } }}
                                title={applying ? 'Applying…' : applied ? 'Applied' : 'Apply changes (⌘↵)'}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {applying ? (
                                        <motion.span key="spinner" {...blurFade}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <motion.g style={{ transformOrigin: '12px 12px' }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                                    <path d="M12 2a10 10 0 0 1 7.38 16.75" />
                                                    <path d="M2.5 8.875a10 10 0 0 0-.5 3" />
                                                    <path d="M2.83 16a10 10 0 0 0 2.43 3.4" />
                                                    <path d="M4.636 5.235a10 10 0 0 1 .891-.857" />
                                                    <path d="M8.644 21.42a10 10 0 0 0 7.631-.38" />
                                                </motion.g>
                                                <path d="m16 12-4-4-4 4" />
                                                <path d="M12 16V8" />
                                            </svg>
                                        </motion.span>
                                    ) : applied ? (
                                        <motion.span key="tick" {...blurFade}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <motion.path d="M4 12l5 5L20 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0 }} />
                                            </svg>
                                        </motion.span>
                                    ) : (
                                        <motion.span key="idle" {...blurFade}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="m16 12-4-4-4 4" />
                                                <path d="M12 16V8" />
                                            </svg>
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </IconButton>
                        </span>
                    )}
                    <div className={styles.separator} />
                </>
            )}
            <button className={styles.collapseToggle} onClick={toggleCollapsed} title={collapsed ? 'Expand toolbar (⌥.)' : 'Collapse toolbar (⌥.)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {collapsed ? (
                        <>
                            <path d="m11 17-5-5 5-5" />
                            <path d="m18 17-5-5 5-5" />
                        </>
                    ) : (
                        <>
                            <path d="m6 17 5-5-5-5" />
                            <path d="m13 17 5-5-5-5" />
                        </>
                    )}
                </svg>
            </button>
        </div>
    );
}

interface CopyPromptButtonProps {
    muted?: boolean;
    stagedChanges: unknown[];
    onCopied: () => void;
    mode?: 'primary';
    isAuthenticated: boolean;
    onLogin: () => void;
    isDemo?: boolean;
}

function CopyPromptButton({ muted, stagedChanges, onCopied, mode, isAuthenticated, onLogin, isDemo }: CopyPromptButtonProps) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        if (!isAuthenticated) { onLogin(); return; }
        const prompt = buildCopyPrompt(stagedChanges, { demo: isDemo });
        navigator.clipboard.writeText(prompt).then(() => {
            onCopied();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <IconButton mode={mode} muted={muted} onClick={handleCopy} title={!isAuthenticated ? 'Sign in to copy prompt' : copied ? 'Copied' : 'Copy prompt (⌘⇧C)'}>
            <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                    <motion.span key="tick" {...blurFade}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <motion.path d="M4 12l5 5L20 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0 }} />
                        </svg>
                    </motion.span>
                ) : (
                    <motion.span key="copy" {...blurFade}><Copy size={16} /></motion.span>
                )}
            </AnimatePresence>
        </IconButton>
    );
}

interface DemoPopoverProps {
    anchorRef: React.RefObject<HTMLElement | null>;
    onClose: () => void;
}

function DemoPopover({ anchorRef, onClose }: DemoPopoverProps) {
    return (
        <Dropdown open={true} onClose={onClose} anchorRef={anchorRef} width={320}>
            <p className={styles.demoTitle}>Demo mode</p>
            <p className={styles.demoDescription}>In the real product you can use the apply button to send changes to your local AI agent. Or, with auto-apply enabled, changes are sent as you edit.</p>
            <a href="https://cssstudio.ai/learn" target="_blank" rel="noopener noreferrer" className={styles.demoLink}>Get started</a>
        </Dropdown>
    );
}
