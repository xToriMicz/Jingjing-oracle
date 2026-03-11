# css-selector-generator (fczbkk)

> Studied: 2026-03-10
> Source: /Users/angkana/Jingjing-oracle/ψ/learn/css-selector-generator/
> Version: 3.8.1 | 591 stars | MIT license

## What It Is

A TypeScript library that generates unique CSS selectors for DOM elements. Given an element (or array of elements), it produces the shortest unique selector by trying multiple strategy types in priority order, with combinatorial search and fallback guarantees.

## Algorithm and Strategy System

### Core Flow

1. **Sanitize input** -- accepts single element, array of elements, NodeList, or HTMLCollection
2. **For each ancestor level** (element up to root), generate candidate selectors using a strategy pipeline
3. **Test each candidate** via `root.querySelectorAll(selector)` to verify uniqueness
4. **Yield the first unique match** (for `getCssSelector`) or all matches lazily (for `cssSelectorGenerator`)
5. **Fallback** -- if no unique selector found, produce a full `:nth-child` chain from root

### Strategy Types (in default priority order)

| Type | Selector | Example |
|------|----------|---------|
| `id` | `#myId` | Highest priority, skipped for multi-element |
| `class` | `.myClass` | Can combine: `.aaa.bbb` |
| `tag` | `div` | Tag name of element |
| `attribute` | `[data-x]` or `[data-x='val']` | Excludes `class`, `id`, `ng-*` |
| `nthchild` | `:nth-child(3)` | Position among siblings |
| `nthoftype` | `div:nth-of-type(2)` | Position among same-tag siblings |

### Combinatorial Search

The library uses **power set generation** to combine selectors:

- **Within a type** (`combineWithinSelector`): tries `.a`, `.b`, `.c`, then `.a.b`, `.a.c`, `.b.c`, then `.a.b.c`
- **Between types** (`combineBetweenSelectors`): tries `id` alone, `class` alone, then `id + class`, `tag + class`, etc.
- Combinations are generated via a lazy **power set generator** with `maxCombinations` cap
- Cross-type combinations use a **cartesian product generator** (stack-based, lazy)
- Results ordered by SELECTOR_PATTERN: `nthoftype > tag > id > class > attribute > nthchild`

### Parent Climbing

When no unique selector exists at the element level, the algorithm climbs to parent elements:
- Finds an identifiable parent (one with a unique selector)
- Tries both descendant (` `) and child (` > `) combinators
- Recurses upward until a unique compound selector is found

### Fallback

If all strategies fail, produces a guaranteed-unique `:nth-child` chain:
```
:root > :nth-child(2) > :nth-child(4) > :nth-child(1)
```
With `useScope: true` and a custom root, uses `:scope` prefix for shorter selectors.

## API

### Two Functions

```typescript
import { getCssSelector, cssSelectorGenerator } from 'css-selector-generator';

// Returns first (best) unique selector
const selector = getCssSelector(element, options);

// Generator -- yields all possible selectors, simplest first
for (const sel of cssSelectorGenerator(element, options)) {
  console.log(sel); // use first acceptable one, then break
}

// Spread to get all
const allSelectors = [...cssSelectorGenerator(element, { maxResults: 5 })];
```

### Multi-Element Selectors

```typescript
// Finds shared selector if possible
getCssSelector([el1, el2]); // ".shared-class"

// Falls back to comma-separated individual selectors
getCssSelector([el1, el2]); // "div, span"
```

### Click Tracking Pattern

```typescript
document.body.addEventListener('click', (e) => {
  const selector = getCssSelector(e.target);
  // selector is guaranteed unique within document
});
```

## Configuration Options

```typescript
interface Options {
  // Strategy types in priority order (default: ['id', 'class', 'tag', 'attribute'])
  selectors: ('id' | 'class' | 'tag' | 'attribute' | 'nthchild' | 'nthoftype')[];

  // Scope selector generation within a subtree
  root: ParentNode | null;  // default: document root

  // Filter selectors -- accepts strings (with * wildcards), RegExp, or functions
  blacklist: (string | RegExp | ((s: string) => boolean))[];
  whitelist: (string | RegExp | ((s: string) => boolean))[];

  // Try combinations of selectors within same type (default: true)
  combineWithinSelector: boolean;

  // Try combinations across different types (default: true)
  combineBetweenSelectors: boolean;

  // Always include tag in selector (default: false)
  includeTag: boolean;

  // Cap on power set size per type (default: Infinity)
  maxCombinations: number;

  // Cap on total candidates per element (default: Infinity)
  maxCandidates: number;

  // Use :scope pseudo-class with custom root (default: false, experimental)
  useScope: boolean;

  // Limit yielded results in generator mode (default: Infinity)
  maxResults: number;
}
```

### Blacklist/Whitelist Examples

```typescript
// Ignore dynamic/framework classes
getCssSelector(el, {
  blacklist: [
    '.ng-*',           // Angular classes
    /^\.css-/,         // CSS-in-JS hashes
    /^\.sc-/,          // Styled Components
    '[data-reactid]',  // React internals
    (s) => s.length > 50,  // Absurdly long selectors
  ]
});

// Prefer data-testid attributes
getCssSelector(el, {
  whitelist: ['[data-testid*]', '[data-cy*]'],
  selectors: ['attribute', 'id', 'class', 'tag'],
});
```

