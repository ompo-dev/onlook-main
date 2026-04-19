import { useEffect, useRef, useState } from 'react';
import { Dropdown } from '../Dropdown';
import { useStore } from '../state/use-store';
import styles from './InstallPopover.module.css';

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
            <p className={styles.title}>Agent not connected</p>
            <p className={styles.description}>
                Ensure an agent is connected by running <code className={styles.inline}>/studio</code>.
            </p>
            <p className={styles.description}>
                Not installed? Check out the{' '}
                <a href="https://cssstudio.ai/learn" target="_blank" rel="noopener noreferrer" className={styles.link}>
                    installation docs
                </a>.
            </p>
            <button className={styles.reconnectButton} onClick={handleReconnect} disabled={phase !== 'idle'}>
                {phase === 'connecting' ? (
                    <><span className={styles.spinner} />Connecting…</>
                ) : phase === 'failed' ? 'Reconnection failed' : 'Reconnect'}
            </button>
        </Dropdown>
    );
}
