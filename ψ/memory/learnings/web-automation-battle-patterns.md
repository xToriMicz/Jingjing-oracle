# Web Automation Battle-Tested Patterns

> Learned: 2026-03-07 | Source: kumo-oracle (sibling Oracle, xToriMicz)

12 patterns จากประสบการณ์จริงของ Kumo Oracle — web automation specialist.

## 1. API Before Scraping

ใช้เวลา 5 นาทีดู Network tab ใน DevTools ก่อนเขียน Playwright code เสมอ ดูว่ามี hidden API (.ashx, /api/, ajax) ไหม — API call เร็วกว่า browser pagination 10 เท่า

## 2. Chrome Persistent Context

Playwright เก็บ profile ใน `user_data_dir/Default/` ไม่ใช่ root — เขียน Preferences JSON ไปที่ `Default/Preferences`

```python
# Disable password popup
{"password_manager": {"offer_to_save_passwords": false}}
```

## 3. React Virtualized Lists

Content scripts มองไม่เห็น React internals — ใช้ `chrome.scripting.executeScript` กับ `world: 'MAIN'`

Pattern: Multi-position scroll → extract → merge → dedup by `id` → stop หลัง 2 consecutive dry runs

## 4. DOM Loop Dedup (3 Layers)

1. `seen_indices` Set — dedup ภายใน DOM loop ปัจจุบัน
2. Content fingerprint — ตรวจ text ซ้ำ
3. DB — dedup ข้าม runs

**กฎ**: 1 item = max 1 action, mark ไม่ว่า action type ไหน

## 5. textContent Drops Line Breaks

`textContent` ทำ `<br>` หายเงียบ (เจอใน CodeMirror) — ต้อง walk DOM recursively: `<br>` → `\n`, text nodes append

**สำคัญ**: grep ALL copies ของ parser ก่อน patch

## 6. DOM Focus Preservation

Page ที่มี `setInterval` update DOM ทำให้ input focus หาย

```javascript
// Save before update
const el = document.activeElement
const start = el.selectionStart
const val = el.value

// ... DOM update ...

// Restore after
el.focus()
el.selectionStart = start
el.value = val
```

## 7. ARIA Over CSS Selectors

ARIA snapshots เชื่อถือได้มากกว่า CSS selectors สำหรับ React apps ที่ dynamic — ARIA tree มีประโยชน์กว่า screenshots สำหรับ LLMs

## 8. Chrome Extension UI (MV3)

- Width budget ~380px สำหรับ popups
- Label ทุก input
- ใช้ `flex-wrap`
- อย่า block — extract ก่อน แล้วค่อยแสดงผล
- Background service worker + Chrome Alarms API สำหรับ persistent automation

## 9. Playwright Self-Check

ติดตั้ง Playwright MCP ให้ AI navigate app ที่กำลังรัน, ถ่าย screenshot, อ่าน accessibility tree — ไม่ต้องมี UI reviewer แยก

## 10. Self-Sufficiency

สร้าง tool สำหรับ gap ของตัวเอง (เช่น `inspect_activity.py`) — Checklist ก่อนถามมนุษย์: อ่านได้ไหม? รันได้ไหม? navigate ได้ไหม? search ได้ไหม?

> "A tool asks for inputs; a partner produces outputs."

## 11. Force Click for Overlays

Facebook/complex UIs ต้องใช้ `force=True` สำหรับ click (images/overlays intercept)

```python
await element.click(force=True)
await textbox.focus()
await textbox.fill("text", force=True)
```

## 12. Multi-Worker Architecture

```
1 target = 1 worker = 1 Chrome profile = 1 login session
```

- Shared SQLite tracker กับ `worker` column
- Separate screenshots per worker
- Profile isolation ป้องกัน session ชน

## Known Projects (Reference)

| Project | Stack | What |
|---------|-------|------|
| GE Login | Python + Playwright | Portal login automation |
| Fb-wownewcar-alive | Python + Playwright + Claude Haiku | Facebook page bot |
| Chat_fill | Chrome Extension MV3 | ChatGPT prompt auto-filler |
| SunoCreate | Chrome Extension MV3 | Suno.com song form filler |
| Suno Downloader v2 | Chrome Extension MV3 | Batch download MP3/WAV/cover/lyrics |
