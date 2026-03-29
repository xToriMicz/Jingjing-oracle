#!/bin/bash
# Auto-inject relevant learnings from ARRA at SessionStart
# Detects current repo and fetches related learnings

REPO_NAME=$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")

# Fetch recent learnings from ARRA via curl (MCP API)
# Since we can't call MCP from shell, output a reminder for the AI
cat <<EOF
📚 Auto-Inject Learnings — repo: $REPO_NAME
เมื่อเริ่ม session ให้ทำ:
1. arra_search({ query: "$REPO_NAME", limit: 5 }) ดึง learnings ที่เกี่ยวข้อง
2. อ่าน learnings แล้วจำไว้ใช้ระหว่าง session
3. ถ้าเจอ pattern ที่เคย learn → ใช้เลย ไม่ต้องค้นหาใหม่
EOF
