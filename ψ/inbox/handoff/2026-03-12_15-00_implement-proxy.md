# Handoff: Proxy Study Complete → Implement Proxy Support

**Date**: 2026-03-12 15:00
**Context**: 35%

## What We Did
- Deep studied proxy rotation patterns (types, strategies, providers, pricing)
- Studied chrome.proxy API for MV3 extensions (auth, PAC scripts, limitations)
- Studied anti-detection / fingerprinting (what matters vs theoretical)
- Analyzed current extension architecture for proxy integration points
- Created comprehensive learning: `ψ/memory/learnings/2026-03-12_proxy-rotation-chrome-extension.md`
- Identified cheapest path: Webshare free tier → IPRoyal pay-as-you-go

## Key Findings
- **Strategy**: Residential sticky sessions, rotate IP per account (not per request)
- **chrome.proxy**: Works in MV3, needs `proxy` + `webRequest` + `webRequestAuthProvider` permissions
- **Auth**: Use `chrome.webRequest.onAuthRequired` with `asyncBlocking` callback
- **Limitation**: Proxy is global (not per-tab), but fine for sequential batch flow
- **Anti-detection**: For EXE Portal, just need proxy + WebRTC leak prevention (no fingerprint spoofing needed)
- **Cost**: $0.002-0.014 per account with residential proxies

## Next Session: Implementation

### Phase 1: Proxy Infrastructure (do first)
1. Add new files:
   - `src/lib/proxy.ts` — proxy list management, parse `host:port:user:pass` format
   - `src/background/messages/proxy-control.ts` — set/clear/rotate/test proxy
2. Update manifest: add `proxy`, `webRequest`, `webRequestAuthProvider` permissions
3. Add proxy auth listener in `src/background/index.ts`

### Phase 2: Batch Integration
4. Modify `batch-control.ts` — call `proxy-control.setProxy(index)` before each account
5. Add 2s stabilization delay after proxy switch
6. Call `proxy-control.clearProxy()` after batch completes

### Phase 3: UI
7. Add proxy settings section in `popup.tsx`:
   - Textarea for proxy list (host:port:user:pass)
   - Enable/disable toggle
   - Test button (shows current IP)
   - Provider format presets (Webshare, IPRoyal, BrightData)

### Phase 4: Testing
8. Test with Webshare free proxies (10 IPs)
9. Test batch of 10 accounts with proxy rotation
10. Verify no WebRTC leak with `chrome.privacy.network.webRTCIPHandlingPolicy`

## Key Files
- Learning doc: `ψ/memory/learnings/2026-03-12_proxy-rotation-chrome-extension.md`
- Extension source: `ψ/lab/exe-register/extension/src/`
- Background: `src/background/index.ts` (empty — Plasmo auto-registers handlers)
- Batch: `src/background/messages/batch-control.ts`
- Popup: `src/popup/index.tsx`
- Overlay: `src/contents/exe-overlay.tsx`
