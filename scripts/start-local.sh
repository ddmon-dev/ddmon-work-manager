#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[start-local] 로컬 운영환경 시작..."

# Docker PostgreSQL 시작
echo "[start-local] PostgreSQL 컨테이너 시작 (port 7020)..."
docker compose -f "$PROJECT_DIR/docker-compose.local.yml" up -d

# 컨테이너 준비 대기
echo "[start-local] DB 준비 대기 중..."
for i in $(seq 1 30); do
  if docker exec wm-postgres-local pg_isready -U wm_user -d work_manager > /dev/null 2>&1; then
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

# Hono 서버 시작
echo "[start-local] 서버 시작 (port 7070)..."
node --env-file=../../.env.local dist/index.js
