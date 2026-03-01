# 모노레포 구조 및 마이그레이션 실행 순서

## 마이그레이션 방식

"점진적 마이그레이션"이 아닌 **새 프로젝트**로 진행한다.
기존 프로젝트의 DB 스키마와 비즈니스 로직을 참조하면서 새 프로젝트로 하나씩 옮긴다.

기존 프로젝트 루트에 `_react/` 디렉토리를 만들고, 기존 `.gitignore`에 추가하여 기존 git이 추적하지 않게 한다.
`_react/` 안에서 별도 git으로 관리하며, 기존 프로젝트를 참조하면서 작업할 수 있어 실용적이다.

### 마이그레이션 비용

- Server Action 56개를 REST/RPC 엔드포인트로 재작성
- NextAuth v5 인증 체계를 Better Auth로 전면 교체
- Server Components의 데이터 페칭 패턴을 TanStack Query로 변경
- Supabase SSR 패키지 제거, Drizzle로 전환
- 빌드/배포 파이프라인 완전 재구성

---

## 모노레포 구조

```
_react/
├── apps/
│   ├── client/          # React + Vite + React Router v7 + TanStack Query
│   └── server/          # Hono + Drizzle + Better Auth
├── packages/
│   ├── schemas/         # @work-manager/schemas — Zod 검증 스키마
│   ├── types/           # @work-manager/types — 비즈니스 타입
│   └── utils/           # @work-manager/utils — 순수 유틸 함수
└── package.json         # npm workspaces
```

### apps/ vs packages/

- **apps/**: 실행 가능한 애플리케이션 (빌드 -> 배포 대상)
- **packages/**: 라이브러리 (다른 패키지에서 import해서 사용)

### packages 역할 분리

`packages/shared` 하나로 두지 않고 역할별로 분리한다.
`packages` 폴더 자체가 shared인데, 그 안에 `shared`를 또 놓으면 확장 시 의미가 애매해지기 때문.

| 패키지 | 역할 |
|---|---|
| **schemas** | Zod 검증 스키마 (클라이언트 폼 검증 + 서버 입력 검증 양쪽에서 사용) |
| **types** | 비즈니스 타입 정의 |
| **utils** | 순수 유틸 함수 (date, format 등) |

> Hono RPC가 API 응답/요청 타입을 자동으로 프론트에 전달하므로, API 관련 타입은 별도 정의 불필요.

### 기존 코드의 새 배치

| 현재 위치 | 새 위치 | 이유 |
|---|---|---|
| `schemas/` (Zod) | **packages/schemas** | 클라이언트 + 서버 양쪽에서 사용 |
| `types/` | **packages/types** | 비즈니스 타입 양쪽에서 사용 |
| `constants/` | **packages (해당 패키지)** | 비즈니스 상수 양쪽에서 사용 |
| `utils/` | **packages/utils** | 순수 함수, 양쪽에서 사용 |
| `ui/` (Shadcn) | **apps/client** | 클라이언트 전용 컴포넌트 |
| `hooks/` | **apps/client** | React 훅 |
| `lib/supabase` | **삭제** | Drizzle로 대체 |
| `lib/email`, `lib/excel` | **apps/server** | 서버 사이드 로직 |

### apps/client 내부 구조

FSD(Feature-Sliced Design) 유지:

```
apps/client/src/
├── app/            # 라우트
├── features/       # auth, dashboard, manage-modules, revenue, todo-widget
└── shared/         # 프론트 전용 UI, hooks, lib
```

---

## 마이그레이션 실행 순서

### Phase 1: 프로젝트 기반 구성

- 모노레포 초기화 (npm workspaces, tsconfig 등)
- apps/client, apps/server, packages/* 빈 구조 세팅
- 개발 환경 설정 (ESLint, TypeScript 등)
- **검증**: client, server 둘 다 `npm run dev`로 실행 확인

### Phase 2: 백엔드 - DB + 인증

- Drizzle 설정 + 기존 Supabase 스키마를 Drizzle 스키마로 전환
- Better Auth 연동 (로그인/로그아웃/세션)
- **검증**: API로 인증 동작 확인

### Phase 3: 백엔드 - CRUD API

- 모듈별 API 라우트 (clients, estimates, projects, schedules, admins)
- packages/ 채우기 (기존 schemas, types, utils 마이그레이션)
- **검증**: 각 엔드포인트 동작 확인

### Phase 4: 프론트엔드 - 기반 구성

- Tailwind V4 + Shadcn UI 설정
- React Router v7 라우팅 + TanStack Query + Hono RPC 클라이언트
- 레이아웃 마이그레이션 (사이드바, 헤더)
- 인증 UI (로그인 페이지)
- **검증**: 로그인 -> 대시보드 진입

### Phase 5: 프론트엔드 - 기능별 마이그레이션

- 모듈별 UI 하나씩 옮기기
- 대시보드, 투두 위젯 등
- **검증**: 기능별 동작 확인

### Phase 6: 배포 환경

- 로컬 실행 환경 (LaunchAgent) 재구성
- 프로덕션 빌드 확인
