#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[migrate-production] 마이그레이션 실행 (데이터 유지)..."

cd "$PROJECT_DIR/apps/server"
node --env-file=../../.env.production ../../node_modules/.bin/drizzle-kit migrate

echo "[migrate-production] 완료"
