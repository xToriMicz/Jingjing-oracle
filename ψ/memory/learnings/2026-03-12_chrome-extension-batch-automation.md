# Chrome Extension Batch Automation — CSUI Lifecycle Patterns

**Date**: 2026-03-12
**Source**: EXE Auto Register extension debugging
**Tags**: plasmo, chrome-extension, csui, batch-automation, page-navigation

## Core Insight

Content Script UI (CSUI) is destroyed when the page navigates to a different origin. Any multi-page automation flow must account for this by:
1. Saving critical state to background/storage BEFORE navigation
2. Using background handlers for actions that span page changes
3. Having each page's CSUI detect its stage and continue the flow independently

## Patterns

### 1. Save Before Navigate
```
Bad:  submit → wait 4s → save → report (CSUI may be dead)
Good: submit → save immediately → report immediately → then wait
```

### 2. Fire-and-Forget for Cross-Page Operations
```
Bad:  const result = await sendToBackground("verify-login")  // never resolves
Good: sendToBackground("verify-login").then(...).catch(()=>{})  // fire and forget
```

### 3. Background Handles Navigation
```
Bad:  CSUI awaits background response → CSUI navigates (dead CSUI can't navigate)
Good: Background completes work → background navigates tab directly
```

### 4. Detect Page Features, Don't Assume
```
Bad:  waitForTurnstile() // 45s timeout on page without Turnstile
Good: hasTurnstile() ? waitForTurnstile() : skipTurnstile()
```

### 5. Every URL Needs a Stage Handler
```
register → portal/member?success → passport/login → member → register
Each page = unique stage with its own handler. "other" catch-all should be passive.
```

### 6. Event-Driven, Not Timer-Driven
```
Bad:  setTimeout(15000, sendDiscord)  // verify might not be done
Good: verify-login completes → checks batch state → sends Discord
```

### 7. Auto-Retry, Not Manual Fallback
```
Bad:  OTP timeout → "enter OTP manually" (user can't access temp email)
Good: OTP timeout → resend OTP → poll again → fail = skip account
```

## EXE Portal Rate Limits (tested 2026-03-12)

| Limit | Value | Scope |
|-------|-------|-------|
| OTP per email | 4 min cooldown | Per email address |
| OTP per IP | ~29 min block after 3 rapid regs | Per IP address |
| OTP verify | No limit | Can retry wrong OTP indefinitely |
| Between registrations | No cooldown | 0 delay works |
| Login Turnstile | Not present | Login page has no CAPTCHA |
