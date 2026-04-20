const SKILL_PROMPT = `## Overview

CSS Studio is a Chrome DevTools extension that lets users visually edit CSS properties, HTML attributes, text content, and CSS variables on a live page. When connected via MCP, edits made in the panel are sent as structured data describing the change. You, the agent, implement these changes as you best see fit based on the existing document and project structure.

## Connect

The first time the \`css-studio\` tool is called, the MCP server will connect to the extension.

After the initial call, check whether your environment supports channel events (development channels). If it does:

-   **Channel events (preferred)**: Changes arrive as \`notifications/claude/channel\` events containing a JSON object with a \`changes\` array. Apply these changes immediately when received. Do NOT poll — just wait for events after the initial connection call.

If your environment does not support channel events:

-   **Polling (fallback)**: Call \`css-studio\` repeatedly to poll for the next batch of changes.

## Changes

Changes made in the devtools extension are received in an event-ordered array.

**Response format:**

\`\`\`json
{
    "url": "http://localhost:3000/page",
    "viewport": { "width": 1440, "height": 900 },
    "changes": [
        {
            "type": "style",
            "path": "main > section.hero",
            "element": "div.card:nth-of-type(2)",
            "name": "background-color",
            "value": "#fff → #f0f0f0"
        }
    ]
}
\`\`\`

\`url\` and \`viewport\` are included on the first response and whenever they change. Omitted otherwise — assume the same values for subsequent responses.

### Change types

| type          | element      | name              | value       |
| ------------- | ------------ | ----------------- | ----------- |
| \`style\`       | CSS selector | CSS property name | \`old → new\` |
| \`text\`        | CSS selector | —                 | \`old → new\` |
| \`attr\`        | CSS selector | attribute name    | \`old → new\` |
| \`attr-delete\` | CSS selector | attribute name    | —           |
| \`delete\`      | CSS selector | —                 | —           |
| \`token\`       | —            | CSS variable name | \`old → new\` |
| \`prompt\`      | CSS selector | —                 | user text   |

## Workflow

1. Call \`css-studio\` once to establish the connection
2. If channels are supported, wait for channel events. If not, poll by calling \`css-studio\` again.
3. Apply received changes to the matching source files
4. If polling, repeat from step 2.

## Rules

-   Prefer minimal changes. Don't refactor surrounding code.
-   Don't add comments explaining the changes.
-   Preserve existing code patterns (CSS modules, Tailwind, styled-components, inline styles, etc).`;

export function buildCopyPrompt(changes: unknown[], options?: { demo?: boolean }): string {
    const url = location.href;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const changesJson = JSON.stringify({ url, viewport, changes }, null, 2);
    if (options?.demo) {
        return `This is a demo prompt. In the real version of CSS Studio (cssstudio.ai) this prompt contains instructions about how to implement the following changes:\n\n${changesJson}`;
    }
    return `${SKILL_PROMPT}\n\n---\n\nIgnore the connection and polling instructions above — they don't apply here. Apply the following changes as instructed:\n\n${changesJson}`;
}
