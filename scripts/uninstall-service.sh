#!/bin/bash

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

SERVICE_LABEL="com.ddmon.work-manager-react"
BACKUP_LABEL="com.ddmon.work-manager-react-backup"
DOMAIN_TARGET="gui/$(id -u)"

echo "[uninstall] LaunchAgent 제거 중..."

# 서버 서비스 제거
launchctl bootout "$DOMAIN_TARGET/$SERVICE_LABEL" 2>/dev/null || true
launchctl remove "$SERVICE_LABEL" 2>/dev/null || true
rm -f "$LAUNCH_AGENTS_DIR/$SERVICE_LABEL.plist"
echo "  서버 서비스 제거 완료"

# 백업 서비스 제거
launchctl bootout "$DOMAIN_TARGET/$BACKUP_LABEL" 2>/dev/null || true
launchctl remove "$BACKUP_LABEL" 2>/dev/null || true
rm -f "$LAUNCH_AGENTS_DIR/$BACKUP_LABEL.plist"
echo "  백업 서비스 제거 완료"

echo "[uninstall] 완료"
