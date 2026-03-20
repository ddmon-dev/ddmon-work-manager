# CLAUDE.md

외주 고객정보와 견적서 작성 및 관리를 위한 개인용 내부 시스템.
React + Hono + Drizzle 기반. 프로덕션 레벨 기준으로 작업한다.

> 이 프로젝트에서 "운영"은 **로컬 운영환경**(macOS LaunchAgent + Docker)을 의미한다. 별도 원격 서버 배포 없이 로컬 머신이 곧 운영 서버다.

## 핵심 원칙 (우직실)

- **우아함**: 불필요한 복잡성 없이 깔끔한 구조
- **직관성**: 누가 봐도 바로 이해되는 명확한 코드
- **실용성**: 과도한 추상화보다 실제 개발과 유지보수에 도움되는 구조
- **오버엔지니어링 금지**: 컨텍스트와 상황에 맞는 적절한 수준의 개발

## 기술 스택

| 분야 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite |
| **Backend** | Hono |
| **Language** | TypeScript (Strict Mode) |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL |
| **CSS** | Tailwind CSS V4 |
| **UI** | Shadcn UI |
| **Form** | React Hook Form + Zod |
| **Auth** | Better Auth |

> 정확한 버전은 각 `package.json` 참조.

## 모노레포 구조

```
├── apps/
│   ├── client/       # React 19 + Vite (FSD 구조)
│   └── server/       # Hono (API 서버)
├── packages/
│   ├── schemas/      # Zod 스키마 (클라이언트·서버 공유)
│   ├── types/        # 상수, 타입 정의
│   └── utils/        # 금액 계산 등 유틸리티
```

## 개발 명령어

```bash
npm run dev           # client(8000) + server(8001) 동시 기동
npm run dev:client    # 클라이언트만
npm run dev:server    # 서버만
npm run db:up         # Docker PostgreSQL 시작 (port 8002)
npm run db:reset      # 마이그레이션 + 시드 재적용
npm run db:studio     # Drizzle Studio
npm run type-check    # TypeScript 타입 체크
npm run production:rebuild # 운영 배포 (마이그레이션 + 빌드 + 서비스 재시작)
```

## DB 설계 원칙

- **DB는 설계 단계부터 탄탄하게**: UI/API는 쉽게 바꿀 수 있지만, 데이터가 저장되는 DB는 변경 비용이 크다. 개인용 로컬 시스템이라고 대충 설계하지 않는다.
- **향후 확장을 고려한 구조**: 현재 개인용이지만 향후 서비스화 가능성이 있다. 확장 가능한 스키마 설계를 지향한다.
- **원천징수 지원 이유**: 앞으로 원천징수 프로젝트는 거의 없지만, (1) 사업자 등록 전 원천세 수주 데이터 호환성, (2) 향후 서비스화 대비로 유지한다.

## 개발 규칙

- **파일명**: kebab-case, 엔티티 프리픽스 제거 (폴더가 컨텍스트 제공)
- **FSD**: 클라이언트 Feature-Sliced Design 구조 유지. 의존성 방향: pages → features → shared
- **Path Alias**: `@/*` = `./src/*` (클라이언트)
- **API 응답**: `{ success: true, data }` / `{ success: false, error, message }`
- **DB 삭제**: 소프트 삭제 기본 (schedules, todos만 하드 삭제)
- **Git**: 커밋: `타입: 제목` (feat, fix, refactor, docs, style, test, chore). push는 main 브랜치만 (다른 브랜치는 명시적 지시 없이 push하지 않는다)
- **마이그레이션 네이밍**: `npm run db:generate -- --name "add_xxx"` 형식 사용 (`add_xxx`, `drop_xxx`, `alter_xxx`)
- **마이그레이션 통합**: 운영 DB에 적용된 마이그레이션은 절대 수정/통합/삭제하지 않는다. 미적용 마이그레이션만 main 머지 전에 순효과로 통합

## 문서

아키텍처, API, DB, 인프라 등에 영향을 주는 변경을 완료하면 해당 문서도 함께 업데이트한다.

- **[docs/architecture.md](docs/architecture.md)** — 디렉토리 구조, FSD, manage-modules 시스템, 데이터 페칭, 폼 패턴
- **[docs/api.md](docs/api.md)** — 인증, API 응답 패턴, 엔드포인트 레퍼런스, 비즈니스 로직
- **[docs/database.md](docs/database.md)** — 테이블 스키마, 관계, FK 전략, 마이그레이션
- **[docs/infrastructure.md](docs/infrastructure.md)** — 개발/운영 환경, Docker, 빌드, LaunchAgent
