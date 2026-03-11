# MCP Chrome — Browser Control via AI

**Source**: github.com/hangwin/mcp-chrome (studied 2026-03-10)

MCP Chrome is a Chrome extension + native server that exposes your real browser to AI assistants via the Model Context Protocol. Unlike Playwright, it uses your existing Chrome with all login sessions, cookies, and settings intact.

## Architecture

```
AI Client (Claude/Codex/etc)
  |  MCP protocol (Streamable HTTP or stdio)
  v
Native Server (Fastify + MCP SDK, port 12306)
  |  Chrome Native Messaging
  v
Chrome Extension (background script, content scripts, offscreen docs)
  |  Chrome APIs + CDP
  v
Browser tabs, pages, network, DOM
```

Three layers:
1. **Native Server** (`app/native-server/`) — Fastify HTTP server that implements MCP protocol and bridges to the extension via Chrome Native Messaging. Installed globally as `mcp-chrome-bridge`.
2. **Chrome Extension** (`app/chrome-extension/`) — Built with WXT + Vue 3. Runs background script as orchestrator, content scripts for page interaction, offscreen documents for AI model processing (embeddings).
3. **Shared Packages** (`packages/shared/`) — Tool schemas, types. `packages/wasm-simd/` provides Rust SIMD-optimized vector math for semantic search.

## Available Tools (20+)

### Browser Management
- `get_windows_and_tabs` — list all windows/tabs
- `chrome_navigate` — go to URL, control viewport size, open in new window/tab
- `chrome_switch_tab` — activate a specific tab
- `chrome_close_tabs` — close tabs/windows by ID
- `chrome_go_back_or_forward` — browser history navigation

### Content & Reading
- `chrome_read_page` — accessibility tree with stable `ref_*` identifiers for element targeting
- `chrome_get_web_content` — extract HTML or text, optionally by CSS selector
- `search_tabs_content` — semantic search across all open tabs using vector embeddings (BGE-small-en-v1.5)
- `chrome_console` — capture console output

### Interaction
- `chrome_computer` — unified interaction: click, drag, scroll, type, key chords, fill, hover, wait, screenshot. Supports both `ref` (from read_page) and coordinate targeting
- `chrome_click_element` — click by ref, CSS selector, or coordinates
- `chrome_fill_or_select` — fill form fields / select dropdowns
- `chrome_keyboard` — key combos (Ctrl+C, Enter, etc)

### Network
- `chrome_network_capture_start/stop` — capture requests via webRequest API
- `chrome_network_debugger_start/stop` — capture with response bodies via CDP Debugger
- `chrome_network_request` — send arbitrary HTTP requests

### Data
- `chrome_history` — search browsing history with time filters
- `chrome_bookmark_search/add/delete` — bookmark management

### Advanced
- `chrome_screenshot` — full-page, element, or viewport capture with base64 output
- `chrome_inject_script` — inject custom JS into pages
- `chrome_javascript` — execute JS
- `chrome_handle_dialog` — handle alert/confirm/prompt dialogs
- `chrome_handle_download` — manage downloads
- `chrome_gif_recorder` — record GIFs
- `performance_start/stop_trace` + `performance_analyze_insight` — Chrome performance profiling

### Visual Editor (for Claude Code / Codex)
- Toggle with Cmd+Shift+O or right-click context menu
- Drag edges to resize elements, visual CSS property inspector
- Live React/Vue component state debugging
- Point-click-prompt: select element, tell AI what to change

## Setup for Claude Code

1. Install bridge: `npm install -g mcp-chrome-bridge`
2. Load extension in Chrome (developer mode, load unpacked)
3. Click extension icon, click Connect
4. Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chrome-mcp": {
      "url": "http://127.0.0.1:12306/mcp"
    }
  }
}
```

Or stdio alternative:
```json
{
  "mcpServers": {
    "chrome-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js"]
    }
  }
}
```

## Key Patterns for Oracle Use

### Web Scraping with Login State
No need to handle authentication — uses your actual browser sessions. Ask AI to navigate and extract content from sites you're already logged into (GitHub, Notion, etc).

### Workflow: Navigate + Read + Act
```
1. chrome_navigate → go to page
2. chrome_read_page → get accessibility tree with ref IDs
3. chrome_click_element / chrome_fill_or_select → interact using refs
4. chrome_get_web_content → extract results
```

### Network Sniffing
Start debugger capture, perform actions, stop capture — get full request/response data including bodies. Useful for reverse-engineering APIs.

### Semantic Tab Search
`search_tabs_content` uses embedded vector search (HNSW algorithm via hnswlib-wasm) to find relevant content across all open tabs. No exact keyword match needed.

### Screenshot-Driven Interaction
Take screenshot, AI analyzes it, then uses coordinates or refs to click. The `chrome_computer` tool auto-scales coordinates from screenshot space to viewport space.

## Practical Tips

- Default port is 12306. If conflicting, change in extension settings and update config.
- Run `mcp-chrome-bridge doctor` to diagnose connection issues.
- The extension must be connected (green indicator in popup) for tools to work.
- `chrome_read_page` returns `ref_*` identifiers that are more reliable than CSS selectors for clicking.
- Use `background: true` on navigate/screenshot to avoid stealing focus from your current tab.
- Network debugger capture (`chrome_network_debugger_start`) gives response bodies; the webRequest variant does not.
- Semantic search loads AI models lazily — first search may be slow.
- The visual editor (Cmd+Shift+O) is excellent for UI tweaking workflows where Claude Code suggests CSS changes and you see them live.

## vs Playwright MCP

| Aspect | mcp-chrome | Playwright MCP |
|--------|-----------|----------------|
| Browser | Your real Chrome | Fresh isolated instance |
| Login state | Reused | Must re-authenticate |
| Setup | Extension + bridge | Playwright install |
| Performance | Faster (no process spawn) | 50-200ms IPC overhead |
| Testing | Not designed for CI | CI-friendly |
| Use case | Daily assistant, personal automation | Testing, scraping at scale |

**Bottom line**: Use mcp-chrome when you want AI to help with your actual browsing (logged-in sites, personal bookmarks, real tabs). Use Playwright MCP for repeatable test automation and CI pipelines.
