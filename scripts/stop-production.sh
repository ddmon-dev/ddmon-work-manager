#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
source "$PROJECT_DIR/.env.project"

echo "[stop-production] 운영환경 중지..."

# 백업 실행
echo "[stop-production] DB 백업 중..."
"$SCRIPT_DIR/backup-db.sh" || echo "[stop-production] 경고: 백업 실패 (계속 진행)"

# Hono 프로세스 종료
if pgrep -f "dist/index.js" > /dev/null 2>&1; then
  echo "[stop-production] 서버 프로세스 종료..."
  pkill -f "dist/index.js" || true
fi

# Docker PostgreSQL 중지
echo "[stop-production] PostgreSQL 컨테이너 중지..."
docker compose --env-file "$PROJECT_DIR/.env.project" -f "$PROJECT_DIR/docker-compose.production.yml" down

echo "[stop-production] 완료"
