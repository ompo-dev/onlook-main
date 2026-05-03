'use client';

import { useEditorEngine } from '@/components/store/editor';
import { recoverJsxMetadataForOid } from '@/components/store/editor/code/metadata-recovery';
import type { CodeNavigationTarget } from '@onlook/models';
import { pathsEqual } from '@onlook/utility';
import { reaction } from 'mobx';
import { useEffect, useRef, useState } from 'react';

const isNavigationTargetEqual = (navigationTarget1: CodeNavigationTarget | null, navigationTarget2: CodeNavigationTarget | null) => {
    if (!navigationTarget1 || !navigationTarget2) {
        return false;
    }
    return pathsEqual(navigationTarget1.filePath, navigationTarget2.filePath)
        && navigationTarget1.range.start.line === navigationTarget2.range.start.line
        && navigationTarget1.range.start.column === navigationTarget2.range.start.column
        && navigationTarget1.range.end.line === navigationTarget2.range.end.line
        && navigationTarget1.range.end.column === navigationTarget2.range.end.column;
}

export function useCodeNavigation() {
    const editorEngine = useEditorEngine();
    const savedNavigationTarget = useRef<CodeNavigationTarget | null>(null);
    const [navigationTarget, setNavigationTarget] = useState<CodeNavigationTarget | null>(null);

    useEffect(() => {
        const disposer = reaction(
            () => ({
                selectedSignature: editorEngine.elements.selected
                    .map((element) =>
                        [
                            element.branchId,
                            element.frameId,
                            element.domId,
                            element.instanceId ?? '',
                            element.oid ?? '',
                        ].join(':'),
                    )
                    .join('|'),
                override: editorEngine.ide.codeNavigationOverride
            }),
            async ({ override }) => {
                if (override) {
                    if (isNavigationTargetEqual(override, savedNavigationTarget.current)) {
                        return;
                    }
                    savedNavigationTarget.current = override;
                    setNavigationTarget(override);
                    return;
                }

                const [selectedElement] = editorEngine.elements.selected;

                if (!selectedElement) {
                    savedNavigationTarget.current = null;
                    setNavigationTarget(null);
                    return;
                }

                const oid = selectedElement.instanceId ?? selectedElement.oid;
                if (!oid) {
                    console.warn('[CodeNavigation] No OID found for selected element');
                    savedNavigationTarget.current = null;
                    setNavigationTarget(null);
                    return;
                }

                try {
                    const branchData = editorEngine.branches.getBranchDataById(selectedElement.branchId);
                    if (!branchData) {
                        console.warn(`[CodeNavigation] No branch data found for branchId: ${selectedElement.branchId}`);
                        savedNavigationTarget.current = null;
                        setNavigationTarget(null);
                        return;
                    }

                    const metadata = await recoverJsxMetadataForOid(
                        branchData.codeEditor,
                        branchData.sandbox.session.provider,
                        oid,
                    );
                    if (!metadata) {
                        console.warn(`[CodeNavigation] No metadata found for OID: ${oid}`);
                        savedNavigationTarget.current = null;
                        setNavigationTarget(null);
                        return;
                    }

                    const startLine = metadata.startTag.start.line;
                    const startColumn = metadata.startTag.start.column;

                    const endTag = metadata.endTag || metadata.startTag;
                    const endLine = endTag.end.line;
                    const endColumn = endTag.end.column;

                    const target: CodeNavigationTarget = {
                        filePath: metadata.path,
                        range: {
                            start: { line: startLine, column: startColumn },
                            end: { line: endLine, column: endColumn }
                        }
                    };

                    if (isNavigationTargetEqual(target, savedNavigationTarget.current)) {
                        return;
                    }
                    savedNavigationTarget.current = target;
                    setNavigationTarget(target);
                } catch (error) {
                    console.error('[CodeNavigation] Error getting element metadata:', error);
                    savedNavigationTarget.current = null;
                    setNavigationTarget(null);
                }
            },
            { fireImmediately: true }
        );

        return () => disposer();
    }, [editorEngine]);

    return navigationTarget;
}
