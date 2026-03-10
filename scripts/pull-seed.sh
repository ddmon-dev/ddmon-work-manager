#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
source "$PROJECT_DIR/.env"

PROD_CONTAINER="$PROJECT_NAME-postgres-production"
DEV_CONTAINER="$PROJECT_NAME-postgres-dev"

# 컨테이너 실행 확인
if ! docker ps --format '{{.Names}}' | grep -q "^${PROD_CONTAINER}$"; then
  echo "[pull-seed] 오류: 운영 DB 컨테이너($PROD_CONTAINER)가 실행 중이 아닙니다."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${DEV_CONTAINER}$"; then
  echo "[pull-seed] 오류: 개발 DB 컨테이너($DEV_CONTAINER)가 실행 중이 아닙니다."
  exit 1
fi

# 확인 프롬프트
echo "[pull-seed] 운영 DB → 개발 DB 단방향 복사"
echo "[pull-seed] 주의: 개발 DB의 기존 데이터가 모두 덮어씌워집니다."
read -p "[pull-seed] 계속하시겠습니까? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "[pull-seed] 취소되었습니다."
  exit 0
fi

# 운영 DB 덤프
echo "[pull-seed] 운영 DB 덤프 중..."
DUMP=$(docker exec "$PROD_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password)

# 개발 DB 초기화 후 복원
echo "[pull-seed] 개발 DB 초기화 및 복원 중..."
docker exec -i "$DEV_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "$DUMP" | docker exec -i "$DEV_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  > /dev/null

echo "[pull-seed] 완료: 운영 DB → 개발 DB 복사 성공"
