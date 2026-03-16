---
title: GE Database: preview_video ของตัวละครต้องเก็บแค่ YouTube video ID (เช่น 'sZL8eU0
tags: [ge-database, preview-video, youtube, characters]
created: 2026-03-16
source: session 2026-03-16
---

# GE Database: preview_video ของตัวละครต้องเก็บแค่ YouTube video ID (เช่น 'sZL8eU0

GE Database: preview_video ของตัวละครต้องเก็บแค่ YouTube video ID (เช่น 'sZL8eU0AazE') ไม่ใช่ full URL เพราะ frontend ใช้ embed: `https://www.youtube.com/embed/${c.preview_video}` — ดูรูปแบบจาก migration 043_preview-videos.sql. ตรวจสอบโดยดึงชื่อวิดีโอจาก YouTube oEmbed API มาเทียบกับชื่อตัวละคร

---
*Added via Oracle Learn*
