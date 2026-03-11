#!/bin/bash
# Jingjing Token Check — monitor context usage and auto-handoff
#
# - Reads context from ψ/active/statusline.json
# - 95%: Warn to wrap up
# - 97%: Auto-log handoff to ψ/inbox/handoff.log

ROOT="${CLAUDE_PROJECT_DIR:-/Users/angkana/Jingjing-oracle}"
FILE="$ROOT/ψ/active/statusline.json"

[ ! -f "$FILE" ] && exit 0

model=$(jq -r '.model.display_name' "$FILE" 2>/dev/null)
used=$(jq -r '.context_window.current_usage | .input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens' "$FILE" 2>/dev/null)
total=$(jq -r '.context_window.context_window_size' "$FILE" 2>/dev/null)

[ -z "$total" ] || [ "$total" = "null" ] && exit 0

usable=$((total * 80 / 100))
pct=$((used * 100 / usable))
used_k=$((used / 1000))
usable_k=$((usable / 1000))

if [ "$pct" -ge 97 ]; then
  HANDOFF_LOG="$ROOT/ψ/inbox/handoff.log"

  # Rate limit: 1 entry per hour
  if [ -f "$HANDOFF_LOG" ]; then
    LAST_ENTRY=$(grep -E "^## [0-9]{4}-[0-9]{2}-[0-9]{2}" "$HANDOFF_LOG" | tail -1 | cut -d'|' -f1 | sed 's/## //')
    if [ -n "$LAST_ENTRY" ]; then
      LAST_TS=$(date -j -f "%Y-%m-%d %H:%M " "$LAST_ENTRY " +%s 2>/dev/null || echo 0)
      NOW_TS=$(date +%s)
      DIFF=$((NOW_TS - LAST_TS))
      if [ "$DIFF" -lt 3600 ]; then
        echo "🚨 CONTEXT ${pct}% — นิ่งแล้วจะเห็น — Run /rrr to capture learnings. (logged $(($DIFF / 60))m ago)"
        exit 0
      fi
    fi
  fi

  echo "🚨 CONTEXT ${pct}% — Run /rrr now! Handoff logged."

  RECENT_COMMITS=$(cd "$ROOT" && git log --oneline -3 2>/dev/null | sed 's/^/  /')

  echo "" >> "$HANDOFF_LOG"
  echo "---" >> "$HANDOFF_LOG"
  echo "## $(date '+%Y-%m-%d %H:%M') | ${pct}%" >> "$HANDOFF_LOG"
  echo "" >> "$HANDOFF_LOG"
  echo "**Commits**:" >> "$HANDOFF_LOG"
  echo "$RECENT_COMMITS" >> "$HANDOFF_LOG"
  echo "" >> "$HANDOFF_LOG"
elif [ "$pct" -ge 95 ]; then
  echo "⚠️ ${model} ${pct}% (${used_k}k/${usable_k}k usable) — Wrap up, prepare handoff"
else
  echo "📊 ${model} ${pct}% (${used_k}k/${usable_k}k usable)"
fi
