# CSS Selector Generator Benchmark & unique-selector

> Learned: 2026-03-10
> Source repos: css-selector-generator-benchmark, unique-selector
> Domain: Web automation, DOM element targeting, CSS selector generation

## Context

When automating browsers (Playwright, Cypress, analytics tracking), you need reliable CSS selectors that uniquely identify DOM elements. Multiple libraries exist for this. The benchmark repo compares them head-to-head; the unique-selector repo is one of the contestants.

---

## Benchmark: Libraries Compared

Four configurations of three libraries are benchmarked against a complex HTML document:

| Library | Version | Maintainer |
|---------|---------|------------|
| **css-selector-generator** (default) | 3.8.0 | fczbkk |
| **css-selector-generator** (custom: id, class, tag, nthchild) | 3.8.0 | fczbkk |
| **@medv/finder** | 3.1.0 | Anton Medvedev |
| **@cypress/unique-selector** | 2.1.1 | Cypress team |

## Benchmark: Metrics Measured

- **Accuracy**: Selectors generated (success rate) and unique selectors (uniqueness rate)
- **Speed**: Total time, average time per selector, fastest/slowest
- **Selector length**: Shortest, longest, average character count

The benchmark loads HTML into an iframe, walks every element via TreeWalker, generates a selector with each library, then validates by running `querySelectorAll` to confirm the selector matches exactly one element (the target).

## Benchmark: Key Findings from Code Analysis

The benchmark is designed to run in-browser (Vite + React app). Results vary by machine and HTML complexity, but the structural analysis reveals these expected characteristics:

### Accuracy (Uniqueness)

- **css-selector-generator**: Highest expected uniqueness. Uses an exhaustive strategy with many selector types (id, class, tag, attribute, nthchild, nthoftype) and combinatorial optimization. Default config tries the widest set of strategies.
- **@medv/finder**: High uniqueness. Uses optimized path-finding with configurable thresholds and timeout control.
- **@cypress/unique-selector**: Lower uniqueness expected on complex documents. Falls back to `*` when no unique selector is found (returns `*` literal, which matches everything). The `NthChild` fallback guarantees a selector exists but combined with parent traversal may produce non-unique results in edge cases.

### Speed

- **@cypress/unique-selector**: Fastest. Minimal algorithm -- tries ID, then class combinations (up to 3-way), then tag, then nth-child. No optimization passes.
- **@medv/finder**: Fast. Has timeout control and maxNumberOfTries to cap computation.
- **css-selector-generator**: Slowest. Most thorough -- tries many selector types and combinations. The `maxCombinations` and `maxCandidates` options can tune this.

### Selector Length

- **@medv/finder**: Produces shortest selectors. Optimized for brevity.
- **css-selector-generator (custom)**: Shorter than default config (fewer selector types = simpler output).
- **css-selector-generator (default)**: Medium length. More selector types means more candidates but also longer fallback chains.
- **@cypress/unique-selector**: Can produce long selectors due to parent chain traversal (`body > :nth-child(1) > :nth-child(2) > ...`).

---

## Capabilities Comparison (from benchmark code)

| Capability | css-selector-generator | @medv/finder | @cypress/unique-selector |
|---|---|---|---|
| Customization options | 10+ options | Filter functions, timeout | Only selectorTypes array |
| Multiple elements | Yes (common selector) | No | No |
| Multiple selectors | Yes (iterator) | No | No |
| Performance tuning | maxCombinations, maxCandidates | timeout, threshold, maxNumberOfTries | None |
| Shadow DOM | Yes | No | Yes |
| Filter functions | Whitelist/blacklist + regex | idName, className, tagName, attr filters | None |

---

## unique-selector: Deep Dive

### API

```js
import unique from 'unique-selector';

const selector = unique(element, {
  selectorTypes: ['ID', 'Class', 'Tag', 'NthChild'],  // default
  attributesToIgnore: ['id', 'class', 'length'],        // default
  excludeRegex: /dynamicId|randomClass/,                // optional
});
```

