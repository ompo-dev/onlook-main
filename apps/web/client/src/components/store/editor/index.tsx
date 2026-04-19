'use client';

import type { Branch, Project } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { EditorEngine } from './engine';

const EditorEngineContext = createContext<EditorEngine | null>(null);

export const useEditorEngine = () => {
    const ctx = useContext(EditorEngineContext);
    if (!ctx) throw new Error('useEditorEngine must be inside EditorEngineProvider');
    return ctx;
};

export const EditorEngineProvider = ({
    children,
    project,
    branches
}: {
    children: React.ReactNode,
    project: Project,
    branches: Branch[],
}) => {
    const posthog = usePostHog();
    const currentProjectId = useRef(project.id);
    const engineRef = useRef<EditorEngine | null>(null);
    const [isReady, setIsReady] = useState(false);

    const [editorEngine, setEditorEngine] = useState(() => {
        const engine = new EditorEngine(project.id, posthog);
        engineRef.current = engine;
        return engine;
    });

    useEffect(() => {
        let cancelled = false;

        const initializeEngine = async () => {
            setIsReady(false);

            const existingEngine = engineRef.current;
            let engine = existingEngine;
            let createdNewEngine = false;

            if (!engine || currentProjectId.current !== project.id) {
                if (existingEngine) {
                    setTimeout(() => existingEngine.clear(), 0);
                }

                engine = new EditorEngine(project.id, posthog);
                createdNewEngine = true;
            }

            await engine.initBranches(branches);
            await engine.init();
            engine.screenshot.lastScreenshotAt = project.metadata?.previewImg?.updatedAt ?? null;

            if (cancelled) {
                if (createdNewEngine) {
                    setTimeout(() => engine.clear(), 0);
                }
                return;
            }

            engineRef.current = engine;
            currentProjectId.current = project.id;
            setEditorEngine(engine);
            setIsReady(true);
        };

        void initializeEngine();

        return () => {
            cancelled = true;
        };
    }, [branches, posthog, project.id, project.metadata?.previewImg?.updatedAt]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setTimeout(() => engineRef.current?.clear(), 0);
        };
    }, []);

    if (!isReady) {
        return null;
    }

    return (
        <EditorEngineContext.Provider value={editorEngine}>
            {children}
        </EditorEngineContext.Provider>
    );
};
