#!/bin/bash
# Auto-detect topic change (Thai + English)

MSG="$1"

if echo "$MSG" | grep -qiE "กลับไปทำ|กลับไปเรื่อง|เปลี่ยนเรื่อง|ขอคุยเรื่อง|switch to|back to|let's work on"; then
    TOPIC=$(echo "$MSG" | sed -E 's/.*(กลับไปทำ|กลับไปเรื่อง|เปลี่ยนเรื่อง|ขอคุยเรื่อง|switch to|back to|let'"'"'s work on)[[:space:]]*//' | cut -d' ' -f1-3)
    if [[ -n "$TOPIC" ]]; then
        echo "🔄 Topic switch detected: $TOPIC"
    fi
fi
