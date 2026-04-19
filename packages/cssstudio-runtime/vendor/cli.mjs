#!/usr/bin/env node

// src/mcp/serve.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/mcp/bridge.ts
import { WebSocketServer, WebSocket } from "ws";
var DevToolsBridge = class _DevToolsBridge {
  constructor(port) {
    this.wss = null;
    this.clients = /* @__PURE__ */ new Set();
    this.pendingChanges = [];
    this.waitingResolvers = [];
    this.waitingAnswerResolver = null;
    this.waitingUserMessageResolver = null;
    this.pendingUserMessages = [];
    this.startError = null;
    this.started = false;
    this.onUpdate = null;
    this.onUserMessage = null;
    this.ready = false;
    this.readyPromise = null;
    this.activeUrl = null;
    this.urlSentToAgent = false;
    this.activeViewport = null;
    this.viewportSentToAgent = false;
    this.pollingActive = false;
    this.pollingGraceTimer = null;
    this.lastBroadcastedPolling = null;
    this.port = port ?? parseInt(process.env.CSS_STUDIO_PORT || "9877", 10);
  }
  static {
    this.POLLING_GRACE_MS = 3e4;
  }
  get isListening() {
    return this.ready && this.startError === null;
  }
  ensureStarted() {
    if (this.started && !this.startError) return;
    this.started = true;
    this.startError = null;
    this.readyPromise = this.start();
  }
  async waitUntilReady() {
    if (this.readyPromise) await this.readyPromise;
  }
  start(retried = false) {
    return new Promise((resolve2) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });
      } catch (err) {
        this.startError = `Failed to create WebSocket server: ${err?.message ?? err}`;
        resolve2();
        return;
      }
      this.wss.on("listening", () => {
        this.ready = true;
        this.startError = null;
        console.error(
          `[css-studio-mcp] WebSocket server listening on port ${this.port}`
        );
        resolve2();
      });
      this.wss.on("error", (err) => {
        if (err?.code === "EADDRINUSE" && !retried) {
          console.error(
            `[css-studio-mcp] Port ${this.port} in use, retrying in 1s...`
          );
          this.wss = null;
          setTimeout(() => {
            this.start(true).then(resolve2);
          }, 1e3);
          return;
        }
        this.startError = `Port ${this.port} is already in use. Kill the other process or set CSS_STUDIO_PORT to use a different port.`;
        this.wss = null;
        this.ready = false;
        resolve2();
      });
      this.setupConnectionHandler();
    });
  }
  setupConnectionHandler() {
    if (!this.wss) return;
    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      console.error(
        `[css-studio-mcp] Client connected (${this.clients.size} total)`
      );
      ws.send(JSON.stringify({ type: "polling", active: this.pollingActive }));
      ws.on("message", (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }
        if (msg.type === "page-info") {
          if (this.activeUrl !== msg.url) {
            this.activeUrl = msg.url;
            this.urlSentToAgent = false;
          }
          const vp = msg.viewport;
          if (!this.activeViewport || this.activeViewport.width !== vp.width || this.activeViewport.height !== vp.height) {
            this.activeViewport = vp;
            this.viewportSentToAgent = false;
          }
          return;
        }
        if (msg.type === "answer") {
          if (this.waitingAnswerResolver) {
            clearTimeout(this.waitingAnswerResolver.timer);
            this.waitingAnswerResolver.resolve(msg.answer);
            this.waitingAnswerResolver = null;
            this.schedulePollingInactive();
          }
          return;
        }
        if (msg.type === "user-message") {
          const payload = { text: msg.text, attachments: msg.attachments, clientMsgId: msg.clientMsgId };
          if (this.waitingUserMessageResolver) {
            clearTimeout(this.waitingUserMessageResolver.timer);
            this.waitingUserMessageResolver.resolve(payload);
            this.waitingUserMessageResolver = null;
            if (payload.clientMsgId) {
              this.broadcast({ type: "user-message-ack", ids: [payload.clientMsgId] });
            }
          } else {
            this.pendingUserMessages.push(payload);
          }
          for (const waiter of this.waitingResolvers) {
            clearTimeout(waiter.timer);
            waiter.resolve(this.pendingChanges);
          }
          this.waitingResolvers = [];
          this.schedulePollingInactive();
          this.onUserMessage?.(payload);
          return;
        }
        if (msg.type === "style-update") {
          this.pendingChanges.push(...msg.changes);
          for (const waiter of this.waitingResolvers) {
            clearTimeout(waiter.timer);
            waiter.resolve(this.pendingChanges);
          }
          this.waitingResolvers = [];
          this.schedulePollingInactive();
          this.onUpdate?.(msg.changes);
        }
      });
      ws.on("close", () => {
        this.clients.delete(ws);
        if (this.clients.size === 0) this.activeUrl = null;
        console.error(
          `[css-studio-mcp] Client disconnected (${this.clients.size} total)`
        );
      });
    });
  }
  markPollingActive() {
    if (this.pollingGraceTimer) {
      clearTimeout(this.pollingGraceTimer);
      this.pollingGraceTimer = null;
    }
    if (!this.pollingActive) {
      this.pollingActive = true;
      this.broadcastPolling(true);
    }
  }
  schedulePollingInactive() {
    if (this.pollingGraceTimer) clearTimeout(this.pollingGraceTimer);
    this.pollingGraceTimer = setTimeout(() => {
      this.pollingGraceTimer = null;
      if (this.waitingResolvers.length === 0 && !this.waitingAnswerResolver && !this.waitingUserMessageResolver) {
        this.pollingActive = false;
        this.broadcastPolling(false);
      }
    }, _DevToolsBridge.POLLING_GRACE_MS);
  }
  broadcast(payload) {
    const msg = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }
  waitForSingle(getResolver, setResolver, timeoutMs) {
    this.markPollingActive();
    const existing = getResolver();
    if (existing) {
      clearTimeout(existing.timer);
      existing.resolve(null);
      setResolver(null);
    }
    return new Promise((resolve2) => {
      const timer = setTimeout(() => {
        setResolver(null);
        this.schedulePollingInactive();
        resolve2(null);
      }, timeoutMs);
      setResolver({ resolve: resolve2, timer });
    });
  }
  broadcastPolling(active) {
    if (this.lastBroadcastedPolling === active) return;
    this.lastBroadcastedPolling = active;
    this.broadcast({ type: "polling", active });
  }
  waitForUpdate(timeoutMs, onWaiting) {
    this.markPollingActive();
    if (this.pendingChanges.length > 0 || this.pendingUserMessages.length > 0) {
      this.schedulePollingInactive();
      return Promise.resolve(this.pendingChanges);
    }
    onWaiting?.();
    return new Promise((resolve2) => {
      const timer = setTimeout(() => {
        const idx = this.waitingResolvers.findIndex(
          (w) => w.resolve === resolve2
        );
        if (idx !== -1) this.waitingResolvers.splice(idx, 1);
        this.schedulePollingInactive();
        resolve2(null);
      }, timeoutMs);
      this.waitingResolvers.push({ resolve: resolve2, timer });
    });
  }
  consumeChanges() {
    this.pendingChanges = [];
    this.broadcast({ type: "drained", implementing: true });
  }
  /** Returns the URL if it hasn't been sent yet or has changed. */
  consumeUrl() {
    if (!this.activeUrl || this.urlSentToAgent) return null;
    this.urlSentToAgent = true;
    return this.activeUrl;
  }
  /** Returns viewport if it hasn't been sent yet or has changed. */
  consumeViewport() {
    if (!this.activeViewport || this.viewportSentToAgent) return null;
    this.viewportSentToAgent = true;
    return this.activeViewport;
  }
  sendQuestion(question, options) {
    this.broadcast({ type: "ask", question, options });
  }
  waitForAnswer(timeoutMs) {
    return this.waitForSingle(
      () => this.waitingAnswerResolver,
      (r) => {
        this.waitingAnswerResolver = r;
      },
      timeoutMs
    );
  }
  sendPanic(reason, element) {
    this.broadcast({ type: "panic", reason, element });
  }
  sendCalm() {
    this.broadcast({ type: "calm" });
  }
  sendAgentMessage(text) {
    this.broadcast({ type: "agent-message", text });
  }
  sendAgentResponding(active) {
    this.broadcast({ type: "agent-responding", active });
  }
  consumeUserMessages() {
    const msgs = this.pendingUserMessages.splice(0);
    const ids = msgs.map((m) => m.clientMsgId).filter(Boolean);
    if (ids.length > 0) this.broadcast({ type: "user-message-ack", ids });
    return msgs;
  }
  waitForUserMessage(timeoutMs) {
    if (this.pendingUserMessages.length > 0) {
      const msg = this.pendingUserMessages.shift();
      if (msg.clientMsgId) {
        this.broadcast({ type: "user-message-ack", ids: [msg.clientMsgId] });
      }
      return Promise.resolve(msg);
    }
    return this.waitForSingle(
      () => this.waitingUserMessageResolver,
      (r) => {
        this.waitingUserMessageResolver = r;
      },
      timeoutMs
    );
  }
  sendReady() {
    this.broadcast({ type: "ready" });
  }
  getStatus() {
    return {
      listening: this.isListening,
      error: this.startError,
      connected: this.clients.size,
      pendingChanges: this.pendingChanges.length,
      port: this.port,
      url: this.activeUrl
    };
  }
  stop() {
    if (this.pollingGraceTimer) {
      clearTimeout(this.pollingGraceTimer);
      this.pollingGraceTimer = null;
    }
    this.pollingActive = false;
    if (this.waitingAnswerResolver) {
      clearTimeout(this.waitingAnswerResolver.timer);
      this.waitingAnswerResolver.resolve(null);
      this.waitingAnswerResolver = null;
    }
    if (this.waitingUserMessageResolver) {
      clearTimeout(this.waitingUserMessageResolver.timer);
      this.waitingUserMessageResolver.resolve(null);
      this.waitingUserMessageResolver = null;
    }
    for (const waiter of this.waitingResolvers) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.waitingResolvers = [];
    this.wss?.close();
    this.wss = null;
    this.ready = false;
  }
};

