---
name: runway
description: v1.0.0 L-SKLL | Preflight check before deploy — syntax, functions, secrets scan, smoke test. Use when about to deploy, before wrangler deploy, or when user says "runway", "preflight", "deploy check".
argument-hint: "[repo-path]"
---

# /runway — Preflight Check Before Deploy

> "No plane takes off without a runway check."

Gate that prevents deploying broken code. Run before every `wrangler deploy` or `bun run deploy`.

## Step 1: Detect Project

```bash
# Use current directory or argument
REPO="${1:-.}"
cd "$REPO"
echo "🛫 Runway check: $(basename $(pwd))"
echo "Branch: $(git branch --show-current)"
```

## Step 2: JS Syntax Check

For projects with `public/index.html` (inline JS):
```bash
sed -n '/<script>/,/<\/script>/p' public/index.html | sed '1d;$d' > /tmp/runway-check.js
node --check /tmp/runway-check.js && echo "✅ JS syntax OK" || { echo "❌ JS SYNTAX ERROR — BLOCKED"; exit 1; }
```

For projects with separate JS/TS files:
```bash
npx tsc --noEmit 2>&1 || echo "⚠️ TypeScript errors (may still deploy)"
```

## Step 3: Core Functions Check

```bash
REQUIRED="loginFacebook filterTrends loadTrends switchTab"
MISSING=0
for fn in $REQUIRED; do
  if ! grep -q "function $fn" public/index.html 2>/dev/null; then
    echo "❌ Missing function: $fn"
    MISSING=1
  fi
done
[ $MISSING -eq 0 ] && echo "✅ Core functions OK" || { echo "❌ FUNCTIONS MISSING — BLOCKED"; exit 1; }
```

Note: Adjust REQUIRED list per project. facebook-toolkit uses the 4 above.

## Step 4: Secrets Scan

```bash
# Check for leaked secrets
if grep -rn "AKIA\|sk-\|AIza\|ghp_\|password\s*=" public/ src/ --include="*.html" --include="*.ts" --include="*.js" 2>/dev/null; then
  echo "❌ POTENTIAL SECRET LEAKED — BLOCKED"
  exit 1
fi
echo "✅ No secrets found"
```

## Step 5: Branch Check

```bash
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "⚠️ Not on main ($BRANCH) — merge to main before deploy"
fi
```

## Step 6: Deploy

If all checks pass:
```bash
echo "🛫 All checks passed — clear for takeoff"
bun run deploy
```

## Step 7: Smoke Test (post-deploy)

```bash
# WebFetch the live site to verify
echo "🔍 Smoke test..."
curl -sI https://fb.makeloops.xyz | head -3
```

If HTTP/2 200 → "✅ Deployed successfully"
If error → "❌ DEPLOY FAILED — rollback: git checkout main -- public/index.html && npx wrangler deploy"

## Rules

- **BLOCK deploy if syntax fails** — no exceptions
- **BLOCK deploy if functions missing** — no exceptions
- **BLOCK deploy if secrets found** — no exceptions
- **WARN but don't block** for TypeScript errors, wrong branch
- Run automatically before every deploy — make it a habit
