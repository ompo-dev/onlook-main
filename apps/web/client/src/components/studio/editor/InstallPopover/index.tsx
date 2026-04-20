import { useEffect, useRef, useState } from 'react';
import { Dropdown } from '../Dropdown';
import { useStore } from '../state/use-store';

interface InstallPopoverProps {
    onClose: () => void;
    onReconnect: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
}

export function InstallPopover({ onClose, onReconnect, anchorRef }: InstallPopoverProps) {
    const [phase, setPhase] = useState<'idle' | 'connecting' | 'failed'>('idle');
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    function handleReconnect() {
        setPhase('connecting');
        onReconnect();
        const t1 = setTimeout(() => {
            if (useStore.getState().mcpStatus === 'connected') {
                setPhase('idle');
                return;
            }
            setPhase('failed');
            const t2 = setTimeout(() => setPhase('idle'), 1000);
            timers.current.push(t2);
        }, 1000);
        timers.current.push(t1);
    }

    return (
        <Dropdown open={true} onClose={onClose} anchorRef={anchorRef} width={320}>
            <p className="px-2 pb-1 text-sm font-semibold text-[var(--cs-foreground)]">
                Agent not connected
            </p>
            <p className="px-2 pb-1 text-[11px] leading-5 text-[var(--cs-secondary-text)]">
                Ensure an agent is connected by running{' '}
                <code className="rounded bg-[var(--cs-feint)] px-1 py-0.5 font-mono text-[10px] text-[var(--cs-foreground)]">
                    /studio
                </code>
                .
            </p>
            <p className="px-2 pb-2 text-[11px] leading-5 text-[var(--cs-secondary-text)]">
                Not installed? Check out the{' '}
                <a
                    href="https://cssstudio.ai/learn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--cs-accent)] underline-offset-2 hover:underline"
                >
                    installation docs
                </a>
                .
            </p>
            <button
                type="button"
                className="mx-2 mb-1 flex items-center justify-center gap-2 rounded-md bg-[var(--cs-accent)] px-3 py-2 text-[11px] font-medium text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleReconnect}
                disabled={phase !== 'idle'}
            >
                {phase === 'connecting' ? (
                    <>
                        <span className="h-3 w-3 animate-spin rounded-full border border-black/25 border-t-black" />
                        Connecting...
                    </>
                ) : phase === 'failed' ? 'Reconnection failed' : 'Reconnect'}
            </button>
        </Dropdown>
    );
}
