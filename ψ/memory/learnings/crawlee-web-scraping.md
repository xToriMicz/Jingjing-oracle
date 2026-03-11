# Crawlee Web Scraping Framework

Crawlee is Apify's open-source TypeScript framework for reliable web scraping and browser automation. It provides a unified interface across HTTP and headless browser crawling, with built-in anti-detection, autoscaling, request queuing, and persistent storage.

---

## Architecture

### Package Hierarchy

```
crawlee (umbrella)
├── @crawlee/core         — Configuration, Request, Router, storage, sessions, autoscaling
├── @crawlee/basic        — BasicCrawler base class (retry, concurrency, lifecycle)
├── @crawlee/http         — HttpCrawler (got-scraping, streaming, HTTP/2)
├── @crawlee/cheerio      — CheerioCrawler (HTTP + Cheerio DOM parsing)
├── @crawlee/jsdom        — JSDOMCrawler (HTTP + jsdom)
├── @crawlee/browser      — BrowserCrawler base (browser pool, navigation hooks)
├── @crawlee/playwright   — PlaywrightCrawler (Chromium/Firefox/WebKit)
├── @crawlee/puppeteer    — PuppeteerCrawler
├── @crawlee/browser-pool — Browser instance management, fingerprinting
├── @crawlee/memory-storage — Local SQLite-backed storage
├── @crawlee/utils        — URL extraction, sitemap parsing, blocked detection
└── @crawlee/types        — Shared TypeScript interfaces
```

### Crawler Inheritance Chain

```
BasicCrawler
  └── HttpCrawler (adds HTTP client via got-scraping)
        ├── CheerioCrawler (adds Cheerio $ parsing)
        ├── JSDOMCrawler (adds jsdom)
        └── BrowserCrawler (adds browser-pool)
              ├── PlaywrightCrawler
              └── PuppeteerCrawler
```

### Three Core Subsystems

1. **Request Management** — RequestQueue (dynamic, deduped by uniqueKey), RequestList (static), SitemapRequestList
2. **Storage** — Dataset (tabular JSON output), KeyValueStore (arbitrary key-value pairs, screenshots, state)
3. **Scaling** — AutoscaledPool monitors CPU/memory, adjusts concurrency between min (1) and max (200)

---

## Core APIs

### CheerioCrawler (fast HTTP scraping)

```ts
import { CheerioCrawler, Dataset } from 'crawlee';

const crawler = new CheerioCrawler({
    maxRequestRetries: 3,
    maxConcurrency: 20,
    requestHandlerTimeoutSecs: 60,

    async requestHandler({ request, $, enqueueLinks, log, pushData }) {
        const title = $('title').text();
        const items = $('article.product').map((i, el) => ({
            name: $(el).find('h2').text().trim(),
            price: $(el).find('.price').text().trim(),
            url: request.loadedUrl,
        })).get();

        await pushData(items);
        await enqueueLinks({
            globs: ['https://example.com/products/*'],
            label: 'PRODUCT',
        });
    },

    failedRequestHandler({ request, log }, error) {
        log.error(`Failed: ${request.url}`, { error: error.message });
    },
});

await crawler.run(['https://example.com/products']);
```

### PlaywrightCrawler (JS-rendered pages)

```ts
import { PlaywrightCrawler, Dataset } from 'crawlee';

const crawler = new PlaywrightCrawler({
    headless: true,
    maxConcurrency: 5,
    navigationTimeoutSecs: 30,

    async requestHandler({ page, request, enqueueLinks, log }) {
        await page.waitForSelector('.content-loaded');
        const title = await page.title();
        const data = await page.$$eval('.item', els =>
            els.map(el => ({
                text: el.textContent?.trim(),
                href: el.querySelector('a')?.href,
            }))
        );

        await Dataset.pushData({ title, url: request.loadedUrl, data });
        await enqueueLinks({ globs: ['https://example.com/**'] });
    },

    preNavigationHooks: [
        async ({ page }, gotoOptions) => {
            gotoOptions.waitUntil = 'networkidle';
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' });
        },
    ],

    postNavigationHooks: [
        async ({ page, log }) => {
            if (await page.$('#captcha')) {
                log.warning('Captcha detected');
                throw new Error('Blocked by captcha');
            }
        },
    ],
});

await crawler.run(['https://example.com']);
```

