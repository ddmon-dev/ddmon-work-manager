#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[rebuild] 재빌드 시작..."

# 서버 프로세스 종료 (Docker는 유지)
if pgrep -f "dist/index.js" > /dev/null 2>&1; then
  echo "[rebuild] 서버 프로세스 종료..."
  pkill -f "dist/index.js" || true
  sleep 1
fi

# 마이그레이션 적용
echo "[rebuild] 마이그레이션 실행..."
cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.local ../../node_modules/.bin/drizzle-kit migrate

# 빌드 (클라이언트 + 서버)
echo "[rebuild] 빌드 중..."
cd "$PROJECT_DIR"
npm run build:local

# 서버 재시작
echo "[rebuild] 서버 시작 (port 7070)..."
cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.local dist/index.js
