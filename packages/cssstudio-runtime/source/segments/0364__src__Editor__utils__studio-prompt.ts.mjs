// src/Editor/utils/studio-prompt.ts
var SKILL_PROMPT = `## Overview

CSS Studio is a Chrome DevTools extension that lets users visually edit CSS properties, HTML attributes, text content, and CSS variables on a live page. When connected via MCP, edits made in the panel are sent as structured data describing the change. You, the agent, implement these changes as you best see fit based on the existing document and project structure.

## Connect

The first time the \`css-studio\` tool is called, the MCP server will connect to the extension.

After the initial call, check whether your environment supports channel events (development channels). If it does:

-   **Channel events (preferred)**: Changes arrive as \`notifications/claude/channel\` events containing a JSON object with a \`changes\` array. Apply these changes immediately when received. Do NOT poll \u2014 just wait for events after the initial connection call.

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
            "value": "#fff \u2192 #f0f0f0"
        },
        {
            "type": "style",
            "path": "main > section.hero",
            "element": "div.card:nth-of-type(2)",
            "name": "padding",
            "value": "8px \u2192 16px"
        }
    ]
}
\`\`\`

\`url\` and \`viewport\` are included on the first response and whenever they change. Omitted otherwise \u2014 assume the same values for subsequent responses.

### Change types

| type          | element      | name              | value       |
| ------------- | ------------ | ----------------- | ----------- |
| \`style\`       | CSS selector | CSS property name | \`old \u2192 new\` |
| \`text\`        | CSS selector | \u2014                 | \`old \u2192 new\` |
| \`attr\`        | CSS selector | attribute name    | \`old \u2192 new\` |
| \`attr-delete\` | CSS selector | attribute name    | \u2014           |
| \`delete\`      | CSS selector | \u2014                 | \u2014           |
| \`token\`       | \u2014            | CSS variable name | \`old \u2192 new\` |
| \`prompt\`      | CSS selector | \u2014                 | user text   |

The \`element\` field uses the most specific identifier available: \`tag#id\`, \`tag[data-testid="x"]\`, or \`tag.class1.class2\`.

## Workflow

1. Call \`css-studio\` once to establish the connection
2. If channels are supported, wait for channel events. If not, poll by calling \`css-studio\` again.
3. Apply received changes to the matching source files
4. If polling, repeat from step 2.

## Editing

### Element identification

Each change includes an \`element\` field and optionally a \`path\` field to help locate the right element in source code.

**\`element\`** \u2014 the target element, using the most specific identifier available:

-   \`tag#id\` \u2014 when the element has an id
-   \`tag[data-testid="x"]\` or \`tag[data-id="x"]\` \u2014 when a data attribute is present
-   \`tag.class1.class2\` \u2014 fallback to class names

When the element has same-tag siblings, \`:nth-of-type(n)\` is appended (e.g. \`li.item:nth-of-type(3)\`).

**\`path\`** \u2014 up to 3 ancestor selectors (excluding \`html\`/\`body\`) joined with \`>\`, providing structural context. For example, \`main > section.hero\` tells you the element is inside \`<section class="hero">\` inside \`<main>\`. Omitted when there are no meaningful ancestors.

#### CMS and data-driven content

If receiving text changes or element deletions, if an element can't be found it could be that this element is automatically generated from a data source: Markdown, external CMS etc.

If .md, try your best to update the local file. If an external CMS, try to update via installed MCPs.

#### Error reporting

If you cannot find an element in source code, report it back to the extension so the user is notified:

\`\`\`
css-studio({ action: "panic", reason: "element_not_found", element: "div.card:nth-of-type(2)" })
\`\`\`

This shows an error indicator in the DevTools panel so the user can improve selectors or provide more context.

### Implementing

When updating styles, think about where the value is being originally set and how that plays into where we apply the edit.

For instance, if we're updating a design token we always want to edit the source value itself.

If we're updating a style on an element: Is this derived from a shared style? It's unlikely we want to change the \`font-size\` of a single \`li\` - this is likely to be a wide change. Alternatively, if this is the homepage header, we probably want to adjust just this element. Take into account the existing specificity as context.

Always implement based on the existing codebase styles. For instance, if an element is styled with Tailwind classes, don't add changes via the \`style\` tag. Add, remove or change existing Tailwind classes. Likewise if we have a CSS stylesheet and the convention is to make all styles there, this is where edits should be.

### Responsive styles

The \`viewport\` field tells you the screen size the user is editing at. Consider this when deciding where to apply style changes:

- Some properties are rarely viewport-dependent (e.g. \`color\`, \`border-style\`, \`font-family\`) \u2014 apply these to the base styles unless there's already a responsive override.
- Layout and sizing properties (e.g. \`font-size\`, \`padding\`, \`width\`, \`gap\`, \`grid-template-columns\`) are more likely to be viewport-dependent. Check if the project has existing breakpoints or media queries that match the current viewport width and apply changes there if appropriate.
- Use your judgement and the existing code as context. If there are no responsive styles in the project, don't introduce them.

## Rules

-   Prefer minimal changes. Don't refactor surrounding code.
-   Don't add comments explaining the changes.
-   Preserve existing code patterns (CSS modules, Tailwind, styled-components, inline styles, etc).`;
function buildCopyPrompt(changes, options) {
  const url = location.href;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const changesJson = JSON.stringify({ url, viewport, changes }, null, 2);
  if (options?.demo) {
    return `This is a demo prompt. In the real version of CSS Studio (cssstudio.ai) this prompt contains instructions about how to implement the following changes:

${changesJson}`;
  }
  return `${SKILL_PROMPT}

---

Ignore the connection and polling instructions above \u2014 they don't apply here. Apply the following changes as instructed:

${changesJson}`;
}

