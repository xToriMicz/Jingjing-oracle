---
name: HTML extractTextLines first/last node bug
description: Regex />([^<]+)</g silently drops first and last text nodes when applied to extracted inner HTML content (no leading > or trailing <)
type: learning
---

# HTML Text Extraction: First/Last Node Silent Drop

## The Bug

When extracting text from HTML using `/>([^<]+)</g`, the regex requires a `>` before each text match. This works on full HTML but **fails on extracted inner content**.

```js
// Outer regex captures inner content:
const match = html.match(/<td[^>]*>(.*?)<\/td>/s);
const inner = match[1]; // "ATK SPD: +20%<br>Ignore DEF: +2%<br>Evasion: +5"

// Inner content has NO leading > — first text node is dropped
[...inner.matchAll(/>([^<]+)</g)]
// Returns: ["Ignore DEF: +2%"] — missing first AND last!
```

## Why It's Dangerous

- Returns partial results, not errors
- Every extracted cell loses its first value
- Data looks plausible (1 bonus instead of 3)
- Only caught by 1:1 source comparison

## The Fix

```js
// Split on tags instead — captures ALL text nodes
function extractTextLines(html) {
  return html.split(/<[^>]*>/)
    .map(s => s.replace(/&nbsp;/g, " ").trim())
    .filter(t => t.length > 0);
}
```

## Impact

- Fixed Lv25 bonus data for 423 stances (first values were all missing)
- Fixed info/stats cells (first stat like "Targets" was being dropped)
- Total skills captured jumped from ~1,958 to 4,869 (more level data parsed)

## Rule

Never use `/>([^<]+)</g` on extracted inner HTML content. Use `split(/<[^>]*>/)` instead.
