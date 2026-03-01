#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[stop-local] 로컬 운영환경 중지..."

# 백업 실행
echo "[stop-local] DB 백업 중..."
"$SCRIPT_DIR/backup-db.sh" || echo "[stop-local] 경고: 백업 실패 (계속 진행)"

# Hono 프로세스 종료
if pgrep -f "dist/index.js" > /dev/null 2>&1; then
  echo "[stop-local] 서버 프로세스 종료..."
  pkill -f "dist/index.js" || true
fi

# Docker PostgreSQL 중지
echo "[stop-local] PostgreSQL 컨테이너 중지..."
docker compose -f "$PROJECT_DIR/docker-compose.local.yml" down

echo "[stop-local] 완료"
