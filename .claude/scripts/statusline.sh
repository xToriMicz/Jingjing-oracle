#!/bin/bash
# Jingjing Statusline — built-in statusLine (reads JSON from stdin)
# Output: 📊 Opus 4.6 56% | 🕐 08:24 | 10 Mar 2026 | Jingjing-oracle

ROOT="${CLAUDE_PROJECT_DIR:-/Users/angkana/Jingjing-oracle}"
CACHE="$ROOT/ψ/active/statusline.json"

# Read JSON from stdin (Claude Code provides this)
INPUT=$(cat)

# Save to cache for token-check.sh and other hooks
if [ -n "$INPUT" ]; then
  mkdir -p "$(dirname "$CACHE")"
  echo "$INPUT" > "$CACHE"
fi

# Set tmux pane title from project name
PROJECT=$(basename "$CLAUDE_PROJECT_DIR")
case "$PROJECT" in
  *Jingjing*|*jingjing*) PANE_TITLE="🧘 Jingjing (Conductor)" ;;
  *072*)                 PANE_TITLE="✍️ 072 Content Creator" ;;
  *kumo*|*Kumo*)         PANE_TITLE="☁️ Kumo Fullstack" ;;
  *sati*|*Sati*)         PANE_TITLE="🛡️ Sati Security" ;;
  *wiriya*|*Wiriya*)     PANE_TITLE="⚡ Wiriya Specialist" ;;
  *)                     PANE_TITLE="$PROJECT" ;;
esac
if [ -n "$TMUX_PANE" ]; then
  tmux select-pane -t "$TMUX_PANE" -T "$PANE_TITLE" 2>/dev/null
fi

# Time + Date + Project
TIME=$(date '+%H:%M')
DATE=$(date '+%d %b %Y')

# Context from stdin JSON
CONTEXT=""
if [ -n "$INPUT" ]; then
  model=$(echo "$INPUT" | jq -r '.model.display_name // empty' 2>/dev/null)
  pct=$(echo "$INPUT" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)

  if [ -n "$pct" ] && [ "$pct" != "null" ]; then
    pct=${pct%%.*}  # truncate decimals
    if [ "$pct" -ge 97 ] 2>/dev/null; then
      CONTEXT="🚨 ${model} ${pct}%"
    elif [ "$pct" -ge 95 ] 2>/dev/null; then
      CONTEXT="⚠️ ${model} ${pct}%"
    elif [ "$pct" -ge 80 ] 2>/dev/null; then
      CONTEXT="⚡ ${model} ${pct}%"
    else
      CONTEXT="📊 ${model} ${pct}%"
    fi
  fi
fi

# Output
if [ -n "$CONTEXT" ]; then
  echo "${CONTEXT} | 🕐 ${TIME} | ${DATE} | ${PROJECT}"
else
  echo "🕐 ${TIME} | ${DATE} | ${PROJECT}"
fi
