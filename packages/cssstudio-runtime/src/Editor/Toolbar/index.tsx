import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../state/use-store';
import { IconButton } from './IconButton';
import { SelectElementIcon } from '../icons/SelectElementIcon';
import { DrawElementIcon } from '../icons/DrawElementIcon';
import { BotIcon } from '../icons/BotIcon';
import { CableIcon } from '../icons/CableIcon';
import { CopyIcon } from '../icons/CopyIcon';
import { TickIcon } from '../icons/TickIcon';
import { ApplyIcon, ApplySpinnerIcon } from '../icons/ApplyIcons';
import { AlertSmall, QuestionSmall } from '../icons/StatusIcons';
import { Settings } from '../Settings';
import { Dropdown } from '../Dropdown';
import { InstallPopover } from '../InstallPopover';
import { QuestionPopover } from '../QuestionPopover';
import { buildCopyPrompt } from '../utils/studio-prompt';
import styles from './Toolbar.module.css';

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
                        <SelectElementIcon />
                    </IconButton>
                    <IconButton active={isDrawing} onClick={onToggleDraw} title="Draw element (⌥F)">
                        <DrawElementIcon />
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
                                        <motion.span key="panic" {...blurScale}><AlertSmall size={14} /></motion.span>
                                    ) : question ? (
                                        <motion.span key="question" {...blurScale}><QuestionSmall size={14} /></motion.span>
                                    ) : (
                                        <motion.span key="default" {...blurScale} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: !isAgentActive ? '#f59e0b' : undefined }}>
                                            {isAgentActive || mode === 'demo' ? <BotIcon /> : <CableIcon />}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </IconButton>
                            {showInstallPopover && question && (
                                <QuestionPopover question={question} anchorRef={cableRef} onAnswer={(answer) => { onAnswer(answer); setShowInstallPopover(false); }} onClose={() => setShowInstallPopover(false)} />
                            )}
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
                                        <motion.span key="spinner" {...blurFade}><ApplySpinnerIcon /></motion.span>
                                    ) : applied ? (
                                        <motion.span key="tick" {...blurFade}><TickIcon delay={0} /></motion.span>
                                    ) : (
                                        <motion.span key="idle" {...blurFade}><ApplyIcon /></motion.span>
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
                    <motion.span key="tick" {...blurFade}><TickIcon color="currentColor" delay={0} /></motion.span>
                ) : (
                    <motion.span key="copy" {...blurFade}><CopyIcon /></motion.span>
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
