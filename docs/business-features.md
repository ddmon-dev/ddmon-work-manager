# 비즈니스 & 피쳐 가이드

> 이 문서는 AI(Claude)에게 앱의 비즈니스 구조와 피쳐를 전달하기 위한 참고 문서입니다.
> 기술 스택, 인프라, API 명세 등은 별도 문서(architecture.md, api.md, database.md, infrastructure.md) 참조.

---

## 1. 앱 개요

**외주 업무 관리 시스템** — 프리랜서/소규모 사업자가 외주 고객과 견적, 프로젝트, 일정, 수금을 한 곳에서 관리하는 개인용 내부 도구.

### 핵심 업무 흐름

```
고객 등록 → 견적서 작성/발행 → 프로젝트 전환 → 일정 관리 → 수금 관리 → 매출 분석
```

- **고객(Client)**: 외주를 의뢰하는 업체/개인. 모든 비즈니스 엔티티의 기준점.
- **견적서(Estimate)**: 고객에게 제출하는 견적. 버전 관리와 상태 흐름을 지원.
- **프로젝트(Project)**: 실제 수행하는 외주 작업 단위. 견적서와 선택적 연결.
- **일정(Schedule)**: 프로젝트에 속한 세부 작업 일정. 캘린더 + 간트 차트로 시각화.
- **수금(Payment)**: 프로젝트별 입금 내역 추적.
- **매출(Revenue)**: 연도별 계약/수금 현황 대시보드.

---

## 2. 도메인 모델 관계

```
Client (고객)
 ├── Estimate Series (견적 계열) — 1:N
 │    └── Estimate (견적 버전) — 1:N
 │         └── Item Group → Items (항목 그룹/항목) — 1:N:N
 ├── Project (프로젝트) — 1:N
 │    ├── Payment (수금) — 1:N
 │    ├── Schedule (일정) — 1:N
 │    └── Project Memo — 1:N
 └── Client Memo — 1:N
```

### 엔티티 간 독립성

- **견적서 ↔ 프로젝트**: 독립 엔티티. 프로젝트는 견적서 없이도 생성 가능하며, estimateNumber로 선택적 연결.
- **일정 ↔ 프로젝트**: 일정은 프로젝트 없이도 존재 가능 (독립 일정).
- **고객 삭제 제약**: 견적서나 프로젝트가 연결된 고객은 삭제 불가 (RESTRICT).

---

## 3. 핵심 비즈니스 규칙

### 3.1 세금 체계

두 가지 세금 유형을 지원하며, `contractAmount`는 항상 **공급가액**(세전 금액)을 의미한다.

| 유형 | 설명 | 계산식 | 예시 (100만원) |
|------|------|--------|--------------|
| **VAT (부가세)** | 공급가액 + 10% | 청구액 = 공급가액 × 1.1 | 110만원 청구 |
| **Withholding (원천징수)** | 3.3% 차감 후 지급 | 실수령 = 공급가액 × 0.967 | 96.7만원 수령 |

- 견적서: 기본 `vat`, 선택적으로 `withholding` 가능
- 프로젝트: 기본 `vat`, UI 없음 (신규 생성 시 자동)

### 3.2 견적서 버전/계열 관리

견적서는 `estimateNumber`(EST-YYYY-NNN) 단위로 **계열(Series)** 을 형성하고, 각 계열 안에 여러 **버전**이 존재한다.

```
견적 계열 (EST-2025-001)
 ├── v1 (초안)
 ├── v2 (수정본)
 └── v3 (최종본) ← finalEstimateId
```

**상태 흐름**:
```
pending (작성중) → contracted (계약 체결) → expired (만료)
                    ↑ 최종 버전 지정 필수
```

- `contracted` 상태에서만 `finalEstimateId` 지정 가능 (CHECK 제약)
- 프로젝트와 연결된 계열은 상태 변경 차단

### 3.3 프로젝트 상태/단계

프로젝트는 **상태(status)** 와 **작업 단계(workPhase)** 두 축으로 관리한다.

**상태 흐름**:
```
pending (대기) → active (진행중) → settling (정산중) → completed (완료)
                                                       discarded (폐기)
```

**작업 단계** (active 상태에서의 세부 진행도):
```
preparing (준비) → working (작업중) → reviewing (검수) → delivered (납품)
```

