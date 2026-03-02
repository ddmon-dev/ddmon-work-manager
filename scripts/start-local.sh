#!/bin/bash
set -e

# fnm 환경 초기화 (LaunchAgent에서 실행 시 필요)
export PATH="/opt/homebrew/bin:$PATH"
eval "$(fnm env)" 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
source "$PROJECT_DIR/project.env"

echo "[start-local] 로컬 운영환경 시작..."

# Docker Desktop 실행 (이미 실행 중이면 무시)
open -a Docker 2>/dev/null || true

echo "[start-local] Docker 대기 중..."
while ! docker info >/dev/null 2>&1; do
  sleep 2
done

# Docker PostgreSQL 시작
echo "[start-local] PostgreSQL 컨테이너 시작 (port 7020)..."
docker compose --env-file "$PROJECT_DIR/project.env" -f "$PROJECT_DIR/docker-compose.local.yml" up -d

# 컨테이너 준비 대기
echo "[start-local] DB 준비 대기 중..."
for i in $(seq 1 30); do
  if docker exec $PROJECT_NAME-postgres-local pg_isready -U wm_user -d work_manager > /dev/null 2>&1; then
    echo "[start-local] DB 준비 완료"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[start-local] 오류: DB 시작 타임아웃"
    exit 1
  fi
  sleep 1
done

# 마이그레이션
echo "[start-local] 마이그레이션 실행..."
cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.local ../../node_modules/.bin/drizzle-kit migrate

# 빌드 산출물 확인 (없으면 자동 빌드)
if [ ! -f "$PROJECT_DIR/apps/server/dist/index.js" ]; then
  echo "[start-local] 빌드 산출물 없음. 빌드 실행..."
  cd "$PROJECT_DIR"
  npm run build:local
fi

# Hono 서버 시작
echo "[start-local] 서버 시작 (port 7070)..."
cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.local dist/index.js
