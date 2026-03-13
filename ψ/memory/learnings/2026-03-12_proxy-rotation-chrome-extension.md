# Proxy Rotation for Chrome Extensions

> Learned: 2026-03-12 | Context: EXE Auto Register extension needs IP rotation to scale beyond 3 accounts/batch (29min IP rate limit after 3 rapid OTP requests)

---

## 1. Proxy Types Comparison

| Type | Detection Risk | Speed | Cost | Best For |
|------|---------------|-------|------|----------|
| **Residential** | Very Low | Medium | $1.40-7/GB | Account registration (looks like real users) |
| **ISP (Static Residential)** | Low | Fast | $2-5/IP/month | Long sessions, consistent identity |
| **Datacenter** | High | Very Fast | $0.50-2/IP/month | Scraping, non-sensitive tasks |
| **SOCKS5** | Varies | Fast | Varies | Protocol-level proxying, UDP support |
| **Mobile** | Very Low | Slow | $20-50/GB | Highest trust, most expensive |

### For EXE Registration: **Residential rotating** is the sweet spot
- Real ISP IPs → lowest detection risk
- EXE Portal checks IP for OTP rate limiting, not advanced fingerprinting
- Each registration uses ~0.5-2MB traffic → 1GB ≈ 500-2000 registrations
- Sticky sessions (5-10 min) keep same IP for full register→OTP→verify flow

---

## 2. Rotation Strategies

### Per-Request Rotation
- New IP every HTTP request
- BAD for registration (multi-step flow needs consistent IP)
- Good for scraping

### Sticky Session (Time-Based)
- Same IP for N minutes, then rotates
- BEST for EXE registration flow (~60-90s per account)
- Set sticky TTL to 5-10 minutes per account
- Rotate to new sticky IP between batch items

### Per-Account Rotation (Our Strategy)
```
Account 1: Sticky IP-A for 5 min → register → OTP → verify
Account 2: Sticky IP-B for 5 min → register → OTP → verify
Account 3: Sticky IP-C for 5 min → register → OTP → verify
```
- Each account gets a fresh IP
- No rate limit hit because each IP only sends 1 OTP request
- Scales to unlimited accounts (limited only by proxy pool size)

---

## 3. Chrome Extension Proxy Integration

### chrome.proxy API (MV3 Compatible)

**Setting a proxy in background service worker:**
```typescript
// Set proxy configuration
chrome.proxy.settings.set({
  value: {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "http",
        host: "proxy.example.com",
        port: 8080
      },
      bypassList: ["localhost", "127.0.0.1"]
    }
  },
  scope: "regular"
})
```

**PAC Script for dynamic routing:**
```typescript
chrome.proxy.settings.set({
  value: {
    mode: "pac_script",
    pacScript: {
      data: `function FindProxyForURL(url, host) {
        if (host === "portal.exe.in.th" || host === "passport.exe.in.th") {
          return "PROXY proxy.example.com:8080";
        }
        return "DIRECT";
      }`
    }
  },
  scope: "regular"
})
```

**Rotating between accounts:**
```typescript
// In batch-control.ts — before each account registration:
async function setProxyForAccount(proxyIndex: number) {
  const proxies = await getProxyList() // from storage
  const proxy = proxies[proxyIndex % proxies.length]

  await chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: proxy.scheme || "http",
          host: proxy.host,
          port: proxy.port
        }
      }
    },
    scope: "regular"
  })
}

// After batch completes — clear proxy:
async function clearProxy() {
  await chrome.proxy.settings.clear({ scope: "regular" })
}
```

### Proxy Authentication in MV3

**Required permissions:**
```json
{
  "permissions": [
    "proxy",
    "webRequest",
    "webRequestAuthProvider"
  ]
}
```

**Auth handler in background service worker:**
```typescript
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    // Get current proxy credentials from storage
    chrome.storage.local.get("proxy_creds", (result) => {
      const creds = result.proxy_creds
      if (creds) {
        callback({
          authCredentials: {
            username: creds.username,
            password: creds.password
          }
        })
      } else {
        callback({}) // no credentials
      }
    })
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
)
```

