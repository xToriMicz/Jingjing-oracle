---
name: gate
description: v1.0.0 L-SKLL | Deploy lock — prevent simultaneous deploys. Use when deploying, or when user says "gate", "lock deploy", "deploy lock", "who is deploying".
argument-hint: "<acquire|release|status> [repo]"
---

# /gate — Deploy Lock

> "One plane on the runway at a time."

Prevents multiple Oracles from deploying simultaneously. Uses a lock file.

## Usage

```
/gate acquire    → Claim deploy lock
/gate release    → Release lock after deploy
/gate status     → Who holds the lock?
```

## Lock File

Location: `~/.oracle/deploy.lock`

Format:
```json
{"oracle":"jingjing-oracle","repo":"facebook-toolkit","time":"2026-03-23T12:00:00Z"}
```

## Step 1: Check Action

```bash
ACTION="${1:-status}"
LOCK_FILE="$HOME/.oracle/deploy.lock"
ORACLE_NAME="${ORACLE_NAME:-$(basename $(pwd))}"
REPO_NAME="$(basename $(git rev-parse --show-toplevel 2>/dev/null || pwd))"
```

## acquire

```bash
if [ -f "$LOCK_FILE" ]; then
  HOLDER=$(cat "$LOCK_FILE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('oracle','unknown'))")
  SINCE=$(cat "$LOCK_FILE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('time','?'))")
  echo "❌ BLOCKED — $HOLDER is deploying $REPO_NAME since $SINCE"
  echo "Wait or ask them to /gate release"
  exit 1
fi
echo "{\"oracle\":\"$ORACLE_NAME\",\"repo\":\"$REPO_NAME\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$LOCK_FILE"
echo "🔒 Lock acquired — $ORACLE_NAME deploying $REPO_NAME"
```

## release

```bash
if [ -f "$LOCK_FILE" ]; then
  rm "$LOCK_FILE"
  echo "🔓 Lock released"
else
  echo "No lock to release"
fi
```

## status

```bash
if [ -f "$LOCK_FILE" ]; then
  cat "$LOCK_FILE" | python3 -c "import sys,json;d=json.load(sys.stdin);print('🔒 ' + d.get('oracle','?') + ' deploying ' + d.get('repo','?') + ' since ' + d.get('time','?'))"
else
  echo "🔓 No one is deploying — clear to deploy"
fi
```

## Integration with /runway

`/runway` should call `/gate acquire` before deploy and `/gate release` after:

```bash
# In /runway Step 6:
/gate acquire || exit 1
bun run deploy
/gate release
```

## Auto-release

If lock is older than 10 minutes, auto-release (deploy stuck/crashed):

```bash
if [ -f "$LOCK_FILE" ]; then
  LOCK_TIME=$(cat "$LOCK_FILE" | python3 -c "import sys,json;print(json.load(sys.stdin).get('time',''))")
  AGE=$(python3 -c "from datetime import datetime;print(int((datetime.utcnow()-datetime.fromisoformat('$LOCK_TIME'.replace('Z','+00:00'))).total_seconds()))" 2>/dev/null || echo 0)
  if [ "$AGE" -gt 600 ]; then
    echo "⚠️ Lock expired (${AGE}s) — auto-releasing"
    rm "$LOCK_FILE"
  fi
fi
```

## Rules

- **Always acquire before deploy, release after**
- **Never force-remove someone else's lock** (unless expired)
- **10 minute auto-expire** prevents stuck locks
- Lock file is local — each machine has its own (OK for our team)
