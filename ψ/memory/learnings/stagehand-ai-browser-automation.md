# Stagehand: AI Browser Automation Framework

**What it is**: Stagehand (`@browserbasehq/stagehand`) is a TypeScript framework by Browserbase that bridges natural language AI and code-level browser control. It wraps a CDP-based browser engine with LLM-powered `act()`, `extract()`, `observe()`, and `agent()` methods, letting you choose when to use AI versus deterministic code.

**Source**: https://github.com/browserbase/stagehand (studied from local clone)

---

## Architecture Overview

```
Stagehand (V3 class)
├── Understudy Engine (CDP)     — custom Chrome DevTools Protocol layer (not Playwright)
│   ├── V3Context               — manages browser contexts, pages, frames
│   ├── Page                    — CDP-based page with Playwright-compatible API
│   ├── Locator / DeepLocator   — element targeting across shadow DOM + iframes
│   └── A11y Snapshot           — captures accessibility tree for LLM consumption
├── Handlers
│   ├── ActHandler              — executes single actions via LLM + a11y tree
│   ├── ExtractHandler          — extracts structured data via LLM + Zod schemas
│   ├── ObserveHandler          — plans actions before executing (returns candidates)
│   ├── V3AgentHandler          — multi-step DOM-based agent
│   └── V3CuaAgentHandler       — computer-use agent (screenshot-based)
├── LLM Provider Layer
│   ├── OpenAI, Anthropic, Google, Groq, Cerebras clients
│   └── AI SDK integration for custom providers
├── Cache Layer
│   ├── ActCache                — caches act() results by instruction + URL hash
│   └── AgentCache              — caches multi-step agent workflows
└── Launch
    ├── Local Chrome (chrome-launcher + CDP WebSocket)
    └── Browserbase (cloud browser)
```

Key insight: Stagehand does NOT use Playwright internally. It has its own CDP engine called "Understudy" that provides a Playwright-compatible Page API. However, you can connect it to an existing Playwright browser via CDP.

---

## Core APIs

### Initialization

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

const stagehand = new Stagehand({
  env: "LOCAL",           // "LOCAL" or "BROWSERBASE"
  model: "openai/gpt-4.1-mini",  // provider/model format
  verbose: 2,             // 0=silent, 1=normal, 2=debug
  headless: false,        // show browser (LOCAL only)
  cacheDir: "./cache",    // enable action caching
});
await stagehand.init();
const page = stagehand.context.pages()[0];
```

### act() — Execute a Single Action

Takes a natural language instruction, uses LLM to find the right element in the a11y tree, then performs the action via CDP.

```typescript
// Natural language instruction
await stagehand.act("click the sign in button");
await stagehand.act("type 'hello world' into the search input");

// Target a specific page in multi-page workflows
await stagehand.act("click submit", { page: page2 });

// With timeout
await stagehand.act("click the dropdown", { timeout: 30_000 });
```

Rules for act():
- Keep instructions **atomic and specific** (one action per call)
- Bad: "fill the form and submit" — Good: "type 'John' in the name field"
- Self-healing: if the DOM changes, it re-evaluates

### extract() — Get Structured Data

Uses LLM to read the page's a11y tree and return structured data matching a Zod schema.

```typescript
// Simple extraction (returns { extraction: string })
const { extraction } = await stagehand.extract("get the page title");

// Structured extraction with Zod schema
const data = await stagehand.extract(
  "extract all product listings",
  z.object({
    products: z.array(z.object({
      name: z.string(),
      price: z.string(),
      url: z.string().url(),  // URLs get special handling
    })),
  }),
);

// Extract from specific element via XPath selector
const text = await stagehand.extract(
  "extract the error message",
  z.string(),
  { selector: "/html/body/div[2]/p" },
);
```

### observe() — Plan Before Acting

Returns candidate actions without executing them. Useful for caching and avoiding race conditions.

```typescript
// Get candidate actions
const actions = await stagehand.observe("find the login button");
// actions = [{ selector: "...", description: "...", method: "click" }]

// Execute the best candidate
await stagehand.act(actions[0]);
```

The **observe + act pattern** is recommended for reliability — it separates planning from execution so DOM changes between steps don't break things.

### agent() — Multi-Step Autonomous Tasks

For complex workflows that require multiple steps. Three modes:

```typescript
// DOM mode (default) — uses act/extract tools
const agent = stagehand.agent({
  model: "google/gemini-2.0-flash",
});
const result = await agent.execute({
  instruction: "Search for NVDA stock price on Google",
  maxSteps: 20,
});