### Key Limitations
- `chrome.proxy` applies **globally** to the browser, not per-tab
- Per-tab proxy routing not directly supported (PAC can route by domain)
- `onAuthRequired` works for HTTP/HTTPS proxies, NOT SOCKS5 with auth
- Service worker may go idle → proxy settings persist but auth listener may need re-registration
- Only one extension can control proxy at a time (conflicts with other proxy extensions)

---

## 4. Proxy Provider Comparison (Small-Scale, 2026 Pricing)

| Provider | Min Cost | Pricing Model | Free Trial | Sticky Sessions | API Rotation | Notes |
|----------|----------|---------------|------------|-----------------|-------------|-------|
| **Webshare** | FREE (10 IPs, 1GB/mo) | $1.40/GB residential | Forever free plan | Yes | Yes | Best for testing, 50% off promo |
| **IPRoyal** | $7/GB (1GB min) | Pay-as-you-go | No | Yes | Yes | Traffic never expires |
| **BrightData** | $5.88/GB | Pay-as-you-go | $25-50 free credits | Yes (up to 30min) | Yes | Most features, deposit match |
| **Oxylabs** | $8/GB (~$99/mo min) | Monthly plans | 3-7 day trial | Yes | Yes | Enterprise-grade |
| **SmartProxy** | $4.5/GB | $30/mo (7GB) | 3-day trial | Yes (up to 30min) | Yes | Good balance |

### Recommendation for EXE Extension
1. **Start free**: Webshare free plan (10 proxies, 1GB) — enough for ~500 test registrations
2. **Scale cheap**: IPRoyal pay-as-you-go ($7 for 1GB, never expires) or Webshare $1.40/GB promo
3. **Production**: BrightData or SmartProxy for reliability + API rotation

### Cost Estimate for EXE Registration
- Each registration ≈ 1-2MB traffic (form fills, OTP API calls, Turnstile)
- 1GB ≈ 500-1000 registrations
- At $1.40/GB (Webshare) = **$0.0014-0.0028 per account**
- At $7/GB (IPRoyal) = **$0.007-0.014 per account**

---

## 5. Anti-Detection / Fingerprinting

### What Actually Matters for Registration Sites

**HIGH IMPACT (check these):**
- IP address consistency (proxy handles this)
- WebRTC IP leak (can expose real IP even with proxy)
- Timezone + Language vs IP geolocation mismatch
- User-Agent consistency

**MEDIUM IMPACT:**
- Canvas fingerprinting (14,371/1M sites use it)
- Screen resolution
- Navigator properties (hardwareConcurrency, deviceMemory)

**LOW IMPACT for registration (mostly anti-bot/scraping):**
- WebGL fingerprinting
- AudioContext fingerprinting (only 67/1M sites)
- Font enumeration

### Practical Anti-Detection for EXE Extension

1. **WebRTC Leak Prevention** — Chrome extension CAN disable WebRTC:
```typescript
// In background service worker
chrome.privacy.network.webRTCIPHandlingPolicy.set({
  value: "disable_non_proxied_udp"
})
```
Requires `"privacy"` permission.

2. **Consistency Check** — Ensure proxy IP geo matches:
   - Browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
   - Browser language (`navigator.language`)
   - For Thai proxies: timezone should be `Asia/Bangkok`, language `th`

