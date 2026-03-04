#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
source "$PROJECT_DIR/.env.project"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/work_manager_${TIMESTAMP}.sql"

echo "[backup-db] DB 백업 중: $BACKUP_FILE"

docker exec $PROJECT_NAME-postgres-production pg_dump \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  --no-password \
  > "$BACKUP_FILE"

echo "[backup-db] 백업 완료: $BACKUP_FILE"

# 최근 30개만 유지
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 30 ]; then
  echo "[backup-db] 오래된 백업 정리 중..."
  ls -1t "$BACKUP_DIR"/*.sql | tail -n +31 | xargs rm -f
  echo "[backup-db] 정리 완료 (최근 30개 유지)"
fi
