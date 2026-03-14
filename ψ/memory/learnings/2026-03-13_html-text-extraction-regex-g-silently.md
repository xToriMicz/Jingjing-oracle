---
title: HTML text extraction regex `/>([^<]+)</g` silently drops first and last text nod
tags: [html-parsing, regex, silent-data-loss, text-extraction, web-scraping, ge-database]
created: 2026-03-13
source: rrr: Jingjing-oracle/ge-db
project: github.com/jingjing-oracle/ge-db
---

# HTML text extraction regex `/>([^<]+)</g` silently drops first and last text nod

HTML text extraction regex `/>([^<]+)</g` silently drops first and last text nodes when applied to extracted inner HTML content (captured via `(.*?)` from outer tags). The inner string has no leading `>` or trailing `<`, so boundary nodes are missed. Fix: use `html.split(/<[^>]*>/)` instead. This caused silent data loss across 423 stances in GE Database — Lv25 bonuses, info fields, and stats were all missing their first values. Only caught by 1:1 source comparison.

---
*Added via Oracle Learn*
