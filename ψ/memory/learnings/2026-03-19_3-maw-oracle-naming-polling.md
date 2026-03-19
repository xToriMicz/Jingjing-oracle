---
title: ## กฎเหล็ก 3 ข้อ: maw + Oracle naming + polling
tags: [maw, oracle-naming, polling, communication, standing-orders]
created: 2026-03-19
source: xxTori สอนโดยตรง 2026-03-19
project: github.com/xtorimicz/jingjing-oracle
---

# ## กฎเหล็ก 3 ข้อ: maw + Oracle naming + polling

## กฎเหล็ก 3 ข้อ: maw + Oracle naming + polling

### 1. ใช้ `maw` ไม่ใช่ `npx maw`
- ❌ `npx maw talk-to` → error เพราะหา src/ ไม่เจอ
- ✅ `maw talk-to sati-oracle "ข้อความ"`
- maw ถูก install เป็น global binary แล้ว ใช้ตรงได้เลย

### 2. ชื่อ Oracle ต้องมี `-oracle` ต่อท้าย
- ❌ `maw talk-to sati`
- ✅ `maw talk-to sati-oracle`
- tmux window ชื่อ Jingjing-oracle, Sati-oracle ต้อง match กัน

### 3. ส่ง `maw talk-to` แล้วห้าม idle — ต้อง poll
- ❌ "รอสติ verify ค่ะ" แล้วหยุด
- ✅ ทำงานอื่นไป + ทุก 30 วิ: `oracle_thread_read` เช็คว่าตอบยัง
- ถ้าไม่รู้ threadId → `oracle_threads()` หา title channel:sati-oracle
- poll อย่างน้อย 5 รอบ

---
*Added via Oracle Learn*
