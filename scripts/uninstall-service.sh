#!/bin/bash

PLIST_DIR="$HOME/Library/LaunchAgents"

echo "[uninstall-service] LaunchAgent 제거 중..."

# LaunchAgent 해제
if [ -f "$PLIST_DIR/com.ddmon.work-manager-react.plist" ]; then
  launchctl unload "$PLIST_DIR/com.ddmon.work-manager-react.plist" 2>/dev/null || true
  rm -f "$PLIST_DIR/com.ddmon.work-manager-react.plist"
  echo "  서버 서비스 제거 완료"
fi

if [ -f "$PLIST_DIR/com.ddmon.work-manager-react-backup.plist" ]; then
  launchctl unload "$PLIST_DIR/com.ddmon.work-manager-react-backup.plist" 2>/dev/null || true
  rm -f "$PLIST_DIR/com.ddmon.work-manager-react-backup.plist"
  echo "  백업 서비스 제거 완료"
fi

echo "[uninstall-service] 완료"
