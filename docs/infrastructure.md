# 인프라

## 모노레포 구조

npm workspaces 기반 모노레포.

```
├── apps/
│   ├── client/          # React 19 + Vite
│   └── server/          # Hono API 서버
├── packages/
│   ├── schemas/         # Zod 스키마 (클라이언트·서버 공유)
│   ├── types/           # 상수, 타입 정의
│   └── utils/           # 금액 계산 등 유틸리티
├── scripts/             # 유틸리티 스크립트
├── storage/             # 로컬 파일 스토리지 (gitignore)
│   ├── files/           # 드라이브 파일 (flat, UUID 기반)
│   └── editor/          # 에디터 첨부 이미지 (flat, UUID 기반)
├── .env                 # 프로젝트명 + DB 크레덴셜 + Docker 설정 (gitignore)
├── .env.example         # .env 템플릿
├── .env.local           # 앱 환경 변수 (gitignore)
├── .env.local.example   # .env.local 템플릿
└── docker-compose.yml   # Docker (환경변수로 dev/production 분기)
```

npm workspaces 기반. 패키지 스코프: `@packages/*`.

### 환경 분리 전략

개발(`~/dev/ddmon/work-manager/`)과 운영(`~/production/work-manager/`)을 **별도 디렉토리**로 완전 분리. 하나의 디렉토리 = 하나의 환경. 같은 `docker-compose.yml`, 같은 스크립트를 사용하되 `.env`와 `.env.local`의 값만 다르게 설정.

### 프로젝트 환경변수 (`.env`)

`.env`에서 프로젝트명, DB 크레덴셜, Docker 설정을 관리. Docker Compose, 스크립트에서 참조.

**이 파일은 `.gitignore`에 포함** — `.env.example`을 복사하여 생성.

```bash
cp .env.example .env
# .env 내 POSTGRES_USER, POSTGRES_PASSWORD 를 실제 값으로 변경
```

```env
PROJECT_NAME=work-manager
ENVIRONMENT=dev              # dev | production
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=work_manager
POSTGRES_PORT=8002           # 개발: 8002, 운영: 7020
```

### 앱 환경변수 (`.env.local`)

Hono 서버와 Drizzle에서 사용하는 환경변수. `.env.local.example`을 복사하여 생성. DB 크레덴셜은 `.env`와 일치시킬 것.

```env
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:8002/work_manager
PORT=8001
BETTER_AUTH_SECRET=your-secret-change-this-in-production
BETTER_AUTH_URL=http://localhost:8001
CLIENT_URL=http://localhost:8000
STORAGE_DIR=../../storage
MAX_FILE_SIZE_MB=100
MAX_EDITOR_IMAGE_SIZE_MB=10
```

### 파일 스토리지

로컬 파일시스템 기반. `STORAGE_DIR` 환경변수로 경로 지정 (기본값: `../../storage`).

- 구현: `apps/server/src/lib/storage.ts` — `uploadFile`, `deleteFile`, `getFile`, `ensureStorageDir`
- 서버 시작 시 `ensureStorageDir()`로 디렉토리 자동 생성
- 파일은 UUID 기반으로 flat 저장. 폴더 계층은 DB에서만 관리
- `storage/` 디렉토리는 `.gitignore`에 포함

## 개발환경

### 포트 할당

| 서비스 | 포트 |
|--------|------|
| Client (Vite dev server) | 8000 |
| Server (Hono) | 8001 |
| PostgreSQL | 8002 |

Vite 개발 서버가 `/api` 요청을 서버(8001)로 프록시.

### Docker

`docker-compose.yml` — `.env`의 `ENVIRONMENT=dev`, `POSTGRES_PORT=8002` 참조.

- PostgreSQL 17 Alpine
- 크레덴셜: `.env`의 `POSTGRES_USER`/`POSTGRES_PASSWORD` 참조
- 컨테이너: `${PROJECT_NAME}-postgres-dev`
- 볼륨: `${PROJECT_NAME}-dev_pgdata`
- `docker compose up -d` 명령 사용 (`.env` 자동 로드)

### 명령어

```bash
# 통합 시작/종료
npm run dev:start     # DB 시작 → client + server + Drizzle Studio 동시 기동
npm run dev:stop      # Docker PostgreSQL 중지 (Ctrl+C로 dev:start 종료 후 실행)

# 개별 실행
npm run dev           # client(8000) + server(8001) 동시 기동 (concurrently)
npm run dev:client    # 클라이언트만
npm run dev:server    # 서버만 (tsx watch, hot reload)
npm run db:up         # Docker PostgreSQL 시작
npm run db:down       # Docker 중지
npm run db:generate   # Drizzle 마이그레이션 생성
npm run db:migrate    # 마이그레이션 실행
npm run db:seed       # 시드 데이터 적용
npm run db:reset      # reset + migrate + seed 통합
npm run db:studio     # Drizzle Studio (DB GUI)
npm run type-check    # TypeScript 타입 체크
```

## 운영환경

개발환경과 완전히 분리된 독립 디렉토리(`~/production/work-manager/`). macOS LaunchAgent로 시스템 부팅 시 자동 기동.

### 포트 할당

| 서비스 | 포트 |
|--------|------|
| Server (Hono + 정적 파일 서빙) | 7070 |
| PostgreSQL | 7020 |

클라이언트 별도 서버 없음 — Hono가 빌드된 정적 파일을 직접 서빙.

### SERVE_STATIC 모드

