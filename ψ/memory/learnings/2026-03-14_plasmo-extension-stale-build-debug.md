# Plasmo Extension: Stale Build Causes Silent Failures

**Date**: 2026-03-14
**Source**: EXE Auto Register debugging session
**Tags**: plasmo, chrome-extension, debugging, build

## Pattern

When a Plasmo Chrome extension fails with unexpected errors (wrong HTTP status, missing routes), the **first thing to check** is whether the build output matches the source:

```bash
stat -f "%Sm" src/lib/makeloops-email.ts   # source: Mar 13
stat -f "%Sm" build/chrome-mv3-prod/        # build:  Mar 12  ← STALE!
```

## Why It Happens

- `plasmo build` is a manual step — no file watcher in production builds
- Chrome loads from `build/chrome-mv3-prod/` directory
- Editing source files does NOT update the build
- Reloading at `chrome://extensions` only reloads the built files, not source

## Fix

```bash
cd extension && npm run build   # rebuild
# Then reload at chrome://extensions
# Then close and reopen the target tab
```

## Debug Order for Extensions

1. **Build freshness** — is build newer than source?
2. **API reachability** — does the endpoint respond at all?
3. **Auth** — is the API key correct?
4. **Code logic** — is the implementation right?