### Router Pattern (label-based routing)

```ts
import { CheerioCrawler, createCheerioRouter } from 'crawlee';

const router = createCheerioRouter();

router.addDefaultHandler(async ({ enqueueLinks }) => {
    await enqueueLinks({
        globs: ['https://example.com/category/*'],
        label: 'CATEGORY',
    });
});

router.addHandler('CATEGORY', async ({ $, enqueueLinks }) => {
    await enqueueLinks({
        selector: 'a.product-link',
        label: 'PRODUCT',
    });
});

router.addHandler('PRODUCT', async ({ $, request, pushData }) => {
    await pushData({
        url: request.loadedUrl,
        name: $('h1').text().trim(),
        price: $('.price').text().trim(),
    });
});

const crawler = new CheerioCrawler({ requestHandler: router });
await crawler.run(['https://example.com']);
```

### Request Queue

```ts
import { RequestQueue } from 'crawlee';

const queue = await RequestQueue.open('my-queue');
await queue.addRequest({ url: 'https://example.com/page1' });
await queue.addRequest({
    url: 'https://example.com/priority-page',
    userData: { category: 'important' },
}, { forefront: true });  // prioritize to front of queue

// SitemapRequestList for sitemap-driven crawling
import { SitemapRequestList } from 'crawlee';
const sources = await SitemapRequestList.open({
    sitemapUrls: ['https://example.com/sitemap.xml'],
    globs: ['https://example.com/blog/*'],
});
```

### Dataset and KeyValueStore

```ts
import { Dataset, KeyValueStore } from 'crawlee';

// Push scraped data (stored in ./storage/datasets/default/)
await Dataset.pushData({ title: 'Page', price: '$10' });

// Export results
const dataset = await Dataset.open();
await dataset.exportToCSV('results');
await dataset.exportToJSON('results');

// Key-value store for arbitrary data
const store = await KeyValueStore.open();
await store.setValue('screenshot', buffer, { contentType: 'image/png' });
const state = await store.getValue('crawl-state');
```

---

## Anti-Detection and Stealth

### Built-in (zero config)

- **Browser-like HTTP headers**: `got-scraping` generates realistic Accept, Accept-Language, User-Agent headers
- **HTTP/2 support**: Automatic HTTP/2 for both direct and proxied requests
- **TLS fingerprint replication**: Mimics real browser TLS handshakes
- **Browser fingerprint generation**: `fingerprint-generator` creates consistent navigator, screen, WebGL fingerprints per session
- **Fingerprint injection**: `fingerprint-injector` patches browser APIs (navigator, screen, WebGL) to match generated fingerprints
- **Fingerprint caching**: Fingerprints cached per session/proxy to maintain consistency across requests

### Session Pool (IP + cookie rotation)

```ts
const crawler = new CheerioCrawler({
    useSessionPool: true,  // default: true
    sessionPoolOptions: {
        maxPoolSize: 1000,
        sessionOptions: {
            maxAgeSecs: 3000,        // session lifetime
            maxUsageCount: 50,       // requests per session
            maxErrorScore: 3,        // errors before retirement
            errorScoreDecrement: 0.5 // healing on success
        },
        blockedStatusCodes: [401, 403, 429],
    },
    maxSessionRotations: 10,
    persistCookiesPerSession: true,
});
```

Sessions track: cookies (CookieJar), error scores, usage counts, expiration. A session scoring 3+ errors is retired and replaced.

### Proxy Rotation

```ts
import { ProxyConfiguration } from 'crawlee';

// Simple rotation
const proxyConfig = new ProxyConfiguration({
    proxyUrls: [
        'http://user:pass@proxy1:8080',
        'http://user:pass@proxy2:8080',
    ],
});

// Tiered proxies (auto-escalate on blocks)
const tieredConfig = new ProxyConfiguration({
    tieredProxyUrls: [
        [null],                              // tier 0: no proxy (fastest)
        ['http://user:pass@datacenter:8080'], // tier 1: datacenter
        ['http://user:pass@residential:8080'],// tier 2: residential (most expensive)
    ],
});

// Dynamic proxy function
const dynamicConfig = new ProxyConfiguration({
    newUrlFunction: (sessionId, { request }) => {
        return `http://user-${sessionId}:pass@proxy.example.com:8080`;
    },
});