// CUA mode — screenshot-based computer use
const cuaAgent = stagehand.agent({
  mode: "cua",
  model: "anthropic/claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful browser assistant.",
});
await cuaAgent.execute({
  instruction: "Fill out the job application form",
  maxSteps: 30,
});

// Hybrid mode — DOM + coordinate-based (experimental)
const hybridAgent = stagehand.agent({
  mode: "hybrid",
  model: "google/gemini-3-flash-preview",
});
```

---

## Key Patterns for Web Automation

### 1. Observe-Then-Act (Recommended)

```typescript
const instruction = "click the checkout button";
const actions = await stagehand.observe(instruction);
if (actions.length > 0) {
  await stagehand.act(actions[0]);
}
```

Why: Separates LLM inference from DOM mutation. The observe result is a stable reference.

### 2. Action Caching (Self-Healing)

Enable `cacheDir` to cache act() results. On repeat runs:
- Same instruction + same page URL = replay without LLM call
- If cached selector breaks (DOM changed), automatically falls back to LLM

```typescript
const stagehand = new Stagehand({
  env: "LOCAL",
  cacheDir: "stagehand-cache",  // enables caching
});
```

### 3. Multi-Page Workflows

```typescript
const page1 = stagehand.context.pages()[0];
await page1.goto("https://site-a.com");

const page2 = await stagehand.context.newPage();
await page2.goto("https://site-b.com");

// Default: operates on active page
// Pass { page } to target specific page
await stagehand.act("click button", { page: page1 });
await stagehand.extract("get data", { page: page2 });
```

### 4. DeepLocator for Shadow DOM / Iframes

```typescript
// XPath that pierces through iframes and shadow DOM
await page.deepLocator("/html/body/div/iframe/html/body/button").highlight({
  durationMs: 3000,
});
```

### 5. Model Selection Strategy

- **Fast/cheap**: `openai/gpt-4.1-mini`, `google/gemini-2.0-flash`
- **Accurate**: `openai/gpt-5`, `anthropic/claude-sonnet-4-20250514`
- **CUA mode**: `anthropic/claude-sonnet-4-20250514`, `google/gemini-2.5-computer-use-preview-10-2025`
- **Hybrid mode**: `google/gemini-3-flash-preview`

Default model: `openai/gpt-4.1-mini`

---

## Integrating with Existing Playwright Code

Stagehand's Page API is intentionally Playwright-compatible, so you can mix deterministic Playwright-style code with AI-powered actions:

```typescript
const page = stagehand.context.pages()[0];

// Standard Playwright-style navigation (deterministic)
await page.goto("https://example.com");
await page.waitForLoadState("load");

// AI-powered action (when selectors are fragile or unknown)
await stagehand.act("click the Accept Cookies button");

// Back to deterministic code
await page.locator("#search-input").fill("query");

// AI extraction when structure is complex
const data = await stagehand.extract("get the search results", z.object({
  results: z.array(z.object({
    title: z.string(),
    link: z.string().url(),
  })),
}));
```

The key integration point: use deterministic code (goto, locator, fill) for stable parts of the page, and use AI (act, extract, observe) for parts that are dynamic, complex, or likely to change.

---

## Practical Tips for Jingjing

1. **Start deterministic, add AI where needed**: Use `page.goto()` and `page.locator()` for known, stable elements. Use `stagehand.act()` for buttons/elements that change between deploys or are hard to select.

2. **Use observe() for debugging**: Call `observe()` to see what the LLM "sees" on the page before acting. Great for understanding why an action fails.

3. **Zod schemas are your contract**: Well-described Zod schemas with `.describe()` on each field dramatically improve extraction accuracy. The LLM uses the descriptions to understand what to look for.

4. **Cache for speed**: Enable `cacheDir` in production automations. First run uses LLM, subsequent runs replay cached selectors — zero latency, zero tokens. Self-heals when the site changes.

5. **Atomic instructions win**: "Click the blue Submit button in the payment section" is better than "Submit the form". Be specific about which element.

6. **agent() for exploration, act() for production**: Use `agent()` to figure out a workflow interactively. Once you know the steps, rewrite as a sequence of `act()` + `extract()` calls for reliability and caching.

7. **Environment variables**: Models use `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` etc. Browserbase uses `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`.

8. **Always close**: Use try/finally with `await stagehand.close()` to clean up Chrome processes.

---

*Learned: 2026-03-10*
*Source: github.com/browserbase/stagehand (monorepo, packages/core)*
