# finder — CSS Selector Generator

> `@medv/finder` v4.0.2 by Anton Medvedev. The most popular CSS selector generator library (1,475 stars). Generates the shortest, unique, and robust CSS selector for any DOM element. 1.5kb minified+gzipped.

**Source studied**: `/Users/angkana/Jingjing-oracle/ψ/learn/finder/`
**Date**: 2026-03-10

---

## The Algorithm

The entire library is a single file (`finder.ts`, ~385 lines). The algorithm works in three phases:

### Phase 1: Build Candidate Knots (`tie()`)

For each element from target up to root, generate candidate "knots" — selector fragments with penalty scores:

| Strategy | Example | Penalty | Priority |
|---|---|---|---|
| ID | `#submit-btn` | 0 | Highest |
| Class | `.add-comment` | 1 | High |
| Attribute | `[role="button"]` | 2 | Medium |
| Tag name | `article` | 5 | Low |
| nth-of-type | `div:nth-of-type(3)` | 10 | Lower |
| nth-child | `div:nth-child(5)` | 50 | Lowest |

**Filtering**: Each knot type passes through a filter function. By default, IDs, class names, and attribute values must be "word-like" — meaning they match `/^[a-z\-]{3,}$/i`, each segment (split on `-` or camelCase) is 3+ chars, and no segment has 4+ consecutive consonants. This automatically rejects hashed/generated class names like `css-175oi2r` or `sc-a8f9d3`.

**Accepted attributes**: `role`, `name`, `aria-label`, `rel`, `href`, plus any `data-*` attribute that passes the word-like test.

### Phase 2: Search via Combinations (`search()`)

Walk up the DOM tree from the target element, collecting knot arrays at each level. Generate all combinations across levels (cartesian product). Sort candidates by total penalty (sum of knot penalties). Yield candidates lazily via a generator.

Once `seedMinLength` levels (default 3) are reached, start yielding sorted candidates. Each candidate is tested for uniqueness via `querySelectorAll(css).length === 1`.

### Phase 3: Optimize (`optimize()`)

Once a unique selector is found, try removing intermediate path segments (middle nodes, not first/last) to shorten it. Recursively optimize shorter paths. All optimized variants are sorted by penalty; the lowest-penalty one wins.

### Timeout Fallback

If the search exceeds `timeoutMs` (default 1000ms) or `maxNumberOfPathChecks`, fall back to a full `nth-of-type` chain from target to root (e.g., `body > div:nth-of-type(2) > section:nth-of-type(1) > p:nth-of-type(3)`).

### Selector Assembly

Knots with consecutive levels use `>` (direct child). Non-consecutive levels use ` ` (descendant combinator). This means the optimizer can skip intermediate levels, producing selectors like `.blog > article:nth-of-type(3) .add-comment`.

---

## API

```ts
import { finder } from '@medv/finder'

// Basic usage — pass a DOM element
const selector = finder(element)
// => ".blog > article:nth-of-type(3) .add-comment"

// With options
const selector = finder(element, {
  root: document.body,           // Search boundary (default: document.body)
  timeoutMs: 1000,               // Timeout in ms (default: 1000)
  seedMinLength: 3,              // Min DOM levels before yielding candidates (default: 3)
  optimizedMinLength: 2,         // Min path length to attempt optimization (default: 2)
  maxNumberOfPathChecks: Infinity, // Max candidates to test
  idName: (name) => boolean,     // Filter ID names (default: wordLike check)
  className: (name) => boolean,  // Filter class names (default: wordLike check)
  tagName: (name) => boolean,    // Filter tag names (default: () => true)
  attr: (name, value) => boolean // Filter attributes (default: accepted attrs + wordLike)
})
```

### Exported Filter Functions

```ts
import { finder, className, attr, idName, tagName } from '@medv/finder'

// Extend default filters (wrap, don't replace)
finder(el, {
  className: name => className(name) || name.startsWith('my-prefix-'),
  attr: (name, value) => attr(name, value) || name.startsWith('data-test-'),
})
```

---

## Configuration Patterns

### Accept all class names (including generated ones)
```ts
finder(el, { className: () => true })
```

### Only use data-testid attributes
```ts
finder(el, {
  className: () => false,
  idName: () => false,
  attr: (name, _value) => name === 'data-testid',
})
```

### Reject specific tags
```ts
finder(el, {
  tagName: (name) => !['div', 'span'].includes(name),
})
```

### Faster with lower timeout
```ts
finder(el, { timeoutMs: 200, maxNumberOfPathChecks: 500 })
```

---

## Integration with Playwright / Puppeteer

The library runs **in the browser** (requires `document`, `Node`, `CSS.escape`). Use `page.evaluate()` to inject and run it.

### Playwright

