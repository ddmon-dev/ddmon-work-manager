#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_DIR="$HOME/Library/LaunchAgents"

echo "[install-service] LaunchAgent 설치 중..."

mkdir -p "$PLIST_DIR"

# 서버 서비스 plist 설치
sed "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  "$SCRIPT_DIR/com.ddmon.work-manager-react.plist" \
  > "$PLIST_DIR/com.ddmon.work-manager-react.plist"

# 백업 서비스 plist 설치
sed "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  "$SCRIPT_DIR/com.ddmon.work-manager-react-backup.plist" \
  > "$PLIST_DIR/com.ddmon.work-manager-react-backup.plist"

# LaunchAgent 등록
launchctl load "$PLIST_DIR/com.ddmon.work-manager-react.plist"
launchctl load "$PLIST_DIR/com.ddmon.work-manager-react-backup.plist"

echo "[install-service] 설치 완료"
echo "  서버: http://localhost:7070"
echo "  로그: /tmp/wm-react-stdout.log, /tmp/wm-react-stderr.log"
echo "  백업: 매일 03:00 자동 실행"
