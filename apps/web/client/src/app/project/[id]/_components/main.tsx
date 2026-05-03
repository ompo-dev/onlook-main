'use client';

import { SubscriptionModal } from '@/components/ui/pricing-modal';
import { SettingsModalWithProjects } from '@/components/ui/settings-modal/with-project';
import { EditorAttributes } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { TooltipProvider } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStartProject } from '../_hooks/use-start-project';
import { CssStudio } from '@/components/studio/css-studio';
import { Canvas } from './canvas';
import { TopBar } from './top-bar';

export const Main = observer(() => {
    const router = useRouter();
    const { isProjectReady, error } = useStartProject();

    useEffect(() => {
        function handleGlobalWheel(event: WheelEvent) {
            if (!(event.ctrlKey || event.metaKey)) {
                return;
            }

            const canvasContainer = document.getElementById(
                EditorAttributes.CANVAS_CONTAINER_ID,
            );
            if (canvasContainer?.contains(event.target as Node | null)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
        }

        window.addEventListener('wheel', handleGlobalWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleGlobalWheel);
        };
    }, []);

    if (error) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2 flex-col">
                <div className="flex flex-row items-center justify-center gap-2">
                    <Icons.ExclamationTriangle className="h-6 w-6 text-foreground-primary" />
                    <div className="text-xl">Error starting project: {error}</div>
                </div>
                <Button onClick={() => {
                    router.push('/');
                }}>
                    Go to home
                </Button>
            </div>
        );
    }

    if (!isProjectReady) {
        return (
            <div className="h-screen w-screen flex items-center justify-center gap-2">
                <Icons.LoadingSpinner className="h-6 w-6 animate-spin text-foreground-primary" />
                <div className="text-xl">Loading project...</div>
            </div>
        );
    }
    return (
        <TooltipProvider>
            <div className="h-screen w-screen flex flex-row select-none relative overflow-hidden">
                <Canvas />
                <CssStudio />
                <div className="absolute top-0 z-50 w-full">
                    <TopBar />
                </div>
            </div>
            <SettingsModalWithProjects />
            <SubscriptionModal />
        </TooltipProvider >
    );
});