```ts
import { readFileSync } from 'fs'

// Inject finder into the page
const finderSource = readFileSync(
  'node_modules/@medv/finder/finder.js', 'utf8'
)

// Generate selector for an element found by other means
const selector = await page.evaluate((finderCode) => {
  // Load finder
  const module = {}
  const exports = module
  new Function('module', 'exports', finderCode)(module, exports)
  const { finder } = module.exports || exports

  // Find element and generate selector
  const el = document.querySelector('[data-testid="target"]')
  return finder(el)
}, finderSource)

// Or: inject as a script tag, then use in subsequent evaluates
await page.addScriptTag({ path: 'node_modules/@medv/finder/finder.js' })
```

### Simpler: Use in a click recorder

```ts
// Record clicks and capture selectors
await page.exposeFunction('reportSelector', (sel: string) => {
  console.log('Clicked:', sel)
})

await page.evaluate(() => {
  document.addEventListener('click', (e) => {
    const sel = window.__finder(e.target)
    window.reportSelector(sel)
  }, true)
})
```

### Puppeteer (same pattern)

```ts
await page.evaluate(() => {
  // finder must already be injected
  const el = document.elementFromPoint(100, 200)
  return finder(el)
})
```

---

## Practical Patterns for Web Automation

### Pattern 1: Generate stable selectors for test recording
```ts
// Prefer data-testid over generated classes
const sel = finder(el, {
  attr: (name, value) => name === 'data-testid' || name === 'data-cy',
  className: () => false,  // Skip classes entirely
})
```

### Pattern 2: Selector validation
```ts
// finder guarantees uniqueness — if it returns, it's unique
// But verify it selects the RIGHT element after page changes
const sel = finder(el)
const found = document.querySelector(sel)
console.assert(found === el, 'Selector still valid')
```

### Pattern 3: Shadow DOM support
```ts
// finder auto-detects shadow roots via getRootNode()
// For manual control, pass the shadow root as root:
const sel = finder(shadowElement, { root: shadowRoot })
// Then query within that shadow root:
shadowRoot.querySelector(sel)
```

### Pattern 4: Robust selectors for scraping
```ts
// Use short timeout to get fast (possibly longer) selectors
// rather than spending time optimizing
const sel = finder(el, { timeoutMs: 100 })
```

---

## Edge Cases and Limitations

1. **Browser-only**: Requires `document`, `Node`, `CSS.escape` globals. Cannot run in Node.js without JSDOM or similar.
2. **Duplicate IDs**: Handles gracefully — when `#foo` matches multiple elements, it falls through to class/tag/nth-child strategies.
3. **Generated class names**: The `wordLike()` filter rejects names with 4+ consecutive consonants or segments under 3 chars, which catches most CSS-in-JS hashes (`css-175oi2r`, `sc-xyz`). But it may reject legitimate short class names.
4. **Performance on large DOMs**: The combinatorial search can be expensive. Use `timeoutMs` and `maxNumberOfPathChecks` to bound it. On timeout, falls back to `nth-of-type` chains (always works but fragile).
5. **Dynamic content**: Selectors are point-in-time. If the DOM changes (items added/removed), `nth-of-type` and `nth-child` selectors will break.
6. **No XPath**: Generates CSS selectors only.
7. **No iframe support**: Works within a single document/shadow root context.

---

## Comparison vs Other Selector Generators

| Feature | @medv/finder | css-selector-generator | optimal-select |
|---|---|---|---|
| Size | 1.5kb | ~5kb | ~3kb |
| Algorithm | Combinatorial + optimize | Priority-based | Set-based |
| Penalty system | Yes (weighted) | No | No |
| Shadow DOM | Yes (auto-detect) | No | No |
| Timeout/fallback | Yes (nth-of-type chain) | No | No |
| Filter functions | id, class, tag, attr | Blocklist-based | Limited |
| Word-like filtering | Built-in (rejects hashes) | Manual config | No |
| Shortest selector | Yes (via optimization phase) | Not guaranteed | Tries |
| Active maintenance | Yes (v4, 2024+) | Slowing | Archived |

**Why finder wins**: The penalty-weighted combinatorial approach with lazy evaluation and optimization pass genuinely produces shorter, more readable selectors. The word-like filter is smart about rejecting CSS-in-JS noise. Shadow DOM support is rare. The library is tiny and dependency-free.

---

## Key Insight for Jingjing

For web automation work, finder is most useful as a **selector recorder** — inject it into pages to capture what a user clicks, generating stable selectors for later replay. The filter functions are the key integration point: configure them to prefer `data-testid` attributes for test automation, or `aria-label` for accessibility-first selectors. Always pair with Playwright's built-in locators (`getByRole`, `getByTestId`) for the most robust tests, using finder-generated selectors as fallback when semantic locators aren't available.