### Root Element Scoping

```typescript
// Generate selector relative to a container
const container = document.querySelector('.app-container');
getCssSelector(targetEl, { root: container });
// Result works with: container.querySelector(selector)
```

### Shadow DOM Support

```typescript
// Automatically detects shadow root
getCssSelector(shadowElement);

// Or explicit
getCssSelector(shadowElement, { root: shadowRoot });
```

## Practical Patterns for Web Automation

### Robust Selectors for Playwright/Puppeteer

```typescript
function getStableSelector(el: Element): string {
  return getCssSelector(el, {
    selectors: ['id', 'attribute', 'class', 'tag', 'nthchild'],
    blacklist: [
      /^\.css-/,        // emotion
      /^\.sc-/,         // styled-components
      /^\.MuiBox/,      // MUI internals
      '.hover-*',       // state classes
      '.active',
      '.selected',
      '.focus-*',
    ],
    whitelist: [
      '[data-testid*]',
      '[data-cy*]',
      '[aria-label*]',
      '[role*]',
    ],
    maxCombinations: 100,  // performance guard
    includeTag: true,       // more readable selectors
  });
}
```

### Performance-Safe Configuration

For pages with heavy class usage (Tailwind, atomic CSS):
```typescript
getCssSelector(el, {
  maxCombinations: 50,   // limit power set explosion
  maxCandidates: 100,    // limit total candidates
  combineWithinSelector: false,  // skip class combinations entirely
});
```

### Multiple Selector Candidates

```typescript
// Get top 3 selector options, pick the most readable
const options = [...cssSelectorGenerator(el, { maxResults: 3 })];
const best = options.sort((a, b) => a.length - b.length)[0];
```

## css-selector-generator vs antonmedv/finder

| Aspect | css-selector-generator (fczbkk) | finder (antonmedv) |
|--------|-------------------------------|---------------------|
| **Approach** | Power set + cartesian product of strategy types | Greedy bottom-up with penalty-based optimization |
| **Multi-element** | Native support -- shared selectors or comma-join | Single element only |
| **Generator API** | Yes -- lazy iterator yields all possible selectors | No -- returns single best selector |
| **Selector types** | 6 types: id, class, tag, attribute, nthchild, nthoftype | 5 types: id, class, tag, attribute, nthchild (configurable) |
| **Blacklist** | String wildcards + RegExp + functions | Function-based only (`attr`, `className`, `tagName` filters) |
| **Whitelist** | Yes -- prioritize matching selectors | No native whitelist |
| **Combinations** | Exhaustive combinatorial with caps | Greedy -- picks first working selector |
| **Shadow DOM** | Automatic detection + explicit root | Not built-in |
| **Performance controls** | `maxCombinations`, `maxCandidates`, `maxResults` | `maxNumberOfTries`, `seedMinLength`, `optimizedMinLength` |
| **Bundle size** | Larger (~8KB) | Smaller (~3KB) |
| **Fallback** | Guaranteed `:nth-child` chain | Throws error if not found |
| **TypeScript** | Written in TS, exports types | Written in TS, exports types |

### When to Use Which

**Use css-selector-generator when:**
- You need multi-element selectors (e.g., "select all items matching these 3 elements")
- You want multiple selector candidates to choose from (generator API)
- You need whitelist support to prioritize `data-testid` or `aria-*` attributes
- You need Shadow DOM support
- You want a guaranteed fallback (never throws)
- You need fine-grained blacklisting with wildcards and regex

**Use finder when:**
- You want the smallest bundle size
- You need fast single-element selector generation (greedy is faster than combinatorial)
- Penalty-based optimization matters (finder scores selectors by readability)
- Your use case is simple: one element, one selector, no shadow DOM
- You prefer a simpler API with less configuration surface

### Combined Strategy

For web automation tooling, consider using both:
```typescript
// Try finder first (faster), fall back to css-selector-generator (more thorough)
function getBestSelector(el: Element): string {
  try {
    return finder(el, { attr: (name) => name === 'data-testid' });
  } catch {
    return getCssSelector(el, {
      whitelist: ['[data-testid*]'],
      maxCombinations: 50,
    });
  }
}
```

## Architecture Notes

- **Source**: `src/` with one file per selector type (`selector-id.ts`, `selector-class.ts`, etc.)
- **Key utilities**: `utilities-powerset.ts` (combinatorial engine), `utilities-cartesian.ts` (cross-type combinations), `utilities-data.ts` (pattern matching for blacklist/whitelist)
- **Attribute filtering**: automatically ignores `class`, `id`, `ng-*` attributes; skips `value` on inputs, base64 `src`
- **Selector construction order**: `SELECTOR_PATTERN = [nthoftype, tag, id, class, attribute, nthchild]` -- this is the order parts are concatenated (e.g., `div#myId.myClass[data-x]:nth-child(2)`)
- **Builds**: UMD (via webpack) + ESM (via tsc), namespace `CssSelectorGenerator` for script tag usage