### 3.4 일정 & 반복

- 단일 또는 기간(startDate~endDate) 일정 지원
- 반복: none / daily / weekly / monthly
- 반복 일정은 서버에서 발생(occurrence)으로 확장하여 캘린더에 표시
- 프로젝트 상세의 간트 차트에서 드래그&드롭으로 일정 이동/리사이즈 가능

### 3.5 수금 관리

- 프로젝트별 입금 내역(payments)을 등록
- 미수금 = 청구액(세금 포함) - 수금 합계
- 매출 페이지에서 미수금 프로젝트 목록 확인 가능

### 3.6 번호 체계

| 엔티티 | 형식 | 예시 |
|--------|------|------|
| 견적서 | EST-YYYY-NNN | EST-2025-001 |
| 프로젝트 | PRJ-YYYY-NNN | PRJ-2025-001 |

- 연도별 시퀀셜 번호, 트랜잭션 내에서 생성하여 중복 방지

---

## 4. 피쳐 구성

### 4.1 메인 CRUD 모듈

모든 CRUD 모듈은 `manage-modules/_base` 의 공통 인프라를 공유하며, 동일한 UX 패턴을 따른다.

| 모듈 | 화면 구성 | 주요 기능 |
|------|----------|----------|
| **Clients** | 목록 + 상세(사이드) | 고객 CRUD, 메모, 연관 프로젝트 조회 |
| **Estimates** | 목록 + 상세(사이드) | 견적 CRUD, 버전/계열 관리, 항목 그룹 편집, PDF 미리보기/내보내기, 상태 변경 |
| **Projects** | 목록 + 상세(사이드) | 프로젝트 CRUD, 간트 차트, 수금 관리, 메모, 상태/단계 변경 |
| **Schedules** | 목록 or 캘린더 뷰 | 일정 CRUD, 캘린더 월간 뷰, 반복 일정, 색상 지정, 순서 변경 |
| **Admins** | 목록 | 관리자 CRUD (superAdmin 전용), 비밀번호 변경 |

#### 공통 UI 패턴 (_base)

```
ManageContainer (전체 레이아웃)
 ├── ManageHeader (제목, 검색, 생성 버튼, 엑셀 내보내기)
 ├── ManageList (DataList 테이블, 페이지네이션, 정렬, 선택)
 ├── ManageDetail (사이드 상세 뷰)
 └── ManageSheet (사이드 시트: create/modify/duplicate/view 모드)
      ├── WriteForm (React Hook Form + Zod)
      └── ManageSheetButtons (저장, 취소)
```

- **RowActions**: 각 행의 수정/삭제/보기 등 액션 (buttons 또는 dropdown)
- **BulkActionBar**: 다중 선택 후 일괄 작업
- **ExportDataButton**: 엑셀 내보내기

### 4.2 대시보드

| 섹션 | 내용 |
|------|------|
| **HeroSection** | 인사말, 현재 날짜 |
| **StatsCards** | 대기 견적 건수, 진행 프로젝트, 정산중 프로젝트, 대기 프로젝트 |
| **UpcomingSchedules** | 오늘/이번 주/향후 일정 분류 표시 |
| **RevenueSummary** | 올해 계약액, 청구액, 수금액, 수금률 |
| **QuickActions** | 자주 쓰는 작업 바로가기 |

### 4.3 매출/수금 분석 (Revenue)

| 섹션 | 내용 |
|------|------|
| **YearFilter** | 연도 선택 |
| **MonthlyChart** | 월별 매출 차트 |
| **RevenueSummary** | 총매출, 수금액, 미수금액 |
| **OutstandingTable** | 미수금 프로젝트 목록 |

- 매출 기준: 프로젝트 contractDate (계약일)
- 수금 기준: payment paidDate (입금일)

### 4.4 미니앱 (사이드바 하단)

모든 미니앱은 Context 기반 상태 관리를 사용하며, 사이드바 하단의 트리거 버튼으로 접근한다.

| 미니앱 | 형태 | 기능 |
|------|------|------|
| **Todo** | 사이드 시트 | 날짜별 투두 관리, DnD 정렬, 30분 단위 타임블록, 미완료 이월 |
| **Calculator** | 드래그 가능 팝업 | 기본 사칙연산 계산기 |
| **Memo** | 사이드 시트 | 빠른 메모 저장/조회 |
| **MindNote** | 사이드 시트 | 짧은 영감/아이디어 기록 |

