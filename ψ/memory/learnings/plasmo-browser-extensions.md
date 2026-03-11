# Plasmo Framework -- Browser Extension SDK

**Source**: https://github.com/PlasmoHQ/plasmo
**Studied**: 2026-03-10

Plasmo is a battery-included browser extension framework -- "Next.js for browser extensions." It provides file-based routing, auto-generated manifests, React/TypeScript first-class support, live reload with HMR, and a Shadow DOM-based Content Script UI (CSUI) system.

## Framework Architecture

Plasmo is a monorepo built on Parcel (bundler), pnpm workspaces, and Turborepo:

```
cli/plasmo/          -- The CLI (init, dev, build, package commands)
core/                -- Parcel plugins (bundler, transformers, resolvers, runtime)
api/                 -- Published packages: messaging, storage, persistent, selector
packages/            -- Internal: config, constants, framework-shared, init templates
```

**Build pipeline**: CLI commands -> ManifestFactory (reads source files, generates manifest.json) -> Parcel bundler (transforms, bundles, packages) -> output to `build/{browser}-{mv}-{env}/`.

The ManifestFactory is the core abstraction. It:
1. Scans project files for entry points (popup, options, background, content scripts, tabs, sandboxes, sidepanel, devtools, newtab)
2. Parses `PlasmoCSConfig` from content script source via TypeScript AST
3. Auto-generates manifest.json with correct permissions, content scripts, and background config
4. Scaffolds mount templates for React/Svelte/Vue components
5. Supports both MV2 (`PlasmoExtensionManifestMV2`) and MV3 (`PlasmoExtensionManifestMV3`)

## File Conventions (Entry Points)

Plasmo uses file-based routing. Place files at the project root or in a `src/` directory:

| File | Purpose |
|---|---|
| `popup.tsx` | Extension popup (browser action) |
| `options.tsx` | Options/settings page |
| `background.ts` | Background service worker (MV3) or script (MV2) |
| `content.ts` / `content.tsx` | Content script (plain or CSUI) |
| `newtab.tsx` | Override new tab page |
| `devtools.tsx` | DevTools panel |
| `sidepanel.tsx` | Side panel (Chrome 114+) |
| `sandbox.tsx` | Sandboxed page |

Multiple content scripts go in `contents/` directory. Multiple tab pages go in `tabs/`. Browser-specific files use sub-extensions: `popup.chrome.tsx`, `content.firefox.ts`.

## Content Script UI (CSUI)

The killer feature. Export a React component from a `.tsx` content script and Plasmo auto-mounts it into web pages inside a Shadow DOM (`<plasmo-csui>` element), isolating styles.

### Basic CSUI

```tsx
// content.tsx
export default function MyOverlay() {
  return <div>Hello from extension!</div>
}
```

This renders as an overlay on `document.documentElement`.

### Inline Anchoring

Attach your UI next to specific elements on the page:

```tsx
// content.tsx
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://example.com/*"]
}

// Mount next to a specific element
export const getInlineAnchor: PlasmoGetInlineAnchor = () =>
  document.querySelector("#target-element")

// Or with insert position control
export const getInlineAnchor: PlasmoGetInlineAnchor = () => ({
  element: document.querySelector("#target"),
  insertPosition: "afterend"  // "beforebegin" | "afterbegin" | "beforeend" | "afterend"
})

export default function InlineWidget({ anchor }) {
  return <div>Injected next to {anchor.element.tagName}</div>
}
```

### Multiple Anchors

```tsx
export const getInlineAnchorList: PlasmoGetInlineAnchorList = () =>
  document.querySelectorAll(".target-class")
```

### Overlay Anchoring

Position UI floating over specific elements:

```tsx
export const getOverlayAnchor: PlasmoGetOverlayAnchor = () =>
  document.querySelector("#overlay-target")
```

### CSUI Lifecycle Exports

All optional named exports that control CSUI behavior:

| Export | Purpose |
|---|---|
| `getInlineAnchor` | Single inline mount point |
| `getInlineAnchorList` | Multiple inline mount points |
| `getOverlayAnchor` | Single overlay mount point |
| `getOverlayAnchorList` | Multiple overlay mount points |
| `getStyle` | Custom `<style>` element for Shadow DOM |
| `getShadowHostId` | Custom ID for the `<plasmo-csui>` element |
| `getRootContainer` | Override the default Shadow DOM container |
| `createShadowRoot` | Customize shadow root creation |
| `mountShadowHost` | Control where shadow host is inserted in DOM |
| `render` | Full custom render control |
| `watch` | Custom observer/re-render logic |
| `watchOverlayAnchor` | Watch for overlay anchor position changes |

### Content Script Config

```tsx
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.google.com/*"],
  css: ["./styles.css"],
  world: "MAIN",           // Run in page's main world (not isolated)
  run_at: "document_idle",
  all_frames: true
}
```

The framework parses this `config` export at build time using TypeScript AST to generate the manifest's `content_scripts` entries.

## Messaging API

Install: `pnpm add @plasmohq/messaging`

### Message Handlers (request/response pattern)

