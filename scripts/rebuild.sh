#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

SERVICE_LABEL="com.ddmon.work-manager-react"
DOMAIN_TARGET="gui/$(id -u)"

echo "[rebuild] 리빌드 시작..."

# LaunchAgent 서비스 중지 (KeepAlive 재시작 방지)
echo "[rebuild] 서비스 중지..."
launchctl bootout "$DOMAIN_TARGET/$SERVICE_LABEL" 2>/dev/null || true
sleep 1

# 마이그레이션 적용
echo "[rebuild] 마이그레이션 실행..."
cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.production ../../node_modules/.bin/drizzle-kit migrate

# 빌드 (클라이언트 + 서버)
echo "[rebuild] 빌드 중..."
cd "$PROJECT_DIR"
npm run build:production

# LaunchAgent 서비스 재시작
echo "[rebuild] 서비스 재시작..."
launchctl bootstrap "$DOMAIN_TARGET" "$HOME/Library/LaunchAgents/$SERVICE_LABEL.plist"

echo "[rebuild] 완료"
