# Work Manager

외주 고객정보와 견적서 작성 및 관리를 위한 개인용 내부 시스템.

## 기술 스택

| 분야 | 기술 |
|------|------|
| Frontend | React 19 + Vite |
| Backend | Hono |
| Language | TypeScript (Strict Mode) |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| CSS | Tailwind CSS V4 |
| UI | Shadcn UI |
| Form | React Hook Form + Zod |
| Auth | Better Auth |

## 시작하기

### 사전 요구사항

- Node.js 24+
- Docker Desktop

### 환경 설정

```bash
# 1) 환경변수 파일 생성
cp .env.example .env
cp .env.development.example .env.development

# 2) .env에서 DB 크레덴셜 설정
# 3) .env.development의 DATABASE_URL을 .env 크레덴셜과 일치시킬 것
```

### 개발 서버 실행

```bash
npm install
npm run db:up         # Docker PostgreSQL 시작
npm run db:migrate    # 마이그레이션 실행
npm run dev           # client(8000) + server(8001) 동시 기동
```

## 주요 명령어

### 개발

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 클라이언트 + 서버 동시 기동 |
| `npm run dev:start` | DB + 클라이언트 + 서버 + Studio 통합 시작 |
| `npm run dev:stop` | Docker PostgreSQL 중지 |
| `npm run type-check` | TypeScript 타입 체크 |

### DB

| 명령어 | 설명 |
|--------|------|
| `npm run db:up` | Docker PostgreSQL 시작 (port 8002) |
| `npm run db:generate` | 마이그레이션 파일 생성 |
| `npm run db:migrate` | 마이그레이션 실행 |
| `npm run db:reset` | DB 초기화 + 마이그레이션 + 시드 |
| `npm run db:studio` | Drizzle Studio |

### 운영

| 명령어 | 설명 |
|--------|------|
| `npm run production:start` | Docker + 마이그레이션 + 서버 기동 |
| `npm run production:stop` | 백업 + 서버 종료 + Docker 중지 |
| `npm run production:rebuild` | 서버 종료 → 리빌드 → 재시작 |
| `npm run production:install` | LaunchAgent 등록 |

## 프로젝트 구조

```
├── apps/
│   ├── client/          # React 19 + Vite (FSD 구조)
│   └── server/          # Hono API 서버
├── packages/
│   ├── schemas/         # Zod 스키마 (클라이언트·서버 공유)
│   ├── types/           # 상수, 타입 정의
│   └── utils/           # 금액 계산 등 유틸리티
├── scripts/             # 운영 스크립트
├── .env                 # 프로젝트명 + DB 크레덴셜 (gitignore)
├── docker-compose.yml   # 개발환경 Docker
└── docker-compose.production.yml  # 운영환경 Docker
```

## 문서

- [docs/architecture.md](docs/architecture.md) — 디렉토리 구조, FSD, 데이터 페칭, 폼 패턴
- [docs/api.md](docs/api.md) — 인증, API 응답 패턴, 엔드포인트 레퍼런스
- [docs/database.md](docs/database.md) — 테이블 스키마, 관계, FK 전략, 마이그레이션
- [docs/infrastructure.md](docs/infrastructure.md) — 개발/운영 환경, Docker, 빌드, LaunchAgent
