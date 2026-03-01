# 기술 스택 선택 근거

## 마이그레이션 동기

### 1. Next.js/Supabase가 이 프로젝트에 오버스펙

개인용 내부 관리 시스템에 SSR 프레임워크(Next.js App Router)와 BaaS(Supabase)는 과하다.
SEO가 필요 없고 퍼블릭 페이지도 없으며, server/client 경계 관리와 캐싱 동작 등이 불필요한 복잡성만 추가한다.

### 2. DB만 있으면 되는데 Supabase가 무겁다

Supabase에서 실제로 쓰는 건 Postgres뿐이다.
Auth도 NextAuth로 별도 처리하고 있어 사실상 Postgres만 사용 중.

### 3. 백엔드 학습 목적

직접 API 서버를 설계하고 운영하는 경험을 쌓고 싶다.

---

## 확정 기술 스택

| 영역 | 기술 |
|---|---|
| **프론트엔드** | React 19 + Vite |
| **라우팅** | React Router v7 |
| **서버 상태** | TanStack Query |
| **백엔드** | Hono |
| **ORM** | Drizzle |
| **DB** | PostgreSQL |
| **인증** | Better Auth |
| **스타일링** | Tailwind CSS V4 (기존 유지) |
| **UI** | Shadcn UI (기존 유지) |
| **프로젝트 구조** | 모노레포 (npm workspaces) |

기존에 쓰던 Tailwind V4, Shadcn UI, Lucide React, React Hook Form + Zod, @react-pdf/renderer 등은
Vite 환경에서도 그대로 사용 가능.

---

## 기술 선택 근거

### 백엔드: Hono (vs Fastify, NestJS)

| | Hono | Fastify | NestJS |
|---|---|---|---|
| 철학 | 경량, Web Standard | 성능 중심, Express 대체 | 엔터프라이즈, 풀프레임워크 |
| 학습곡선 | 낮음 | 중간 | 높음 (DI, 데코레이터) |
| 이 프로젝트에 적합? | O | O | 과함 |

**Hono 선택 이유:**

1. Supabase가 무겁다고 느꼈는데 Fastify의 플러그인 시스템까지 관리하면 같은 피로감을 느낄 수 있음
2. Hono RPC는 현재 Server Action으로 누리고 있는 "프론트-백 타입 공유" 경험을 거의 그대로 유지 (킬러 피처)
3. Web Standard API(`Request`/`Response`, `fetch`) 기반이라 Node.js에 종속되지 않는 지식을 쌓을 수 있음
4. "우직실" 원칙에 부합 -- 필요한 것만, 깔끔하게

### ORM: Drizzle (vs Prisma)

| | Drizzle | Prisma |
|---|---|---|
| 스키마 정의 | TypeScript | 자체 언어 (.prisma) |
| 실행 방식 | 직접 쿼리 | 별도 엔진 프로세스 |
| SQL 가까움 | 높음 | 낮음 |
| GUI | drizzle-studio | Prisma Studio |

**Drizzle 선택 이유:**

1. Prisma의 별도 엔진 프로세스가 Supabase를 "무겁다"고 느낀 방향성과 맞지 않음
2. SQL에 가까운 문법이라 DB 학습에 도움
3. TypeScript-first라 별도 스키마 언어를 배울 필요 없음
4. 기존 Supabase 마이그레이션 SQL을 참조해서 Drizzle 스키마로 옮기기 수월

### 라우팅: React Router v7 (vs TanStack Router)

| | React Router v7 | TanStack Router |
|---|---|---|
| 타입 안전성 | 보통 (params는 string) | 최고 (params, search params 모두 타입 추론) |
| Search params | 직접 파싱 필요 | Zod 연동으로 자동 검증 + 타입 추론 |
| TanStack Query 연동 | 별도 설정 | 네이티브 통합 |
| 생태계/레퍼런스 | 매우 넓음 | 상대적으로 작음 |

**React Router v7 선택 이유:** 익숙함과 레퍼런스 양. TanStack Router의 타입 안전성이 더 좋지만 실용적 판단.

### 인증: Better Auth (vs JWT 직접 구현)

| | Better Auth | JWT 직접 구현 |
|---|---|---|
| 학습 가치 | 중간 (설정 위주) | 높음 (토큰 발급/검증/갱신) |
| 개발 속도 | 빠름 | 느림 |
| 보안 실수 위험 | 낮음 | 있음 |

**Better Auth 선택 이유:** "NextAuth의 프레임워크 독립 버전"으로, Hono와 연동 가능하고 Drizzle 어댑터 내장.
인증은 학습보다 안정성이 우선.
