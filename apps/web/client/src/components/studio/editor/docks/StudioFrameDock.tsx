import { FrameSelected } from '@/app/project/[id]/_components/editor-bar/frame-selected';
import { DropdownManagerProvider } from '@/app/project/[id]/_components/editor-bar/hooks/use-dropdown-manager';
import { StudioDockShell } from './StudioDockShell';

export function StudioFrameDock() {
    return (
        <div className="fixed left-1/2 top-[74px] z-[9998] -translate-x-1/2">
            <DropdownManagerProvider>
                <StudioDockShell className="max-w-[calc(100vw-120px)] overflow-visible">
                    <FrameSelected availableWidth={760} />
                </StudioDockShell>
            </DropdownManagerProvider>
        </div>
    );
}