### 4.5 인증 & 설정

| 기능 | 설명 |
|------|------|
| **로그인** | 이메일 + 비밀번호 (Better Auth, 세션 30일) |
| **프로필 수정** | 이름, 비밀번호 변경 |
| **사업자 정보** | 상호명, 대표자, 사업자번호, 주소 (견적서 발행에 사용) |
| **역할** | superAdmin (1명 제한) / 일반 관리자 |

---

## 5. 데이터 삭제 정책

| 분류 | 엔티티 | 방식 | 이유 |
|------|--------|------|------|
| **비즈니스 데이터** | clients, estimates, projects, payments, memos | 소프트 삭제 | 회계/감사 추적 필요 |
| **운영 데이터** | schedules, todos, todo_time_blocks | 하드 삭제 | 일시적 데이터, 추적 불필요 |
| **개인 데이터** | mindnotes, memos(개인) | 하드 삭제 | 개인 노트 성격 |

---

## 6. 접근 제어

| 계층 | 방식 | 범위 |
|------|------|------|
| **인증** | requireAuth 미들웨어 | 모든 API (auth 제외) |
| **권한** | requireSuperAdmin 미들웨어 | admins 라우트만 |
| **데이터 격리** | userId 컬럼 필터링 | todos, mindnotes, memos (개인 데이터) |

> RLS 미사용. Hono 미들웨어 레벨에서 접근 제어.

---

## 7. 화면 구조 & 네비게이션

### 라우팅

| 경로 | 페이지 | 레이아웃 |
|------|--------|---------|
| `/` | 대시보드 | ProtectedLayout |
| `/clients` | 고객 관리 | ProtectedLayout |
| `/estimates` | 견적서 관리 | ProtectedLayout |
| `/projects` | 프로젝트 관리 | ProtectedLayout |
| `/schedules` | 일정 관리 | ProtectedLayout |
| `/revenue` | 매출/수금 통계 | ProtectedLayout |
| `/admins` | 관리자 관리 | ProtectedLayout |
| `/auth/sign-in` | 로그인 | AuthLayout |

### 사이드바

```
AppSidebar
├── Header: 앱 로고/타이틀
├── Content: 메인 메뉴
│   ├── 고객 관리
│   ├── 견적서 관리
│   ├── 프로젝트 관리
│   ├── 일정 관리
│   └── 매출/수금 통계
└── Footer
    ├── 미니앱 트리거 (Todo, Calculator, Memo, MindNote)
    ├── 다크모드 토글
    └── 사용자 메뉴 (프로필, 사업자 정보, 관리자 관리, 로그아웃)
```

---

## 8. 새 피쳐 추가 시 참고사항

### CRUD 모듈 추가 패턴

1. `manage-modules/` 하위에 새 모듈 폴더 생성
2. `_base` 의 공통 컴포넌트 활용 (ManageContainer, ManageSheet 등)
3. 표준 파일 구조 따르기: `config.ts` → `types.ts` → `api.ts` → `index.tsx` → `list.tsx` → `list-columns.tsx` → `item-sheet.tsx` → `write-form.tsx` → `row-actions.tsx`
4. 서버: 라우트 파일 생성 → DB 스키마 → Zod 스키마 (packages/schemas)
5. 라우팅: `router.tsx`에 페이지 추가, 사이드바 `config.ts`에 메뉴 추가

### 미니앱 추가 패턴

1. `features/ui/` 하위에 미니앱 폴더 생성
2. `context.tsx` (상태 관리) + `ui/` (컴포넌트) 구조
3. `widget-trigger-group.tsx`에 트리거 버튼 추가
4. `ProtectedLayout`에 Provider 및 UI 컴포넌트 렌더링 추가

### 공유 리소스

- **폼 컴포넌트**: `shared/ui/form/` (FormTextInput, FormDatePicker, FormSelect 등)
- **데이터 테이블**: `shared/ui/data-list/` (DataList, SearchBar, SortingButton 등)
- **API 클라이언트**: `shared/lib/api-client.ts` (get, post, patch, put, delete)
- **쿼리 키**: `shared/lib/query-keys.ts` (중앙 관리)
- **금액 계산**: `packages/utils/src/amount-calculator.ts`
