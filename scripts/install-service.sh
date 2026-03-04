#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
source "$PROJECT_DIR/.env.project"

SERVICE_LABEL="com.ddmon.work-manager-react"
BACKUP_LABEL="com.ddmon.work-manager-react-backup"
SERVICE_PLIST="$SERVICE_LABEL.plist"
BACKUP_PLIST="$BACKUP_LABEL.plist"
DOMAIN_TARGET="gui/$(id -u)"

# 강제 빌드 (최신 코드로 설치 보장)
echo "[install] 빌드 중..."
cd "$PROJECT_DIR"
npm run build:production

echo "[install] LaunchAgent 설치 중..."

mkdir -p "$LAUNCH_AGENTS_DIR"

# 기존 서비스 언로드
launchctl bootout "$DOMAIN_TARGET/$SERVICE_LABEL" 2>/dev/null || true
launchctl bootout "$DOMAIN_TARGET/$BACKUP_LABEL" 2>/dev/null || true
launchctl remove "$SERVICE_LABEL" 2>/dev/null || true
launchctl remove "$BACKUP_LABEL" 2>/dev/null || true

# 기존 plist 삭제
rm -f "$LAUNCH_AGENTS_DIR/$SERVICE_PLIST"
rm -f "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST"

# 서버 서비스 plist 설치
sed -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
    -e "s|__PROJECT_NAME__|$PROJECT_NAME|g" \
  "$SCRIPT_DIR/$SERVICE_PLIST" \
  > "$LAUNCH_AGENTS_DIR/$SERVICE_PLIST"

# 백업 서비스 plist 설치
sed -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
    -e "s|__PROJECT_NAME__|$PROJECT_NAME|g" \
  "$SCRIPT_DIR/$BACKUP_PLIST" \
  > "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST"

# LaunchAgent 등록
launchctl bootstrap "$DOMAIN_TARGET" "$LAUNCH_AGENTS_DIR/$SERVICE_PLIST"
launchctl bootstrap "$DOMAIN_TARGET" "$LAUNCH_AGENTS_DIR/$BACKUP_PLIST"

# 시작 대기
LOG_FILE="/tmp/$PROJECT_NAME-stdout.log"
> "$LOG_FILE"

echo "[install] 서비스 시작 대기 중..."
tail -f "$LOG_FILE" &
TAIL_PID=$!

while ! grep -q "서버 시작 (port" "$LOG_FILE" 2>/dev/null; do
  if ! launchctl list "$SERVICE_LABEL" 2>/dev/null | grep -q '"PID"'; then
    kill $TAIL_PID 2>/dev/null
    echo "[install] ERROR: 서비스 시작 실패. 로그 확인:"
    echo "  stdout: $LOG_FILE"
    echo "  stderr: /tmp/$PROJECT_NAME-stderr.log"
    exit 1
  fi
  sleep 1
done
sleep 2
kill $TAIL_PID 2>/dev/null

echo "[install] 서비스 시작 완료!"
echo "  서버: http://localhost:7070"
echo "  로그: /tmp/$PROJECT_NAME-stdout.log, /tmp/$PROJECT_NAME-stderr.log"
echo "  백업: 매일 03:00 자동 실행"
