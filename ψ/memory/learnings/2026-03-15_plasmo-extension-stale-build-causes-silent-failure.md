---
title: Plasmo extension stale build causes silent failures. When debugging Chrome exten
tags: [plasmo, chrome-extension, debugging, build, exe-register]
created: 2026-03-15
source: rrr: Jingjing-oracle
---

# Plasmo extension stale build causes silent failures. When debugging Chrome exten

Plasmo extension stale build causes silent failures. When debugging Chrome extensions built with Plasmo, always check build timestamp vs source timestamp first. `plasmo build` is manual — editing source does NOT update build. Debug order: build freshness → API reachability → auth → code logic.

---
*Added via Oracle Learn*
