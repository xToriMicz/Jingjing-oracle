# Validate Before Design

> Learned: 2026-03-12 | Source: Proxy study session — built implementation plan before confirming proxy availability

## Pattern

อย่าเขียน implementation plan ก่อนพิสูจน์ว่า core assumption เป็นจริง

## What Happened

- ใช้เวลา 40+ นาที research proxy types, chrome.proxy API, anti-detection
- เขียน comprehensive learning doc + implementation design + handoff
- แล้วค่อยไปทดสอบ proxy จริง → ทั้งหมดตาย/ถูก block
- งานทั้งหมดที่ design ไว้ใช้ไม่ได้เพราะไม่มี proxy

## Rule

```
1. ทดสอบ feasibility ก่อน (PoC)
2. ถ้าผ่าน → ค่อย design + implement
3. ถ้าไม่ผ่าน → หาทางอื่น ก่อนจะ invest time
```

## Applies To

- Proxy / VPN integration
- External API dependencies
- Third-party service integration
- ทุกอย่างที่ต้องพึ่ง resource ภายนอก

## Key Phrase

> "ถ้าทดสอบแบบ CLI ยังไม่ได้ ไม่ต้องพูดถึงการไป implement ที่ production" — Gabbzaa
