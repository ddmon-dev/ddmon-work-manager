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
├── scripts/             # 운영 스크립트
├── .env                 # 프로젝트명 + DB 크레덴셜 (gitignore)
├── .env.example         # .env 템플릿
├── docker-compose.yml   # 개발환경 Docker
├── docker-compose.production.yml  # 운영환경 Docker
├── .env.development     # 개발환경 변수
└── .env.production      # 운영환경 변수 (gitignore)
```

npm workspaces 기반. 패키지 스코프: `@packages/*`.

### 프로젝트 환경변수 (`.env`)

`.env`에서 프로젝트명과 DB 크레덴셜을 관리. Docker Compose, 스크립트, plist에서 참조.

**이 파일은 `.gitignore`에 포함** — `.env.example`을 복사하여 생성.

```bash
cp .env.example .env
# .env 내 POSTGRES_USER, POSTGRES_PASSWORD 를 실제 값으로 변경
```

```env
PROJECT_NAME=work-manager
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=work_manager
```

## 개발환경

### 포트 할당

| 서비스 | 포트 |
|--------|------|
| Client (Vite dev server) | 8000 |
| Server (Hono) | 8001 |
| PostgreSQL | 8002 |

Vite 개발 서버가 `/api` 요청을 서버(8001)로 프록시.

### Docker

`docker-compose.yml` (프로젝트명: `${PROJECT_NAME}-dev`)

- PostgreSQL 17 Alpine
- 크레덴셜: `.env`의 `POSTGRES_USER`/`POSTGRES_PASSWORD` 참조
- 컨테이너: `${PROJECT_NAME}-postgres-dev`
- 볼륨: `${PROJECT_NAME}-dev_pgdata`
- `docker compose up -d` 명령 사용 (`.env` 자동 로드)

### 환경 변수 (`.env.development`)

```env
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:8002/work_manager
PORT=8001
BETTER_AUTH_SECRET=dev-secret-do-not-use-in-production
BETTER_AUTH_URL=http://localhost:8001
CLIENT_URL=http://localhost:8000
```

`.env.development.example`을 복사하여 생성. DB 크레덴셜은 `.env`와 일치시킬 것.

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

개발환경과 완전히 분리된 독립 환경. macOS LaunchAgent로 시스템 부팅 시 자동 기동.

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

`docker-compose.production.yml` (프로젝트명: `${PROJECT_NAME}-production`)

- PostgreSQL 17 Alpine, 포트 7020
- 컨테이너: `${PROJECT_NAME}-postgres-production`
- 볼륨: `${PROJECT_NAME}-production_pgdata` (개발환경과 완전 분리)
- `restart: unless-stopped`
- `docker compose --env-file .env` 명령 사용

### 환경 변수 (`.env.production`)

```env
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:7020/work_manager
BETTER_AUTH_SECRET=your-secret-change-this-in-production
BETTER_AUTH_URL=http://localhost:7070
CLIENT_URL=http://localhost:7070
PORT=7070
NODE_ENV=production
SERVE_STATIC=true
STATIC_DIR=../../apps/client/dist-production
```

`.env.production.example`을 복사하여 생성. DB 크레덴셜은 `.env`와 일치시킬 것.

### 빌드

```bash
npm run build:production    # 클라이언트(dist-production) + 서버(tsup) 빌드
```

- **클라이언트**: Vite → `apps/client/dist-production/`
- **서버**: tsup → `apps/server/dist/`
  - `noExternal: [/@packages\/.*/]` — 워크스페이스 패키지를 번들에 포함
  - tsup 사용 이유: `moduleResolution: bundler`와 Node.js ESM 간 디렉토리 임포트 충돌 해결

### 스크립트 (`scripts/`)

| 명령어 | 스크립트 | 설명 |
|--------|---------|------|
| `npm run production:start` | `start-production.sh` | Docker 시작 → 마이그레이션 → 서버 기동 |
| `npm run production:stop` | `stop-production.sh` | DB 백업 → 서버 종료 → Docker 중지 |
| `npm run production:rebuild` | `rebuild.sh` | 서버만 종료 → 리빌드 → 재시작 (Docker 유지) |
| `npm run production:migrate` | — | 마이그레이션만 (데이터 유지) |
| `npm run production:seed` | — | 시드 데이터 적용 |
| `npm run production:backup` | `backup-db.sh` | DB 백업 (최근 30개 유지) |
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

`0000_initial` ~ `0004_add_project_schedules` (5개).

### 새 마이그레이션 생성

```bash
npm run db:generate -- --name "add_xxx"    # --name으로 의미 있는 이름 부여
npm run db:migrate                          # 마이그레이션 실행
```

### 운영환경 마이그레이션

drizzle-kit은 현재 디렉토리 기준으로 경로 해석하므로 `apps/server`에서 실행 필수:

```bash
npm run production:migrate
# 내부: node --env-file=../../.env.production ../../node_modules/.bin/drizzle-kit migrate
```

### 시드 데이터

`apps/server/src/db/seed.ts` — 기존 Next.js 운영 DB에서 이관한 데이터. `.gitignore`에 포함(개인정보).

```bash
npm run db:reset      # reset.ts(DB 초기화) + migrate + seed 통합
npm run production:seed    # 운영환경에 시드 적용
```
