---
title: ## Wrangler CLI Code Patterns (2026-03-13)
tags: [wrangler, cli, yargs, api-patterns, error-handling, kv, r2, d1, config, miniflare]
created: 2026-03-13
source: Wrangler CLI Code Analysis
project: github.com/cloudflare/workers-sdk
---

# ## Wrangler CLI Code Patterns (2026-03-13)

## Wrangler CLI Code Patterns (2026-03-13)

**Extracted from**: Cloudflare workers-sdk `packages/wrangler/src/`

### Key Patterns
1. **Commands**: All use `createCommand()` wrapping yargs definitions
2. **Config**: 3-step: read raw → normalize+validate → error handling
3. **API**: `fetchResult()` / `fetchListResult()` for pagination (cursor-based)
4. **Auth**: `requireAuth()` resolves account ID from credentials
5. **Errors**: Categorize by type (cert, permission, file, DNS) for helpful messages
6. **Secrets**: Use `inherit` type for safe versioning
7. **Auto-Config**: Post-creation commands update wrangler.toml automatically
8. **KV/R2**: Create commands return resource ID → auto-bind in config
9. **D1**: Migrations tracked in `_d1_migrations` table with rollback support
10. **Dev**: Miniflare integration with inspector debugging

### Error Codes (Cloudflare API)
- 10007: Subdomain not found
- 10014: KV namespace duplicate
- 10031: Subdomain taken
- 10032: Subdomain available (confusing naming!)

### Dev Server
- Port: 8787 (default)
- Inspector: 9229 (DevTools)
- Protocol: HTTP/HTTPS with custom cert support
- Routing: Pattern-based request handling

**Documented**: 1537_CODE-SNIPPETS.md (26KB)

---
*Added via Oracle Learn*
