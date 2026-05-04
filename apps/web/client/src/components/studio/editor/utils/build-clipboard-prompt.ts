import type { EditChange } from '../state/slices/edit-slice';
import type { TaskViewport } from '../state/slices/tasks-slice';
import { buildTaskPayload } from './build-task-payload';
import { copyPromptSubagentFor } from '../../mcp/subagent-prompts';

interface BuildClipboardPromptInput {
    kind?: string;
    nodeIds: number[];
    text: string;
    taskId?: string;
    url?: string;
    viewport?: TaskViewport;
    pendingEdits?: EditChange[];
    imageAttachments?: unknown[];
}

export function buildClipboardPrompt(input: BuildClipboardPromptInput) {
    const kind = input.kind ?? 'prompt';
    const refs = input.nodeIds.map((nodeId) => ({ nodeId }));
    const viewport = input.viewport ?? { width: 0, height: 0 };
    const now = Date.now();

    const payload = buildTaskPayload({
        id: input.taskId ?? `clip-${now}`,
        kind,
        prompt: input.text.trim(),
        url: input.url ?? '',
        createdAt: now,
        attachedElements: refs,
        edits: input.pendingEdits ?? [],
        messages:
            input.text.trim().length > 0
                ? [
                      {
                          id: `clip-msg-${now}`,
                          role: 'user',
                          text: input.text.trim(),
                          viewport,
                          elements: refs,
                          timestamp: now,
                      },
                  ]
                : [],
        imageAttachments: input.imageAttachments,
    });

    const header = copyPromptSubagentFor(kind);
    return `${header}\n\n${JSON.stringify(payload, null, 2)}`;
}
