# Work Manager

외주 고객·견적·프로젝트·수금을 한 곳에서 관리하는 **실운영 업무 시스템**.

1인 개발 스튜디오(리틀어썸)를 운영하며 실제 외주 업무에 매일 사용하기 위해 만들었고, 지금도 로컬 운영 서버에서 돌아가고 있다. 데모용 토이 프로젝트가 아니라 **실데이터와 실업무 흐름이 먼저 있었고, 그 요구를 따라 성장한 제품**이다.

<!-- TODO: 데모 URL + 데모 계정 안내 (데모 배포 후) -->
<!-- TODO: 대표 스크린샷 (데모 시드 완성 후 촬영) -->

## 주요 기능

| 영역 | 내용 |
|------|------|
| **고객 관리** | 외주 의뢰 업체/개인 정보, 메모 히스토리, 고객 환경 정보(호스팅·도메인 등 커스텀 필드) |
| **견적서** | 시리즈/버전 이중 모델 — 하나의 견적 건에 여러 버전을 쌓고 최종본을 지정. 부가세/원천징수 계산, PDF 발행 |
| **프로젝트** | 견적 → 프로젝트 전환, 상태 흐름, 수금·비용·파트너 지급을 아우르는 재무 관리, 세금계산서 추적 |
| **일정** | 프로젝트별 간트 차트(분할·병합·복제), 통합 캘린더 |
| **정산** | 세금계산서/원천세 일괄 처리, 연도별 매출 대시보드 |
| **파트너** | 외주 협력자 관리, 프로젝트 배치, 지급 추적 |
| **라이브러리** | 보드·문서(BlockNote 에디터)·드라이브(폴더 트리, 휴지통, 즐겨찾기)·미니앱(todo, 메모, 마인드노트, 계산기) |

## 기술 스택

| 분야 | 기술 |
|------|------|
| Frontend | React 19 + Vite, Tailwind CSS v4, Shadcn UI, TanStack Query |
| Form | React Hook Form + Zod |
| Backend | Hono (Node.js) |
| ORM / DB | Drizzle ORM / PostgreSQL 17 |
| Auth | Better Auth |
| Language | TypeScript (Strict Mode, `@ts-ignore` 0건) |

모노레포(npm workspaces): `apps/client` · `apps/server` · `packages/{schemas,types,utils}`

## 설계 하이라이트

### manage-modules `_base` — 6개 CRUD 모듈의 단일 골격

고객·견적·프로젝트·파트너 등 6개 도메인 모듈이 전부 같은 인프라 위에서 돈다.

- **ManageSheet 상태 머신**: `view / modify / create / duplicate` 4모드 Context 시트. 모든 모듈의 상세·수정·생성 UX가 자동으로 일관됨
- **useFormGuard**: RHF `isDirty` 감지 → 시트 닫기·모드 전환·새로고침 시 확인 다이얼로그. 한 번 구현으로 전 모듈 적용
- **모듈당 파일 10개 고정 구성** (`config / types / api / list / detail-view / write-form / ...`): 새 도메인 추가가 곧 패턴 반복이라, 기능 추가 비용이 선형으로 유지됨

이 `_base` 접근은 직접 만든 [Admin Framework](https://github.com/ddmon-dev/ddmon-admin-framework)의 convention-over-configuration 설계와 같은 계보다. 그쪽이 재사용 가능한 프레임워크라면, 여기서는 실운영 제품의 도메인 복잡도(견적 버전, 재무, 간트)를 받아내는 형태로 확장했다.

→ 상세: [docs/architecture.md](docs/architecture.md)

### 클라이언트·서버 단일 진실원천

- **공유 Zod 스키마** (`packages/schemas`): 폼 검증과 API 검증이 같은 스키마
- **공유 금액 계산기** (`packages/utils`): 부가세·원천징수 금액 계산이 클라이언트 미리보기와 서버 저장에서 동일 코드로 수행 — 견적서 금액이 어긋날 수 없는 구조

### 데이터 모델링

- **견적 시리즈/버전 분리**: `estimate_series`(견적 건) ↔ `estimates`(버전). 최종 버전 지정은 DB CHECK 제약으로 무결성 보장
- **recursive CTE 파일 트리**: 드라이브 폴더 계층을 DB에서 재귀 조회. 파일 실체는 UUID flat 저장, 계층은 메타데이터로만 관리
- 소프트 삭제 기본, 인증 커버리지 100% (전 API 라우트), 전 쿼리 파라미터 바인딩

### 로컬 운영 인프라

별도 클라우드 없이 macOS 머신을 운영 서버로 쓴다. 개발/운영 디렉토리 완전 분리, LaunchAgent 자동 기동·일일 DB 백업, `SERVE_STATIC` 모드로 Hono 단일 프로세스가 API + 정적 파일을 함께 서빙. → [docs/infrastructure.md](docs/infrastructure.md)

## AI 협업 워크플로우

이 프로젝트는 Claude Code와의 협업으로 개발했다. 400+ 커밋 히스토리가 그 과정의 기록이다.

- **역할 분담**: 도메인 요구 정의·데이터 모델링·아키텍처 결정·코드 리뷰·검증은 사람이, 구현 생산성은 AI가 담당했다. 간트 차트 같은 복잡한 인터랙션 엔진은 AI 페어로 생성하고, 사양 정의와 동작 검증으로 품질을 통제했다
- **프로젝트 규칙의 문서화**: `CLAUDE.md`와 `docs/` 문서들이 AI에게 전달되는 프로젝트 컨텍스트다. 아키텍처 패턴·git 컨벤션·DB 원칙을 문서로 고정해 세션이 바뀌어도 일관된 결과물이 나오게 했다
- **업무 자동화 플러그인**: 운영 단계에서는 Claude Code 플러그인(스킬)을 직접 설계해 고객·견적·프로젝트 데이터 조회와 영업 커뮤니케이션 초안 작성을 대화로 처리했다. 플러그인 코드는 실거래 데이터를 포함해 공개 레포에서 제외했지만, 서버의 스킬 인증 미들웨어(`apps/server/src/middleware/skill-auth.ts`)에 그 통합 지점이 남아 있다

## 문서

- [docs/architecture.md](docs/architecture.md) — FSD 구조, manage-modules 시스템, 데이터 페칭·폼 패턴
- [docs/api.md](docs/api.md) — 인증, API 응답 패턴, 엔드포인트 레퍼런스
- [docs/database.md](docs/database.md) — 테이블 스키마, 관계, FK 전략, 마이그레이션
- [docs/infrastructure.md](docs/infrastructure.md) — 개발/운영 환경, Docker, 빌드, LaunchAgent
- [docs/business-features.md](docs/business-features.md) — 도메인 모델과 업무 흐름

## 실행하기

> 개인 운영 시스템 특성상 시드 데이터는 저장소에 포함되지 않는다.

```bash
# 사전 요구: Node.js 24+, Docker Desktop

# 환경 설정
cp .env.example .env              # DB 크레덴셜 설정
cp .env.local.example .env.local  # DATABASE_URL을 .env와 일치시킬 것

# 실행
npm install
npm run db:up         # Docker PostgreSQL (port 8002)
npm run db:migrate
npm run dev           # client(8000) + server(8001)
```

| 주요 명령어 | 설명 |
|--------|------|
| `npm run dev:start` | DB + 클라이언트 + 서버 + Drizzle Studio 통합 시작 |
| `npm run type-check` | TypeScript 타입 체크 |
| `npm run db:studio` | Drizzle Studio |
| `npm run build` | 클라이언트(Vite) + 서버(tsup) 빌드 |
