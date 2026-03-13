---
title: Chrome Extension CSUI (Content Script UI) is destroyed on page navigation. Multi
tags: [chrome-extension, plasmo, csui-lifecycle, batch-automation, background-handler, page-navigation]
created: 2026-03-12
source: rrr: Jingjing-oracle/exe-register
project: github.com/jingjing-oracle/exe-register
---

# Chrome Extension CSUI (Content Script UI) is destroyed on page navigation. Multi

Chrome Extension CSUI (Content Script UI) is destroyed on page navigation. Multi-page batch automation must: (1) save state before navigation triggers, (2) use background handlers for cross-page operations, (3) detect page stage on each mount and continue flow independently, (4) use fire-and-forget for sendToBackground calls that span navigations, (5) have background navigate tabs directly instead of relying on CSUI. Timer-based coordination between background and CSUI is fragile — use event-driven patterns where the completing action triggers the next step.

---
*Added via Oracle Learn*