Create handler files in `background/messages/`:

```ts
// background/messages/get-data.ts
import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const data = await fetchSomething(req.body.query)
  res.send({ data })
}

export default handler
```

Plasmo auto-generates a switch-case router in the background script that dispatches by message name (derived from filename).

### Sending Messages

```tsx
// From content script or popup
import { sendToBackground } from "@plasmohq/messaging"

const response = await sendToBackground({
  name: "get-data",
  body: { query: "hello" }
})
```

```tsx
// From background to content script
import { sendToContentScript } from "@plasmohq/messaging"

await sendToContentScript({
  name: "update-ui",
  body: { visible: true }
})
```

### Port Handlers (persistent connections)

Create handler files in `background/ports/`:

```ts
// background/ports/live-feed.ts
import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.PortHandler = async (req, res) => {
  res.send({ update: "new data" })
}

export default handler
```

### React Hooks

```tsx
import { usePort, useMessage } from "@plasmohq/messaging/hook"

// Persistent port connection
const { data, send } = usePort("live-feed")

// One-shot message listener
const { data } = useMessage((req, res) => {
  res.send({ received: true })
})
```

### Relay (Main World <-> Background)

For content scripts running in `world: "MAIN"`, use relay to communicate with background:

```tsx
import { relayMessage } from "@plasmohq/messaging"

// In content script (MAIN world) -- relays through isolated world to background
relayMessage({ name: "get-data", body: { key: "value" } })
```

## Manifest Override

Override or extend the auto-generated manifest via `package.json`:

```json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "1.0.0",
  "manifest": {
    "permissions": ["tabs", "activeTab"],
    "host_permissions": ["https://*.example.com/*"],
    "web_accessible_resources": [{
      "resources": ["assets/*"],
      "matches": ["<all_urls>"]
    }],
    "overrides": {
      "firefox": {
        "permissions": ["geckoSpecificPerm"]
      }
    }
  }
}
```

Key details:
- `displayName` in package.json becomes the extension name (prefixed with "DEV | " in development)
- `@plasmohq/storage` dependency auto-adds `"storage"` permission
- Browser-specific settings via `browser_specific_settings` or `overrides.{browser}`
- `version`, `author`, `description`, `homepage` pulled from package.json

## Persistent Background (MV3 workaround)

MV3 service workers get killed after 30s of inactivity. Use the persistent API:

```ts
// background.ts
import { keepAlive } from "@plasmohq/persistent/background"
keepAlive()
```

## Build Targets

```bash
plasmo build                          # Default: chrome-mv3
plasmo build --target=firefox-mv2
plasmo build --target=chrome-mv3

# Output goes to build/{target}-{dev|prod}/
```

Browser targeting also works at file level: `popup.firefox.tsx` only included for Firefox builds.

## Practical Patterns

### Project Setup

```bash
pnpm create plasmo my-extension
cd my-extension
pnpm dev          # Dev with HMR, load build/chrome-mv3-dev in chrome://extensions
pnpm build        # Production build
pnpm package      # Zip for store submission
```

### Popup with Styling

```tsx
// popup.tsx
function IndexPopup() {
  return (
    <div style={{ padding: 16, minWidth: 300 }}>
      <h1>My Extension</h1>
      <button onClick={() => chrome.tabs.create({ url: "https://example.com" })}>
        Open Example
      </button>
    </div>
  )
}

export default IndexPopup
```

### Content Script with CSS Isolation

```tsx
// contents/sidebar.tsx
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.example.com/*"]
}

// Inject styles into the Shadow DOM
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .sidebar { position: fixed; right: 0; top: 0; width: 300px; }
  `
  return style
}

export default function Sidebar() {
  return <div className="sidebar">Extension Sidebar</div>
}
```

### Directory Organization (Recommended)

```
src/
  popup/
    index.tsx
    components/
  options/
    index.tsx
  contents/
    overlay.tsx
    inline-widget.tsx
  background/
    index.ts
    messages/
      get-data.ts
      save-data.ts
    ports/
      live-feed.ts
  tabs/
    dashboard.tsx
  assets/
    icon.png
```

## Key Takeaways

1. **File = feature**: Drop a `popup.tsx` and you have a popup. Drop a `content.tsx` and you have a content script. No manifest editing needed.
2. **CSUI is the differentiator**: Shadow DOM isolation + React rendering + MutationObserver-based auto-mounting makes injecting UI into web pages trivially easy.
3. **Messaging is file-routed**: Create `background/messages/foo.ts` and call `sendToBackground({ name: "foo" })`. The framework auto-generates the dispatch logic.
4. **Manifest is declarative**: Everything is derived from your source files and package.json. The `config` export in content scripts maps directly to manifest `content_scripts` entries.
5. **Multi-browser**: Same codebase, different targets. Use sub-extensions (`.chrome.tsx`, `.firefox.ts`) for browser-specific code paths.
6. **Parcel under the hood**: HMR, tree-shaking, code splitting all come from Parcel. The `core/` directory contains custom Parcel plugins for extension-specific transforms.
