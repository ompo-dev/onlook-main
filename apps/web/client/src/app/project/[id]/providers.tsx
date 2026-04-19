'use client';

import { EditorEngineProvider } from '@/components/store/editor';
import { HostingProvider } from '@/components/store/hosting';
import { LOCAL_MODE_ENABLED } from '@/utils/local-mode';
import type { Branch, Project } from '@onlook/models';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const ProjectProviders = ({
    children,
    project,
    branches
}: {
    children: React.ReactNode,
    project: Project,
    branches: Branch[]
}) => {
    return (
        <DndProvider backend={HTML5Backend}>
            <EditorEngineProvider project={project} branches={branches}>
                {LOCAL_MODE_ENABLED ? children : <HostingProvider>{children}</HostingProvider>}
            </EditorEngineProvider>
        </DndProvider>
    );
};
