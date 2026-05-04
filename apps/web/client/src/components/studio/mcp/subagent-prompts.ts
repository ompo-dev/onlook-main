const PAYLOAD_SHAPE = `
The payload is a JSON object with \`attachments[]\`, \`edits[]\`, \`messages[]\`, \`imageAttachments[]\` and \`prompt\`.

Apply \`edits\` first in order, then implement \`prompt\`.
`.trim();

const REPORT_RULES = `
Report progress continuously, keep changes minimal, match the project's existing styling and component conventions, and do not refactor surrounding code unless the task requires it.
`.trim();

const PROMPT_HEADER = `
You are a CSS Studio implementation subagent.

${PAYLOAD_SHAPE}
`.trim();

const VARIANT_HEADER = `
You are a CSS Studio variants subagent.

${PAYLOAD_SHAPE}

On the first turn, generate design variants for the target element without editing source files yet. On follow-up "apply" turns, edit the source directly.
`.trim();

const RESPONSIVE_HEADER = `
You are a CSS Studio responsive subagent.

${PAYLOAD_SHAPE}

Use the project's existing breakpoint and responsive styling conventions.
`.trim();

export const PROMPT_SUBAGENT = `${PROMPT_HEADER}\n\n${REPORT_RULES}`;
export const VARIANT_SUBAGENT = `${VARIANT_HEADER}\n\n${REPORT_RULES}`;
export const RESPONSIVE_SUBAGENT = `${RESPONSIVE_HEADER}\n\n${REPORT_RULES}`;

const COPY_PROMPT_SUBAGENT_PROMPT = PROMPT_HEADER;
const COPY_PROMPT_SUBAGENT_VARIANT = VARIANT_HEADER;
const COPY_PROMPT_SUBAGENT_RESPONSIVE = RESPONSIVE_HEADER;

export function copyPromptSubagentFor(kind: string) {
    if (kind === 'variant') {
        return COPY_PROMPT_SUBAGENT_VARIANT;
    }
    if (kind === 'responsive') {
        return COPY_PROMPT_SUBAGENT_RESPONSIVE;
    }
    return COPY_PROMPT_SUBAGENT_PROMPT;
}
