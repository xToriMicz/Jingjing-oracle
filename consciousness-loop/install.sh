#!/bin/bash
# Install Consciousness Loop as launchd service
# Runs loop every 15 minutes, persists across restarts

PLIST_NAME="com.xtori.consciousness-loop"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
LOOP_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$LOOP_DIR/logs"
mkdir -p "$LOG_DIR"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>$HOME/.bun/bin/bun</string>
        <string>run</string>
        <string>${LOOP_DIR}/loop.ts</string>
        <string>--once</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(dirname "$LOOP_DIR")</string>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/loop.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/loop.err</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the service
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "✅ Consciousness Loop installed as launchd service"
echo "   Runs every 15 minutes (900s)"
echo "   Logs: $LOG_DIR/"
echo "   Plist: $PLIST_PATH"
echo ""
echo "Commands:"
echo "   launchctl list | grep consciousness    # check status"
echo "   launchctl unload $PLIST_PATH            # stop"
echo "   launchctl load $PLIST_PATH              # start"
