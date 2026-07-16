# Work Manager

> 외주 고객·견적·프로젝트·수금을 한 곳에서 관리하는 **개인용 프리랜서 업무 시스템**. React 19 + Hono 풀스택 모노레포.

![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Hono](https://img.shields.io/badge/Hono-4-e36002)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-Postgres%2017-c5f74f)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)

---

## 소개

직접 만든 [Admin Framework](https://github.com/ddmon-dev/ddmon-admin-framework)를 기반으로 프리랜서 외주 업무에 맞춰 확장한 시스템입니다. 고객 관리부터 견적 발행, 프로젝트 진행, 수금·정산까지 외주 업무의 전체 흐름을 다루며, 로컬 운영 서버에서 사용중에 있습니다.

프레임워크가 범용 CRUD 골격을 제공한다면, 이 프로젝트는 그 위에 견적 버전 관리·재무·간트 일정 같은 실업무 도메인을 얹은 것입니다. 고객·견적·프로젝트·파트너 등 8개 도메인 모듈이 전부 `_base` 공통 인프라 위에서 동작합니다.

## 핵심 기능

- **고객 관리** — 외주 의뢰 업체/개인 정보, 메모 히스토리, 고객 환경 정보(호스팅·도메인 등 커스텀 필드).
- **견적서** — 시리즈/버전 이중 모델. 하나의 견적 건에 여러 버전을 쌓고 최종본을 지정합니다. 부가세/원천징수 계산, PDF 발행.
- **프로젝트** — 견적 → 프로젝트 전환, 상태 흐름, 수금·비용·파트너 지급을 아우르는 재무 관리, 세금계산서 추적.
- **일정** — 프로젝트별 간트 차트(분할·병합·복제), 통합 캘린더.
- **정산** — 세금계산서/원천세 일괄 처리, 연도별 매출 대시보드.
- **파트너** — 외주 협력자 관리, 프로젝트 배치, 지급 추적.
- **라이브러리** — 보드·문서(BlockNote 에디터)·드라이브(폴더 트리, 휴지통, 즐겨찾기)·미니앱(todo, 메모, 마인드노트, 계산기).

## 설계 하이라이트

- **manage-modules `_base` 골격** — ManageSheet 상태 머신 + useFormGuard + 공통 UI 24종 위에 모듈별 파일 10개 고정 구성(`config / api / list / detail-view / write-form / ...`)을 얹습니다. 새 도메인 추가가 곧 패턴 반복이라 기능 추가 비용이 선형으로 유지됩니다.
- **클라이언트·서버 단일 진실원천** — 공유 Zod 스키마(`packages/schemas`)로 폼 검증과 API 검증이 같은 스키마를 쓰고, 공유 금액 계산기(`packages/utils`)로 부가세·원천징수 계산이 클라이언트 미리보기와 서버 저장에서 동일 코드로 수행됩니다. 견적서 금액이 어긋날 수 없는 구조입니다.
- **데이터 모델링** — 견적 시리즈/버전 분리(`estimate_series` ↔ `estimates`, 최종 버전 지정은 DB CHECK 제약으로 보장), 드라이브 폴더 계층의 recursive CTE 조회(파일 실체는 UUID flat 저장). 소프트 삭제 기본, 인증 커버리지 100%, 전 쿼리 파라미터 바인딩.
- **로컬 운영 인프라** — 별도 클라우드 없이 macOS 머신이 운영 서버입니다. 개발/운영 디렉토리 완전 분리, LaunchAgent 자동 기동·일일 DB 백업, `SERVE_STATIC` 모드로 Hono 단일 프로세스가 API + 정적 파일을 함께 서빙합니다.

## 기술 스택

| 분야     | 기술                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | React 19 + Vite, Tailwind CSS v4, Shadcn UI, TanStack Query |
| Form     | React Hook Form + Zod                                       |
| Backend  | Hono (Node.js)                                              |
| ORM / DB | Drizzle ORM / PostgreSQL 17                                 |
| Auth     | Better Auth                                                 |
| Language | TypeScript (strict, `@ts-ignore` 0건)                       |

모노레포(npm workspaces): `apps/client` · `apps/server` · `packages/{schemas,types,utils}`

> 정확한 버전은 각 [`package.json`](package.json)이 기준입니다.

## 아키텍처

클라이언트는 **FSD(Feature-Sliced Design)** 레이어 구조입니다. 의존성 방향: `pages → features → shared`.

```
├── apps/
│   ├── client/       # React 19 + Vite (FSD 구조)
│   └── server/       # Hono API 서버 (+ 운영 모드 정적 서빙)
├── packages/
│   ├── schemas/      # Zod 스키마 (클라이언트·서버 공유)
│   ├── types/        # 상수, 타입 정의
│   └── utils/        # 금액 계산 등 유틸리티
└── scripts/          # 유틸리티 스크립트
```

| 문서                                              | 내용                                                 |
| ------------------------------------------------- | ---------------------------------------------------- |
| [architecture.md](docs/architecture.md)           | FSD 구조, manage-modules 시스템, 데이터 페칭·폼 패턴 |
| [api.md](docs/api.md)                             | 인증, API 응답 패턴, 엔드포인트 레퍼런스             |
| [database.md](docs/database.md)                   | 테이블 스키마, 관계, FK 전략, 마이그레이션           |
| [infrastructure.md](docs/infrastructure.md)       | 개발/운영 환경, Docker, 빌드, LaunchAgent            |
| [business-features.md](docs/business-features.md) | 도메인 모델과 업무 흐름                              |

## 개발

```bash
npm run dev:start     # DB + 클라이언트 + 서버 + Drizzle Studio 통합 시작
npm run type-check    # TypeScript 타입 체크 (tsc -b)
npm run db:studio     # Drizzle Studio
npm run build         # 클라이언트(Vite) + 서버(tsup) 빌드
```