서버의 `SERVE_STATIC` 환경변수로 동작 분기:

| SERVE_STATIC | 동작 |
|-------------|------|
| `true` (운영) | `/assets/*`, `/fonts/*` 정적 서빙 + SPA fallback |
| 미설정 (개발) | CORS 미들웨어 활성화, `/` → JSON 응답 |

### Docker

같은 `docker-compose.yml` 사용 — `.env`의 `ENVIRONMENT=production`, `POSTGRES_PORT=7020` 참조.

- PostgreSQL 17 Alpine, 포트 7020
- 컨테이너: `${PROJECT_NAME}-postgres-production`
- 볼륨: `${PROJECT_NAME}-production_pgdata` (개발환경과 완전 분리)
- `restart: unless-stopped`

### 환경 변수 (`.env.local`)

운영 디렉토리의 `.env.local`:

```env
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:7020/work_manager
BETTER_AUTH_SECRET=your-secret-change-this-in-production
BETTER_AUTH_URL=http://localhost:7070
CLIENT_URL=http://localhost:7070
PORT=7070
NODE_ENV=production
SERVE_STATIC=true
STATIC_DIR=../../apps/client/dist
STORAGE_DIR=../../storage
```

### 빌드

```bash
npm run build    # 클라이언트(dist/) + 서버(tsup) 빌드
```

- **클라이언트**: Vite → `apps/client/dist/`
- **서버**: tsup → `apps/server/dist/`
  - `noExternal: [/@packages\/.*/]` — 워크스페이스 패키지를 번들에 포함
  - `clean: true` — 빌드 전 dist/ 디렉토리 정리
  - tsup 사용 이유: `moduleResolution: bundler`와 Node.js ESM 간 디렉토리 임포트 충돌 해결
  - **tsc/tsup 분리**: 모든 tsconfig에 `emitDeclarationOnly: true` 설정. tsc는 .d.ts만 생성하고, JS 빌드는 tsup이 전담

### 스크립트

운영 전용 스크립트는 운영 디렉토리(`~/production/work-manager/scripts/`)에서만 관리. git으로 추적하지 않음.

| 명령어 | 스크립트 | 설명 |
|--------|---------|------|
| `npm run production:start` | `start-production.sh` | Docker 시작 → 마이그레이션 → 서버 기동 |
| `npm run production:stop` | `stop-production.sh` | DB 백업 → 서버 종료 → Docker 중지 |
| `npm run production:rebuild` | `rebuild.sh` | 서버만 종료 → 리빌드 → 재시작 (Docker 유지) |
| `npm run production:migrate` | — | 마이그레이션만 (데이터 유지) |
| `npm run production:seed` | — | 시드 데이터 적용 |
| `npm run production:backup` | `backup-db.sh` | DB 백업 (최근 30개 유지) |
| `npm run db:pull-seed` | `pull-seed.sh` | 운영 DB → 개발 DB 단방향 복사 |
| `npm run production:install` | `install-service.sh` | LaunchAgent 등록 |
| `npm run production:uninstall` | `uninstall-service.sh` | LaunchAgent 제거 |

백업 위치: `backups/work_manager_YYYYMMDD_HHMMSS.sql`

### 워크플로우

| 시나리오 | 명령어 |
|---------|--------|
| 초기 배포 | `npm run production:install` (빌드 자동 포함) |
| 유지보수 (코드/DB 변경) | `npm run production:rebuild` |
| 완전 종료 | `npm run production:stop` |
| 서비스 제거 | `npm run production:uninstall` |

### LaunchAgent

| plist | 역할 |
|-------|------|
| `com.ddmon.work-manager-react.plist` | 시스템 부팅 시 `start-production.sh` 실행. KeepAlive 설정 |
| `com.ddmon.work-manager-react-backup.plist` | 매일 03:00 UTC에 `backup-db.sh` 실행 |

로그 위치: `/tmp/work-manager-stdout.log`, `/tmp/work-manager-stderr.log`

설치: `npm run production:install` — sed로 `__PROJECT_DIR__`, `__PROJECT_NAME__` 치환 후 `~/Library/LaunchAgents/`에 복사.

## DB 마이그레이션

Drizzle Kit 사용. 설정 파일: `apps/server/drizzle.config.ts`

```
스키마: apps/server/src/db/schema/index.ts
출력:  apps/server/drizzle/migrations/
```

`0000_initial` ~ `0008_add_favorite_order_to_files` (9개).

### 새 마이그레이션 생성

```bash
npm run db:generate -- --name "add_xxx"    # --name으로 의미 있는 이름 부여
npm run db:migrate                          # 마이그레이션 실행
```

### 마이그레이션 통합 규칙

- **운영 DB에 적용된 마이그레이션은 절대 수정/통합/삭제하지 않는다**
- 피쳐 개발 중 여러 개 생긴 미적용 마이그레이션만 main 머지 전에 순효과로 통합

### 운영환경 마이그레이션

운영 디렉토리에서 동일한 `npm run db:migrate` 사용 (`.env.local`이 운영 DB를 가리킴):

```bash
npm run production:migrate
# 내부: npm run db:migrate --workspace=apps/server
```

### 시드 데이터

`apps/server/src/db/seed.ts` — 기존 Next.js 운영 DB에서 이관한 데이터. `.gitignore`에 포함(개인정보).

```bash
npm run db:reset           # reset.ts(DB 초기화) + migrate + seed 통합
npm run production:seed    # 운영환경에 시드 적용
```
