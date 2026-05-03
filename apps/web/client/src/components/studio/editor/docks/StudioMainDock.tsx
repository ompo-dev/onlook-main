import { TerminalArea } from '@/app/project/[id]/_components/bottom-bar/terminal-area';
import { StudioDockShell } from './StudioDockShell';

export function StudioMainDock() {
    return (
        <div className="fixed bottom-4 left-1/2 z-[9998] -translate-x-1/2">
            <StudioDockShell className="flex-col items-stretch overflow-visible">
                <TerminalArea>{null}</TerminalArea>
            </StudioDockShell>
        </div>
    );
}