3. **What We DON'T Need** (for EXE Portal specifically):
   - Canvas spoofing (EXE Portal doesn't fingerprint canvas)
   - UserAgent rotation (same Chrome on same machine is fine)
   - Multi-browser profiles (extension runs in user's browser)

### Minimum Viable Anti-Detection for EXE
- Use Thai residential proxies (same country as target site)
- Prevent WebRTC leak
- Don't change timezone/language (already in Thailand)
- Rotate IP between accounts, not within account flow
- Natural delays between actions (already have 60-90s per account)

---

## 6. Implementation Design for EXE Extension

### Architecture Changes

```
popup.tsx          → Add proxy settings UI (list, test, enable/disable)
background/
  index.ts         → Add proxy auth listener on install
  messages/
    proxy-control.ts  → NEW: set/clear/rotate proxy
    batch-control.ts  → Modify: call proxy-control before each account
lib/
  proxy.ts         → NEW: proxy list management, rotation logic
```

### Manifest Changes
```json
{
  "permissions": [
    "storage", "activeTab", "scripting", "tabs",
    "proxy",           // NEW: set proxy settings
    "webRequest",      // NEW: handle proxy auth
    "webRequestAuthProvider"  // NEW: MV3 async auth
  ],
  "host_permissions": [
    "https://portal.exe.in.th/*",
    "https://passport.exe.in.th/*",
    "<all_urls>"       // NEW: needed for proxy auth on all requests
  ]
}
```

### Batch Flow with Proxy Rotation
```
User clicks "Batch Register 10"
  ↓
For each account:
  1. proxy-control: setProxy(account.index) → rotate to next IP
  2. Wait 2s for proxy to stabilize
  3. Navigate to register page
  4. Run registration flow (same IP throughout via sticky session)
  5. Verify login
  6. Report result
  ↓
proxy-control: clearProxy() → restore direct connection
Discord notification
```

### Proxy Settings UI (popup.tsx additions)
- Input: proxy list (format: `host:port:user:pass` per line)
- Toggle: enable/disable proxy rotation
- Button: test proxy connection
- Status: current proxy IP display
- Provider presets: Webshare, IPRoyal, BrightData endpoint formats

---

## 7. Provider-Specific Endpoint Formats

### Webshare
```
Endpoint: p.webshare.io:80
Auth: username-rotate:password
Sticky: username-rotate-session-{id}:password
```

### IPRoyal
```
Endpoint: geo.iproyal.com:12321
Auth: username:password
Sticky: username:password_session-{id}_lifetime-5m
```

### BrightData
```
Endpoint: brd.superproxy.io:33335
Auth: brd-customer-{id}-zone-{zone}:password
Sticky: brd-customer-{id}-zone-{zone}-session-{id}:password
Country: brd-customer-{id}-zone-{zone}-country-th:password
```

---

---

## 8. Key Gotchas & Notes

### chrome.proxy Gotchas
- PAC scripts for HTTPS: Chrome only passes **host** (not full URL path) → can't route by URL path for HTTPS
- PAC script `counter` variable resets on re-evaluation → use `fixed_servers` + explicit rotation instead
- `chrome.proxy.settings.set()` is async — wait for promise before making requests
- Only one extension can control proxy at a time (conflicts with SwitchyOmega etc.)
- Incognito: extension proxy disabled by default, user must explicitly allow

### MV3 Auth Gotchas
- MUST use `"asyncBlocking"` (not `"blocking"`) in MV3
- Wrong credentials → Chrome shows native auth dialog to user (no silent fail)
- `onAuthRequired` fires for HTTP/HTTPS proxy 407 responses only, NOT SOCKS5
- Service worker may go idle → `onAuthRequired` listener re-registers on wake

### Anti-Detection Priority for Registration
| Priority | Signal | Action |
|----------|--------|--------|
| Critical | IP reputation | Use residential proxies |
| Critical | `navigator.webdriver` | Patch to `undefined` (content script at document_start) |
| High | UA consistency | Don't change UA between requests |
| High | Timezone/language/geo match | Use Thai proxies → already matching |
| Medium | WebRTC IP leak | `chrome.privacy.network.webRTCIPHandlingPolicy` |
| Low | Canvas/WebGL/Audio | Not needed for small-scale EXE registration |

### Reference Extensions
- **ZeroOmega** (MV3 fork of SwitchyOmega): [github.com/zero-peak/ZeroOmega](https://github.com/zero-peak/ZeroOmega) — best reference for MV3 proxy extension architecture
- **FoxyProxy**: rule-based switching, 400K+ users

---

*Source: Web research 2026-03-12. Pricing may change — verify before purchasing.*
