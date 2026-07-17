# CLAUDE.md

외주 고객정보와 견적서 작성 및 관리를 위한 개인용 내부 시스템.
React + Hono + Drizzle 기반. 프로덕션 레벨 기준으로 작업한다.

> 이 프로젝트에서 "운영"은 **로컬 운영환경**(macOS LaunchAgent + Docker)을 의미한다. 별도 원격 서버 배포 없이 로컬 머신이 곧 운영 서버다.

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
└── scripts/          # 유틸리티 스크립트
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
npm run deploy            # 운영 배포 (main push → 운영 pull → install → rebuild)
npm run production:rebuild # 운영 디렉토리에서 직접 rebuild만
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
- **Git 전략**:
  - **커밋 메시지**: `타입: 제목` (feat, fix, refactor, docs, style, test, chore)
  - **작업 브랜치**: `dev` 가 기본 개발 브랜치. `main` 직접 커밋 금지 (핫픽스 포함 모든 작업은 `dev` 경유)
  - **하위 브랜치**: 필요 시 `dev` 에서 분기 → 완료 후 `dev` 로 ff 머지 → **머지된 하위 브랜치는 삭제**. 네이밍은 자연스럽게 (`feat/*`, `fix/*`, `docs/*` 등)
  - **`dev` 영구 브랜치**: 삭제/재생성 금지. 배포 직후 `main == dev` 상태 유지
  - **`demo` 영구 브랜치**: 데모 배포(Railway) 전용. `dev` 를 주기적으로 머지해서 따라가고, 데모 전용 커밋(시드·테마·기능 제거 등)은 `demo` 에만 둔다. `demo` → `dev`/`main` 머지 금지
  - **배포**: `dev` → `main` ff 머지 후 `npm run deploy` 실행. 스크립트 내부에서 main push + 운영 pull + install + rebuild 수행. `main` 은 **항상 배포 가능 상태** 유지
  - **push 정책**: `main` 은 deploy 스크립트 경유로만 push. `dev` 는 백업 목적으로 사용자 요청 시에만 push 허용 (**ff push 만, force 금지**). `demo` 는 데모 배포 목적으로 push 허용 (push 시 Railway 자동 재배포, force 금지). 그 외 브랜치는 push 금지
  - **머지**: fast-forward 기본 (`--no-ff` 사용하지 않음). 선형 히스토리 유지
  - **main 머지 전 검증**: `npm run type-check` 통과 + 미적용 마이그레이션 순효과 통합 완료
- **마이그레이션 네이밍**: `npm run db:generate -- --name "add_xxx"` 형식 사용 (`add_xxx`, `drop_xxx`, `alter_xxx`)
- **마이그레이션 통합**: 운영 DB에 적용된 마이그레이션은 절대 수정/통합/삭제하지 않는다. 미적용 마이그레이션만 main 머지 전에 순효과로 통합

## 문서

아키텍처, API, DB, 인프라 등에 영향을 주는 변경을 완료하면 해당 문서도 함께 업데이트한다.

- **[docs/architecture.md](docs/architecture.md)** — 디렉토리 구조, FSD, manage-modules 시스템, 데이터 페칭, 폼 패턴
- **[docs/api.md](docs/api.md)** — 인증, API 응답 패턴, 엔드포인트 레퍼런스, 비즈니스 로직
- **[docs/database.md](docs/database.md)** — 테이블 스키마, 관계, FK 전략, 마이그레이션
- **[docs/infrastructure.md](docs/infrastructure.md)** — 개발/운영 환경, Docker, 빌드, LaunchAgent