// src/mcp/get-update.ts
import { z } from "zod";
var description = `CSS Studio DevTools bridge. Use the /studio skill for usage instructions.`;
var args = {
  action: z.enum(["get", "panic", "calm", "ask", "message", "responding", "chat"]).default("get").describe("Action to perform"),
  timeout: z.number().min(0).max(6e4).default(3e4).describe(
    "How long to wait for an update in milliseconds (get and ask)"
  ),
  reason: z.string().optional().describe("Reason for panic (e.g. 'element_not_found')"),
  element: z.string().optional().describe("Element selector that caused the panic"),
  question: z.string().optional().describe("Question to display to the user (ask only)"),
  options: z.array(z.string()).optional().describe("Options for the user to choose from (ask only)"),
  text: z.string().optional().describe("Message text to send to the user (message action)"),
  active: z.boolean().optional().describe("Whether the agent is responding (responding action, defaults to true)")
};
function textResult(text, isError) {
  return { ...isError ? { isError: true } : {}, content: [{ type: "text", text }] };
}
function initTool(server, bridge) {
  async function ensureBridge() {
    if (bridge.isListening) return null;
    bridge.ensureStarted();
    await bridge.waitUntilReady();
    if (!bridge.isListening) {
      const status = bridge.getStatus();
      return textResult(`Bridge failed to start. ${status.error ?? "WebSocket server is not running."}`, true);
    }
    return null;
  }
  server.tool(
    "css-studio",
    description,
    args,
    async ({ action, timeout, reason, element, question, options, text, active }) => {
      if (action === "panic") {
        bridge.sendPanic(reason ?? "unknown", element);
        return textResult("Panic reported to extension.");
      }
      if (action === "calm") {
        bridge.sendCalm();
        return textResult("Panic cleared.");
      }
      if (action === "ask") {
        if (!question || !options || options.length === 0) {
          return textResult("The 'ask' action requires 'question' and non-empty 'options'.", true);
        }
        const err2 = await ensureBridge();
        if (err2) return err2;
        bridge.sendQuestion(question, options);
        const answer = await bridge.waitForAnswer(timeout);
        if (!answer) return textResult("No answer received within timeout.");
        return textResult(JSON.stringify({ answer }));
      }
      if (action === "message") {
        bridge.sendAgentMessage(text ?? "");
        return textResult("Message sent.");
      }
      if (action === "responding") {
        bridge.sendAgentResponding(active ?? true);
        return textResult("Responding state updated.");
      }
      if (action === "chat") {
        const err2 = await ensureBridge();
        if (err2) return err2;
        const msg = await bridge.waitForUserMessage(timeout);
        if (!msg) return textResult("No message received within timeout.");
        return textResult(JSON.stringify(msg));
      }
      const err = await ensureBridge();
      if (err) return err;
      const changes = await bridge.waitForUpdate(timeout, () => {
        bridge.sendReady();
      });
      const messages = bridge.consumeUserMessages();
      if (!changes && messages.length === 0) {
        return textResult("No pending updates. Call this tool again to continue waiting.");
      }
      const url = bridge.consumeUrl();
      const viewport = bridge.consumeViewport();
      const response = { changes: changes ?? [] };
      if (changes && changes.length > 0) bridge.consumeChanges();
      if (url) response.url = url;
      if (viewport) response.viewport = viewport;
      if (messages.length > 0) response.messages = messages;
      return textResult(JSON.stringify(response));
    }
  );
}

