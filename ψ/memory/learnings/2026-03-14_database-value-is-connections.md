---
date: 2026-03-14
source: rrr: ge-db
tags: [database, ux, cross-linking, prioritization]
---

# The Value of a Database Is in the Connections

## Pattern

Having 10,490 items in a database means nothing if users can't trace from **Item → Map → Monster**. Cross-entity navigation is the core product of any reference database.

## Context

GE Database Thai had impressive data counts (292 characters, 10K items, 630 monsters, 242 maps) but the item cards showed no drop information. Users couldn't answer the fundamental question: "Where do I find this item?" The data to answer this existed across tables (`map_drops`, `monsters`, `maps`) but wasn't surfaced in the UI.

User feedback: "ถ้าเราแก้ปัญหานี้ไม่ได้ การทำมาทั้งหมด ก็ไม่มีคุณค่าอะไรเลย" (if we can't solve this, everything we built is worthless)

## Lesson

1. **Build entity connections before search/browse** — The link between entities (item → map → monster) should be the first feature, not an afterthought
2. **A disconnected database is just a spreadsheet** — Without navigation paths between related data, fancy UI is meaningless
3. **Listen to user pain from real usage** — The user played this game and knew exactly which question the site needed to answer

## Applied

Built `/api/items/:slug` that JOINs `map_drops` + `maps` + `monsters` to show: item detail → which maps drop it → which monsters are in those maps. One API call, three tables, complete answer chain.
