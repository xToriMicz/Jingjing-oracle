---
title: Wrangler CLI (v4.72.0) สามารถควบคุม Cloudflare ได้ทุกอย่างผ่าน terminal — Worker
tags: [wrangler, cloudflare, workers, cli, devops, infrastructure]
created: 2026-03-13
source: rrr: Jingjing-oracle
project: github.com/cloudflare/workers-sdk
---

# Wrangler CLI (v4.72.0) สามารถควบคุม Cloudflare ได้ทุกอย่างผ่าน terminal — Worker

Wrangler CLI (v4.72.0) สามารถควบคุม Cloudflare ได้ทุกอย่างผ่าน terminal — Workers deploy/dev/delete, KV namespaces, D1 databases + migrations, R2 buckets, Secrets, Custom Domains, Cron Triggers, Pages, Queues ไม่ต้องเปิด Dashboard เลย

Key patterns:
- Auth: `CLOUDFLARE_API_TOKEN` env var หรือ `wrangler login` (OAuth2) → token ที่ `~/Library/Preferences/.wrangler/config/default.toml`
- Custom domain: ใส่ `[[routes]]` pattern + `custom_domain = true` ใน wrangler.toml แล้ว `wrangler deploy`
- Config: wrangler.toml รองรับ env-specific sections `[env.staging]`, bindings สำหรับ KV/D1/R2/DO/Queues
- API layer: `fetchResult()` + `fetchListResult()` (auto-pagination) ผ่าน Cloudflare API v4
- Entry point: `src/index.ts` → 150+ commands via yargs, centralized CommandRegistry
- Local dev: `wrangler dev` ใช้ Miniflare จำลอง Workers runtime ที่ local (port 8787)
- Install: `npx wrangler` ใช้ได้เลยไม่ต้อง global install

---
*Added via Oracle Learn*