const crawler = new CheerioCrawler({ proxyConfiguration: proxyConfig });
```

### Block Detection

Crawlee auto-detects blocks via CSS selectors:

```
- Cloudflare Turnstile: #turnstile-wrapper iframe[src*="challenges.cloudflare.com"]
- Google bot check: div#infoDiv0 a[href*="google.com/policies/terms/"]
- Incapsula: iframe[src*="_Incapsula_Resource"]
```

Proxy errors that trigger rotation: `ECONNRESET`, `ECONNREFUSED`, `ERR_PROXY_CONNECTION_FAILED`, `ERR_TUNNEL_CONNECTION_FAILED`.

---

## Error Handling and Retry Logic

### Retry Flow

1. `requestHandler` throws an error
2. Crawlee checks `_canRequestBeRetried()`:
   - `request.noRetry === true` -> no retry
   - `NonRetryableError` -> no retry
   - `SessionError` + max rotations exceeded -> no retry
   - `RetryRequestError` -> always retry (ignores count)
   - Otherwise: retry if `request.retryCount < maxRequestRetries` (default: 3)
3. On retry: increments `retryCount`, reclaims request back to queue
4. On final failure: calls `failedRequestHandler`, marks request as handled

### Request States

```
UNPROCESSED -> BEFORE_NAV -> AFTER_NAV -> REQUEST_HANDLER -> DONE
                                                          -> ERROR_HANDLER -> ERROR
                                                          -> SKIPPED
```

### Error Handler vs Failed Handler

```ts
const crawler = new CheerioCrawler({
    maxRequestRetries: 3,

    // Called on each retry (before giving up)
    errorHandler({ request, session }, error) {
        if (error.message.includes('blocked')) {
            session?.retire();  // force new session
            request.userData.retryStrategy = 'stealth';
        }
    },

    // Called after all retries exhausted
    failedRequestHandler({ request, pushData }, error) {
        await pushData({
            url: request.url,
            error: error.message,
            status: 'failed',
        });
    },
});
```

---

## Practical Tips

### Choosing a Crawler

| Use Case | Crawler | Speed |
|---|---|---|
| Static HTML, APIs | `CheerioCrawler` | ~10x faster |
| JS-rendered content | `PlaywrightCrawler` | Slower, full browser |
| Mixed (mostly static, some JS) | Start Cheerio, use `skipNavigation` + `sendRequest` for API calls within Playwright |

### Performance

- `CheerioCrawler` default desired concurrency: 10, autoscales based on CPU/memory
- `PlaywrightCrawler`: keep `maxConcurrency` at 5-10 (browsers are heavy)
- Use `request.skipNavigation = true` + `sendRequest()` for API endpoints within browser crawlers
- `AutoscaledPool` monitors event loop lag, CPU, and memory to adjust concurrency

### Data Flow Best Practice

```ts
// Use userData to pass state between pages
await enqueueLinks({
    globs: ['https://example.com/detail/*'],
    userData: { category: 'electronics' },  // carried to child requests
    label: 'DETAIL',
});

// Use useState for cross-request mutable state
const state = await useState({ totalItems: 0 });
state.totalItems += items.length;
```

### Storage Layout

```
./storage/
├── datasets/
│   └── default/         # JSON files, one per pushData call
├── key_value_stores/
│   └── default/         # Arbitrary files (screenshots, state, config)
└── request_queues/
    └── default/         # SQLite-backed queue with deduplication
```

### Common Patterns

```ts
// Infinite scroll handling (Playwright)
async requestHandler({ page, infiniteScroll }) {
    await page.waitForSelector('.item');
    await infiniteScroll({ maxScrolls: 10 });
    // extract after scrolling
}

// Skip navigation for API calls within browser crawler
await enqueueLinks({
    urls: ['https://api.example.com/data.json'],
    skipNavigation: true,
});

// Per-request retry limits
await queue.addRequest({
    url: 'https://flaky-endpoint.com',
    maxRetries: 10,  // override crawler default
});

// Middleware pattern with router
crawler.router.use(async (ctx) => {
    ctx.log.info(`Processing: ${ctx.request.url}`);
    // runs before every handler
});
```

---

*Source: github.com/apify/crawlee (studied 2026-03-10)*