// src/mcp/serve.ts
var instructions = `CSS Studio bridges a visual editor panel to this agent. Use the /studio skill to start a session.`;
async function startServer() {
  const server = new McpServer(
    {
      name: "CSS Studio",
      version: "0.2.0"
    },
    {
      capabilities: {
        tools: {},
        experimental: { "claude/channel": {} }
      },
      instructions
    }
  );
  const bridge = new DevToolsBridge();
  initTool(server, bridge);
  bridge.onUpdate = (changes) => {
    try {
      server.server.notification({
        method: "notifications/claude/channel",
        params: {
          content: JSON.stringify({ changes })
        }
      });
    } catch {
    }
  };
  bridge.onUserMessage = (msg) => {
    try {
      server.server.notification({
        method: "notifications/claude/channel",
        params: {
          content: JSON.stringify({ messages: [msg] })
        }
      });
    } catch {
    }
  };
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// src/mcp/install.ts
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// src/mcp/skill.ts
var SKILL_CONTENT = `---
name: studio
description: >
    Receives CSS and HTML changes made in CSS Studio via MCP and applies them to source code.
argument-hint: "[wait for edits from CSS Studio]"
---

## Overview

CSS Studio is a visual editor that lets users edit CSS properties, HTML attributes, text content, and CSS variables on a live page. When connected via MCP, edits made in the panel are sent as structured data describing the change. You, the agent, implement these changes as you best see fit based on the existing document and project structure.

## Connect

The first time the \`css-studio\` tool is called, the MCP server will connect to the editor.

After the initial call, check whether your environment supports channel events (development channels). If it does:

-   **Channel events (preferred)**: Changes arrive as \`notifications/claude/channel\` events containing a JSON object with a \`changes\` array. Apply these changes immediately when received. Do NOT poll \u2014 just wait for events after the initial connection call.

If your environment does not support channel events:

-   **Polling (fallback)**: Call \`css-studio\` repeatedly to poll for the next batch of changes. **Always use a timeout of 60 seconds per call.** The tool will return empty when there are no pending changes \u2014 this is normal. **Never stop polling due to timeouts or empty responses, and never reduce the timeout duration.** Keep calling \`css-studio\` with a 60-second timeout indefinitely until the user explicitly ends the session. Blocking the chat is the success case for polling. By explicitly running this skill, users are opting this agent in to blocking input apart from returns from the MCP tool. DO NOT stop early just to update the user, NEVER stop early for any reason except the user manually interrupting. If the environment stops the run after N polls or T minutes, say so and tell the user to send /studio again to resume \u2014 though if it is in your capability, resume the poll in this instance.

## Changes

Changes made in the editor are received in an event-ordered array.

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
        }
    ]
}
\`\`\`

\`url\` and \`viewport\` are included on the first response and whenever they change. Omitted otherwise \u2014 assume the same values for subsequent responses.

The response may also include a \`messages\` array \u2014 free-text messages sent by the user from the chat panel:

\`\`\`json
{
    "changes": [],
    "messages": [
        { "text": "Can you make the header sticky?", "attachments": [{ "nodeId": 42, "label": "header.main" }] }
    ]
}
\`\`\`

When \`messages\` is present, treat each message as a direct instruction. Use the \`label\` field of any attachments to identify the target element. Always respond to user messages by calling \`css-studio({ action: "message", text: "..." })\` so the user sees your reply in the chat panel.

### Change types

| type          | element      | name              | value       |
| ------------- | ------------ | ----------------- | ----------- |
| \`style\`       | CSS selector | CSS property name | \`old \u2192 new\` |
| \`text\`        | CSS selector | \u2014                 | \`old \u2192 new\` |
| \`attr\`        | CSS selector | attribute name    | \`old \u2192 new\` |
| \`attr-delete\` | CSS selector | attribute name    | \u2014           |
| \`delete\`      | CSS selector | \u2014                 | \u2014           |
| \`tag\`         | CSS selector | \u2014                 | \`old \u2192 new\` |
| \`add-child\`   | CSS selector | \u2014                 | tag name    |
| \`add-sibling\` | CSS selector | \u2014                 | tag name    |
| \`duplicate\`   | CSS selector | \u2014                 | \u2014           |
| \`token\`       | \u2014            | CSS variable name | \`old \u2192 new\` |
| \`keyframe\`    | \u2014            | @keyframes name   | full CSS    |

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

**\`path\`** \u2014 up to 3 ancestor selectors (excluding \`html\`/\`body\`) joined with \`>\`, providing structural context.

### Component information (React)

When the page uses React in development mode, changes include additional fields:

-   \`component\` \u2014 the React component name (e.g. \`"Card"\`, \`"Header"\`)
-   \`source\` \u2014 the source file and line number (e.g. \`"src/components/Card.tsx:42"\`)

When these fields are present, use them to locate the element in source code directly instead of searching by CSS selector. The \`source\` field points to the component definition, which is usually the file you need to edit.

#### Keyframe changes

A \`keyframe\` change contains the full updated CSS for a \`@keyframes\` rule. The \`name\` field is the rule name (e.g. \`"pulse"\`) and the \`value\` field contains the complete \`@keyframes\` block. Find the existing \`@keyframes\` rule in source code and replace it entirely with the provided CSS.

#### Tag changes

A \`tag\` change means the user changed an element's HTML tag (e.g. \`div \u2192 section\`). Find the element in source code and change its opening and closing tags. Preserve all attributes, classes, and children.

#### Adding elements

\`add-child\` and \`add-sibling\` changes mean the user added a new empty \`<div>\` as a child or sibling of the identified element.

#### Duplicating elements

A \`duplicate\` change means the user cloned an element. If the element is rendered from a data structure (e.g. an array passed to \`.map()\`), duplicate the corresponding entry in the data structure rather than duplicating markup.

#### Error reporting

If you cannot find an element in source code:

\`\`\`
css-studio({ action: "panic", reason: "element_not_found", element: "div.card:nth-of-type(2)" })
\`\`\`

Once resolved, clear the error:

\`\`\`
css-studio({ action: "calm" })
\`\`\`

#### Asking the user

When you need the user to disambiguate between options (e.g. which element is the one they edited, which file to apply changes to), use the \`ask\` action instead of panicking:

\`\`\`
css-studio({ action: "ask", question: "Which element is the site header?", options: ["header.main-header", "div.nav-wrapper", "nav#primary-nav"] })
\`\`\`

The call blocks until the user selects an option. The response contains their choice:

\`\`\`json
{ "answer": "nav#primary-nav" }
\`\`\`

Prefer \`ask\` over \`panic\` when the situation is resolvable by user input. Reserve \`panic\` for hard failures only.

#### Chat

CSS Studio has a chat panel where users can send you free-text messages (optionally with element attachments). You can also send messages back.

**Sending a message to the user:**

\`\`\`
css-studio({ action: "message", text: "Done \u2014 I've updated the card layout." })
\`\`\`

The message appears in the chat panel immediately.

**Indicating you're working:**

\`\`\`
css-studio({ action: "responding" })
\`\`\`

This shows a "responding" indicator in the chat panel. It clears automatically when you send a message. You can also clear it explicitly with \`css-studio({ action: "responding", active: false })\`.

**Waiting for a user message:**

\`\`\`
css-studio({ action: "chat", timeout: 60000 })
\`\`\`

This blocks until the user sends a message in the chat panel. The response contains:

\`\`\`json
{ "text": "Can you make the header sticky?", "attachments": [{ "nodeId": 42, "label": "header.main" }] }
\`\`\`

\`attachments\` is present when the user attached elements to their message (via the element prompt icon). Treat \`text\` as a direct instruction, using the attached element labels for context.

**Recommended pattern:** After applying changes, send a brief confirmation message. When waiting between poll cycles, you can optionally call \`chat\` alongside \`get\` to handle both style edits and chat messages. However, you cannot call both simultaneously \u2014 prefer \`get\` for the primary poll loop and check chat messages between edit batches.

### Implementing

Always implement based on the existing codebase styles. For instance, if an element is styled with Tailwind classes, don't add changes via the \`style\` tag. Add, remove or change existing Tailwind classes. Likewise if we have a CSS stylesheet and the convention is to make all styles there, this is where edits should be.

### Responsive styles

The \`viewport\` field tells you the screen size the user is editing at. Consider this when deciding where to apply style changes.

## Rules

-   **Every change is intentional.** Never skip, deduplicate, or second-guess a change \u2014 apply it as received.
-   Prefer minimal changes. Don't refactor surrounding code.
-   Don't add comments explaining the changes.
-   Preserve existing code patterns (CSS modules, Tailwind, styled-components, inline styles, etc).

## If MCP tools aren't available

If the \`css-studio\` tool is not found, tell the user:

> The CSS Studio MCP server is not installed. Install it by running:
>
> \`\`\`
> npx cssstudio install
> \`\`\`
`;

// src/mcp/install.ts
var MCP_ENTRY = { command: "npx", args: ["-y", "cssstudio"] };
var ESC = "\x1B[";
var reset = `${ESC}0m`;
var bold = (s) => `${ESC}1m${s}${reset}`;
var dim = (s) => `${ESC}2m${s}${reset}`;
var green = (s) => `${ESC}32m${s}${reset}`;
var cyan = (s) => `${ESC}36m${s}${reset}`;
var yellow = (s) => `${ESC}33m${s}${reset}`;
function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}
function writeMcpConfig(configFile) {
  let config = {};
  try {
    config = JSON.parse(readFileSync(configFile, "utf-8"));
  } catch {
  }
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers["css-studio"] = MCP_ENTRY;
  mkdirSync(join(configFile, ".."), { recursive: true });
  writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");
}
function writeFile(filepath, content) {
  mkdirSync(join(filepath, ".."), { recursive: true });
  writeFileSync(filepath, content);
}
var SKILL_TARGETS = [
  { agent: "Claude Code", path: ".claude/skills/studio/SKILL.md", always: true },
  { agent: "Agents (Cursor, VS Code, Codex, Amp)", path: ".agents/skills/studio/SKILL.md", always: true },
  { agent: "Windsurf", path: ".windsurf/skills/studio/SKILL.md" }
];
function install() {
  const root = findProjectRoot();
  console.log("");
  console.log(`  ${bold("CSS Studio")}`);
  console.log(`  ${dim("Installing MCP server and skill")}`);
  console.log("");
  let usedAddMcp = false;
  try {
    execSync("npx -y add-mcp cssstudio --name css-studio -y", {
      cwd: root,
      stdio: "pipe",
      timeout: 3e4
    });
    usedAddMcp = true;
  } catch {
    writeMcpConfig(join(root, ".mcp.json"));
  }
  console.log(`  ${green("\u2713")} MCP server`);
  if (usedAddMcp) {
    console.log(`    ${dim("Configured for all detected agents")}`);
  } else {
    console.log(`    ${dim(".mcp.json")}`);
  }
  console.log("");
  const installed = [];
  for (const target of SKILL_TARGETS) {
    const agentDir = target.path.split("/")[0];
    if (target.always || existsSync(join(root, agentDir))) {
      writeFile(join(root, target.path), SKILL_CONTENT);
      installed.push(target.path);
    }
  }
  console.log(`  ${green("\u2713")} Skill file${installed.length > 1 ? "s" : ""}`);
  for (const p of installed) {
    console.log(`    ${dim(p)}`);
  }
  console.log("");
  console.log(`  ${dim("Add to your app's entry point:")}`);
  console.log("");
  console.log(`    ${cyan('import { startStudio } from "cssstudio"')}`);
  console.log(`    ${cyan("startStudio()")}`);
  console.log("");
  console.log(`  ${dim("Then run")} ${yellow("/studio")} ${dim("in your agent to start editing.")}`);
  console.log("");
}

// src/cli.ts
var command = process.argv[2];
if (command === "install") {
  install();
} else {
  startServer();
}
//# sourceMappingURL=cli.mjs.map