### Algorithm (step by step)

1. **Collect parents**: Walk from target element up to document root, collecting all ancestor elements.
2. **For each element in the chain**, try to find a unique selector using this priority:
   - **ID**: If element has an id, use `#id` (or `[id="value"]` for ids starting with numbers or containing colons).
   - **Tag**: If the tag name alone is unique among siblings.
   - **Class combinations**: Try all 1-, 2-, and 3-way combinations of CSS classes. Optionally prefix with tag name.
   - **Attribute combinations**: Same combinatorial approach with non-id/class attributes.
   - **NthChild**: `:nth-child(n)` based on position among siblings. Always produces a result.
3. **Build the chain**: Collect per-element selectors, then build a descendant chain (`parent > child > target`) starting from the target upward, stopping as soon as `document.querySelectorAll(chain)` returns exactly 1 match.

### How Uniqueness is Guaranteed

- The `isUnique` check runs `el.ownerDocument.querySelectorAll(selector)` and verifies `length === 1` and the match is the exact element.
- If no single-element selector is unique, the algorithm builds a parent chain using `>` combinator until the full path is unique.
- Worst case: returns `null` if even the full chain isn't unique (rare in practice).

### Limitations

- **No performance controls**: No timeout, no max iterations. On deeply nested DOM with many classes, the combinatorial explosion (up to C(n,3) combinations) could be slow.
- **No filter functions**: Only `excludeRegex` for basic filtering. Cannot programmatically accept/reject selectors.
- **Falls back to `*`** in `getUniqueSelector` when no strategy works for a single element, though the parent chain usually compensates.
- **No optimization for selector length**: Does not minimize output.

---

## Practical Recommendations

### When to use each library

| Use Case | Recommended Library | Why |
|---|---|---|
| **Production test automation** (Cypress, Playwright) | css-selector-generator | Best accuracy, most options, handles edge cases |
| **Analytics / click tracking** | @cypress/unique-selector or @medv/finder | Speed matters more than perfect selectors; both are fast |
| **Visual regression / screenshot diffing** | @medv/finder | Short selectors = readable diffs |
| **Quick prototyping** | @cypress/unique-selector | Simplest API, zero config |
| **Shadow DOM components** | css-selector-generator or @cypress/unique-selector | Both support Shadow DOM |
| **Dynamic content (generated IDs/classes)** | css-selector-generator | Whitelist/blacklist filters to exclude dynamic attributes |

### Decision Matrix

```
Need 100% unique selectors?
  YES --> css-selector-generator (default config)
  NO  --> How important is speed?
            VERY --> @cypress/unique-selector (fastest, simplest)
            MODERATE --> @medv/finder (good balance)

Need short/readable selectors?
  YES --> @medv/finder (optimized for brevity)
  NO  --> css-selector-generator

Need to filter out dynamic IDs/classes?
  YES --> css-selector-generator (whitelist/blacklist/regex)
        or unique-selector (excludeRegex, limited)
  NO  --> any library works

Working with Shadow DOM?
  YES --> css-selector-generator or @cypress/unique-selector
  NO  --> any library works

Need multiple selectors for same element?
  YES --> css-selector-generator (iterator API)
  NO  --> any library works
```

### Performance vs Accuracy Tradeoff

```
Accuracy:  css-selector-generator > @medv/finder > @cypress/unique-selector
Speed:     @cypress/unique-selector > @medv/finder > css-selector-generator
Brevity:   @medv/finder > css-selector-generator > @cypress/unique-selector
Features:  css-selector-generator > @medv/finder > @cypress/unique-selector
```

---

## Key Takeaway for Jingjing

For our web automation work: **use `css-selector-generator` when reliability matters** (test automation, scraping critical paths) and **`@medv/finder` when you need fast, short selectors** (logging, analytics, non-critical identification). The `unique-selector` library is a solid simple option but lacks the configurability needed for production automation at scale.
