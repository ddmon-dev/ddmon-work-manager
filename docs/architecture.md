# 아키텍처

## 클라이언트 (`apps/client`)

React 19 + Vite + TanStack Query + React Router v7.

### FSD 구조

```
src/
├── app.tsx, router.tsx, app.config.ts, globals.css
├── pages/              # 라우팅 페이지 (컴포넌트만 배치, 로직 최소화)
├── layouts/            # 레이아웃 (RootLayout, AuthLayout, ProtectedLayout)
├── features/           # 기능 모듈
│   ├── manage-modules/ # CRUD 시스템 (_base + 6개 모듈 + project-schedules)
│   ├── auth/           # 인증
│   ├── dashboard/      # 대시보드
│   ├── revenue/        # 매출 현황
│   ├── settlement/     # 정산 (세금계산서/원천세 일괄 처리)
│   ├── drive/          # 드라이브 (파일 탐색기/휴지통)
│   ├── settings/       # 설정
│   └── ui/             # 글로벌 UI (app-sidebar, 미니앱: todo-widget, memo-widget, calculator-widget)
└── shared/             # 공유 레이어
    ├── ui/             # 기본 컴포넌트, 폼 컴포넌트, DataList, file-browser
    ├── lib/            # api-client, query-keys, query-client
    ├── hooks/          # 커스텀 훅 (use-file-browser 포함)
    ├── utils/          # 유틸리티 (format, date, download)
    ├── constants/      # 상수
    └── types/          # 공유 타입
```

**의존성 방향**: pages → features → shared (역방향 금지)

**Path Alias**: `@/*` = `./src/*`

### 라우팅 구조

```
RootLayout (Toaster, ThemeContext)
├── AuthLayout
│   └── /auth/sign-in
└── ProtectedLayout (인증 검증, CalculatorProvider, TodoProvider, MindnoteProvider, SidebarProvider)
    ├── /              → DashboardPage
    ├── /clients       → ClientsPage
    ├── /estimates     → EstimatesPage
    ├── /projects            → ProjectsPage
    ├── /project-schedules   → ProjectSchedulesPage
    ├── /partners      → PartnersPage
    ├── /schedules           → SchedulesPage
    ├── /revenue       → RevenuePage
    ├── /settlement    → SettlementPage
    ├── /admins        → AdminsPage
    ├── /drive         → DrivePage
    ├── /unauthorized  → UnauthorizedPage
    └── *              → NotFoundPage
```

ProtectedLayout 자식에 별도 `errorElement` 배치 — 에러 시에도 사이드바 유지.

### manage-modules 시스템

`_base/` 인프라 + 6개 모듈 (clients, partners, estimates, projects, schedules, admins).

#### 프로젝트 일정 모듈 (`project-schedules/`)

프로젝트별 태스크 관리. `project_schedule_lanes` + `project_schedules` 테이블 사용 (기존 schedules와 분리).

레인(lane) 기반 구조: 각 행이 명시적 레인 엔티티. 한 레인에 여러 독립 일정 배치 가능.
프리셋 카테고리 5종(기획/디자인/개발/수정/납품) + 커스텀 카테고리(이름+색상) 지원.

```
project-schedules/
├── config.ts, types.ts, api.ts, constants.ts
├── index.tsx              # 모듈 엔트리 (오버뷰 렌더링)
└── gantt/
    ├── project-gantt.tsx      # 단일 프로젝트 간트 (프로젝트 상세용, 좌측 레인 패널)
    ├── overview.tsx           # 멀티 프로젝트 오버뷰 (진행중/완료 탭)
    ├── timeline-header.tsx    # 날짜 축 (월/일 레이블, 월 sticky)
    ├── gantt-grid.tsx         # 배경 그리드 (날짜 세로줄, 주말 배경, 오늘선, 호버 크로스헤어)
    ├── gantt-bar.tsx          # 개별 바 (드래그/리사이즈/복제, inline style 색상)
    ├── ghost-bar.tsx          # 생성 중인 일정의 고스트 바
    ├── lane-row.tsx           # 좌측 패널 레인 행 (인라인 편집, 드래그 리오더)
    ├── schedule-popover.tsx   # 바 클릭 팝오버 (제목 편집, 카테고리 변경, 커스텀 카테고리, 삭제)
    ├── use-gantt.ts           # 범위 계산
    ├── use-lane-actions.ts    # 레인 CRUD 액션 훅
    ├── use-lane-drag.ts       # 레인 드래그 앤 드롭 훅
    ├── use-scroll-to-today.ts # 오늘 날짜로 자동 스크롤 훅
    └── utils.ts               # dateToX, xToDate, computeTimelineRange, TODAY 등
```

- DAY_WIDTH=42px, ROW_HEIGHT=42px, BAR_INSET=4px, absolute 포지셔닝 기반
- 바 디자인: 좌측 카테고리 스트라이프(3px), `color-mix` 불투명 배경(18%), 양쪽 인셋(4px) 여백
- Pointer Events API로 드래그 (픽셀 단위 이동, 놓을 때 스냅)
- 클릭 vs 드래그 판별 (4px threshold)
- 드래그 축 잠금: 초기 이동 방향에 따라 수직/수평 분리 (동시 이동 불가)
- 레인 기반 행 렌더링: 1행 = 1레인, 한 레인 내 겹치는 일정 허용
- Alt+드래그: 같은 레인에 일정 복제 (고스트 바 프리뷰, 일반 생성 API 사용)
- Y축 드래그: 다른 레인으로 일정 이동 (`laneId` 변경)
- 좌측 패널: 업체명+프로젝트명+레인 3열 (오버뷰), 레인만 (프로젝트 간트)
- 오버뷰: 프로젝트별 접기/펼치기, 접힌 상태에서 요약 바 표시, 프로젝트/레인 드래그 리오더
- 팝오버: 수정 모드 인라인 자동 저장 (삭제 버튼만 표시), 생성 모드 취소/저장 버튼
- z-index 계층: 그리드(1-5) → 바(6, 호버시 20) → 좌측패널(30) → 패널헤더(40) → 팝오버(50)
- GanttGrid: 제어 컴포넌트 패턴 (hoverCell prop, 부모가 상태 소유), 프로젝트 경계선 강조

#### 모듈 파일 구성

```
features/manage-modules/{module}/
├── config.ts          # 모듈명 상수
├── types.ts           # DTO 타입 정의
├── api.ts             # TanStack Query 훅 (useXxxList, useXxx, useCreateXxx, ...)
├── index.tsx          # 모듈 엔트리 (데이터 조회 + 렌더링)
├── list.tsx           # ManageList 래퍼
├── list-columns.tsx   # 테이블 컬럼 정의
├── item-sheet.tsx     # ManageSheet 래퍼 (상세/수정/생성 시트)
├── detail-view.tsx    # 상세 조회 컴포넌트
├── write-form.tsx     # 폼 컴포넌트 (생성/수정)
└── row-actions.tsx    # 행 액션 버튼
```

#### _base 인프라 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `ManageContainer` | 모듈 래퍼 (ManageSheetProvider 포함) |
| `ManageSheet` | Context 기반 시트 (view / modify / create / duplicate 모드) |
| `ManageList` | DataList 래퍼 (행 클릭 → 시트 열기, 벌크 액션) |
| `ManageFormSubmit` | 폼 제출 버튼 |
| `RowActions` / `RowActionMenu` | 행 액션 (buttons / menu 타입) |
| `MemoSection` | 메모 폼 + 히스토리 (hooks prop으로 CRUD 내장, clients/partners/projects 공유) |
| `ClientSelect` | 클라이언트 선택 컴포넌트 |
| `PartnerSelect` | 파트너 선택 컴포넌트 |
| `DeleteButton` / `DuplicateButton` / `ModifyButton` / `ViewButton` | 상세뷰 액션 버튼 |
| `DetailSectionTitle` / `DetailInfoRow` | 상세뷰 레이아웃 |

#### _base 훅

| 훅 | 역할 |
|---|------|
| `useFormGuard` | RHF isDirty 감지 → 닫기/모드 변경 시 확인 다이얼로그 |

#### ManageSheet 상태 머신

```
useManageSheet() → { open, close, closeWithGuard, setMode, setModeWithGuard, setCloseGuard }
모드: "view" | "modify" | "create" | "duplicate"
```

- `useFormGuard(form)` 훅으로 RHF isDirty 감지 → 닫기/모드 변경 시 확인 다이얼로그
- `beforeunload` 이벤트도 등록 (새로고침/탭 닫기 방지)

### 파일 브라우저 시스템

드라이브(`features/drive/drive.tsx`)와 모듈 파일 브라우저(`features/manage-modules/_base/ui/file-browser.tsx`)가 공유하는 파일 탐색 UI.

#### 구조

```
shared/hooks/use-file-browser.ts     # 핵심 상태 관리 훅 (네비, 정렬, 선택, 포커스, 이름변경, 클립보드, 키보드, 드래그선택)
shared/ui/file-browser/
├── index.ts                         # barrel export
├── constants.ts                     # FILE_ACTIONS (아이콘+라벨+단축키), FILE_MESSAGES (토스트/대화), multiLabel
├── use-file-dnd.ts                  # DnD 보일러플레이트 훅 (상태+센서+핸들러, onTrashDrop 옵션)
├── hidden-upload-input.tsx          # 컨텍스트 메뉴 파일 업로드용 hidden input
├── new-folder-input.tsx             # 새 폴더 입력 UI (compact prop)
├── breadcrumbs.tsx                  # 브레드크럼 네비게이션
├── parent-folder-row.tsx            # 상위 폴더 행 (드롭 대상)
├── draggable-file-row.tsx           # 파일/폴더 행 (DnD + 네이티브 파일 드롭)
├── drag-overlay-content.tsx         # 드래그 중 오버레이
├── file-context-menu.tsx            # 컨텍스트 메뉴 렌더러 (menuAction/menuSeparator 헬퍼, action 클릭 시 자동 닫기)
└── context-menu-button.tsx          # 메뉴 버튼 단일 항목
```

#### 소비 패턴

- **드라이브**: `useDrive()` (useFileBrowser 래핑 + 즐겨찾기/휴지통) → `useFileDnd({ onTrashDrop })` → 트리/즐겨찾기/리스트 소스별 메뉴 분기
- **모듈 파일 브라우저**: `useFileBrowser({ owner, deleteMode })` → `useFileDnd()` → 단순화된 메뉴 (즐겨찾기/트리 없음)
- **menuItems**: 각 소비자가 `FILE_ACTIONS` 상수 + `menuAction` 헬퍼로 조합. 소스 분기 차이로 공통화하지 않음
- **컨텍스트 메뉴 닫기**: `FileContextMenu`가 action 클릭 시 자동으로 `onClose()` 호출. 개별 콜백에서 닫기 처리 불필요
- **owner 타입**: `FileOwnerType = "drive" | "partner"` 리터럴 유니온 (`shared/lib/file-api.ts`)

#### 포커스 관리

`focus-trap-react` + WAI-ARIA Listbox Roving Tabindex 패턴.

- **Focus Trap**: 클릭 시 활성화(`setTrapActive(true)`), 영역 밖 클릭 시 비활성화. Portal(ContextMenu, Dialog, DropdownMenu)은 트랩 내 `portalRef`에 렌더링
- **Roving Tabindex**: 파일 목록은 단일 탭 스톱. 활성 항목(`activeItemId`)만 `tabIndex=0`, 나머지 `-1`. Arrow 키로 내부 이동
- **`activeItemId`**: 현재 포커스 위치(커서). `lastSelectedIdRef`는 Shift 범위 선택의 앵커(시작점). 역할이 분리되어 Shift+Arrow 연속 선택 가능
- **포커스 복구**: rename/새 폴더/다이얼로그 종료 시 `restoreFocus()`로 `activeItemId` 행 또는 컨테이너로 복구
- **Escape 전파 차단**: 캡처 단계 리스너(`stopImmediatePropagation`)로 Sheet/Dialog 닫힘 방지

### 데이터 페칭 패턴

#### api-client.ts

`shared/lib/api-client.ts` — fetch wrapper.

- `api.get/post/put/patch/delete<T>()` 메서드
- 자동 타임아웃 (15초). `api.get`의 세 번째 인자로 받은 Query 취소 신호와 합쳐서 fetch에 전달한다.
- `credentials: "include"` (쿠키 전송)
- 401 → sign-in, 403 → unauthorized 자동 리다이렉트
- `{ success: true, data }` 구조에서 `data`만 반환

#### TanStack Query

- 쿼리 키: `shared/lib/query-keys.ts`에서 중앙 관리
- 목록: `useQuery` + `keepPreviousData`. 첫 조회와 조건 변경(`isPlaceholderData`)은 스켈레톤, 같은 조건의 재조회(`isFetching`)는 기존 내용과 갱신 표시를 함께 제공한다.
- 생성/수정/삭제: `useMutation` + `onSuccess`에서 `invalidateQueries`
- URL 파라미터: `useSearchParams` (React Router)로 page/search 관리

#### Optimistic Update

적용 모듈: schedules 수정/순서 변경, schedules 인라인 편집, projects/clients/partners 메모 CRUD, projects 입금 내역 CRUD, projects 상태 변경, estimates 상태/계약버전 변경.

패턴: `onMutate` → 캐시 즉시 반영 + `onError` → 롤백 + `cancelQueries` (list + detail 모두)

#### 프로젝트 상태·작업단계의 연속 변경

`projects/project-status-queue.ts`가 같은 QueryClient 안에서 프로젝트별 저장 순서를 관리한다. `project-status-cache.ts`가 목록·상세 캐시와 저장 상태 표시를 연결한다.

- 화면에는 클릭한 최신 선택을 즉시 반영하고, 저장 중에도 상태·작업단계의 연속 조작을 허용한다.
- 같은 프로젝트의 저장 요청은 한 번에 하나만 실행한다. 아직 보내지 않은 변경은 필드별 마지막 선택으로 합치고, 다른 프로젝트는 병렬 저장한다.
- 응답을 받을 때 최신 대기 변경을 다시 합친다. 실패 시 목록 전체를 복구하지 않고 해당 프로젝트의 저장된 필드만 복구한다. 실패한 선택이 이미 더 최신 선택으로 대체되었으면 최신 선택을 유지한다.
- 목록·상세의 이전 조회를 취소하고, 저장 도중 시작된 조회 응답에도 최신 선택을 합쳐 적용한다. 관련 상태 저장이 모두 끝난 뒤 목록·요약 캐시를 재조회한다.
- 이 큐의 수명은 QueryClient에 묶여 있다. 여러 브라우저·사용자 사이의 동시 편집 충돌을 중재하는 서버 잠금은 아니다.

검증: `npm run test --workspace=apps/client`. 연속 변경 병합, 다른 행의 동시 저장, 실패 복구, 오래된 조회 응답을 제어 가능한 Promise로 검증한다.

### 폼 패턴

React Hook Form + Zod + `@hookform/resolvers`. 폼 UI 개발 시 가능한 한 RHF 패턴을 사용한다.

```typescript
const form = useForm<T>({
  resolver: zodResolver(schema),
  defaultValues: prevValues || defaults,
});
useFormGuard(form);  // 변경 감지

async function onSubmit(values: T) {
  if (id) await updateMutation.mutateAsync({ id, data: values });
  else await createMutation.mutateAsync(values);
  sheet.close();
}
```

**Zod `.default()` 사용 시**: `zodResolver(schema) as Resolver<T>` 타입 캐스트 필요.

**날짜 필드**: 로컬 스키마에서 `z.date()` override → 제출 시 `format(date, "yyyy-MM-dd")` 변환.

#### 폼 컴포넌트 (`shared/ui/form/`)

FormTextInput, FormPhoneInput, FormEmailInput, FormPasswordInput, FormTextarea, FormSelect, FormNativeSelect, FormCombobox, FormMultiCombobox, FormDatePicker, FormNumberInput, FormCheckbox, FormCheckboxGroup, FormRadioGroup, FormSwitch, FormFileUpload, FormEditor, FormAddressInput, FormFieldArray, FormUrlInput

### Tailwind CSS V4

`globals.css`에서 `@import "tailwindcss"` + `@tailwindcss/vite` 플러그인.

- oklch 색상 시스템 (CSS 변수)
- Pretendard + Poppins 폰트 (`public/fonts/`)
- Shadcn UI (New York 스타일)

### 커스텀 훅 (`shared/hooks/`)

| 훅 | 역할 |
|----|------|
| `useQueryParams` | URL 쿼리 파라미터 get/set/remove/clear |
| `useDebounce` | 값 디바운스 (검색어) |
| `useThrottle` | 값 스로틀 |
| `useTheme` | 다크모드 토글 (localStorage) |
| `useMobile` | 모바일 판별 (md 브레이크포인트) |
| `useScroll` | 스크롤 위치 감지 |
| `useSortableReorder` | DnD 순서 변경 공통 훅 (@dnd-kit, 로컬 상태 + 서버 동기화) |

### PDF 생성

`@react-pdf/renderer`로 견적서 PDF 생성. `shared/ui/pdf-preview.tsx`에서 미리보기 제공.

- 문서 데이터 변환과 PDF 생성 모듈을 분리하고, 렌더러는 미리보기가 필요할 때 동적으로 로드한다.
- 실제 출력 데이터의 JSON을 키로 PDF Blob과 진행 중인 생성 요청을 공유한다. 최근 12개만 보관하며 실패한 요청은 캐시에서 제거한다.
- PDF용 Pretendard는 원본 정적 TTF 3종(400·500·700)을 사용한다. WOFF는 fontkit이 글자 처리 중 테이블을 반복 압축 해제하여 PDF 생성 시간이 길어지므로 사용하지 않는다. 전송 용량은 서버의 HTTP gzip 압축으로 줄인다. 화면용 가변 WOFF2와 PDF 렌더러의 지원 형식이 달라 별도로 제공한다.
- 폰트 요청은 본문 수신까지 15초로 제한하고, 모두 받은 후 등록한다. 실패 시 재시도할 수 있다. Vite가 파일명에 해시를 붙여 브라우저 캐시를 재사용한다.
- PDF.js 워커를 미리보기 사이에서 공유한다. 화면 맞춤은 기존 canvas의 CSS 크기만 조정한다. 컨테이너 폭이 바뀌면 캐시된 PDF를 재사용해 해상도에 맞춰 다시 그린다.
- 입력 변경은 150ms 동안 모아 마지막 값만 렌더링하고, 취소된 작업은 화면을 덮어쓰지 않는다. 로딩·실패·재시도 UI를 제공하며 전체 준비 시간도 30초로 제한한다.
- 상세 화면과 프로젝트 견적서 버전 미리보기는 동일한 Query 상세 캐시(기본 1분)를 사용한다. 수정 후에는 기존 mutation에서 무효화한다.

### 페이지 로딩

인증·레이아웃은 초기 번들에 포함하고, 업무 페이지는 React Router의 `lazy`로 방문 시 로드한다. PDF 렌더러·자료실 편집기·재무 차트를 로그인 전에 한꺼번에 내려받지 않는다.

- 업무 페이지 코드를 불러오는 동안 본문에 스켈레톤을 표시하고 사이드바는 유지한다.
- 공통 목록/상세와 견적 전용 상세에 스켈레톤을 연결한다. 조회 실패는 빈 결과와 구분하고 다시 시도 버튼을 제공한다. 캐시가 있으면 재조회 실패 시 이전 내용과 오류 안내를 함께 표시한다.
- 사용 화면이 없는 엑셀 내보내기 컴포넌트·재내보내기·`xlsx-js-style` 의존성은 제거했다.

---

## 서버 (`apps/server`)

Hono + Drizzle ORM. 상세한 API 패턴은 [api.md](api.md) 참조.

### 디렉토리 구조

```
src/
├── index.ts              # Hono 앱 엔트리 (CORS, Auth, 라우트, 정적 서빙)
├── auth/index.ts         # Better Auth 설정
├── middleware/auth.ts     # requireAuth, requireSuperAdmin
├── routes/               # API 라우트 (모듈별 1파일)
│   ├── index.ts          # 라우트 조합
│   ├── clients.ts, partners.ts, estimates.ts, projects.ts, project-schedules.ts, schedules.ts
│   ├── todos.ts, admins.ts, dashboard.ts, revenue.ts
│   ├── library-boards.ts, library-documents.ts, files.ts, uploads.ts, trash.ts
│   └── business-info.ts
├── lib/                  # 유틸리티
│   ├── errors.ts         # ERRORS 상수, successResponse, errorResponse
│   ├── pagination.ts     # parsePagination, calcOffset
│   ├── query-helpers.ts  # softDeleteFilter, softDeletePayload, searchFilter, getBilledAmount, reorderSchema, executeReorder
│   ├── number-generator.ts # 견적서/프로젝트 번호 생성
│   ├── storage.ts        # 로컬 파일시스템 스토리지 (uploadFile, deleteFile, getFile)
│   ├── types.ts          # AppVariables (AuthUser, AuthSession)
│   └── constants.ts      # SERVER_PAGE_SIZE_DEFAULT
└── db/
    ├── index.ts          # Drizzle 클라이언트
    ├── schema/           # 테이블 스키마 + 관계 (→ database.md 참조)
    ├── seed.ts           # 시드 데이터
    └── reset.ts          # DB 초기화
```

### 라우트 패턴

각 라우트 파일은 독립된 `Hono` 인스턴스:

1. `app.use("*", requireAuth)` — 전역 인증
2. 하위 리소스 라우트 (`:id`보다 먼저 등록, 경로 충돌 방지)
3. CRUD 엔드포인트 (GET list → POST → GET :id → PATCH :id → DELETE :id)
4. Zod `safeParse`로 입력 검증
5. `successResponse` / `errorResponse`로 일관된 응답

---

## 공유 패키지 (`packages/`)

### schemas (`@packages/schemas`)

모듈별 Zod 스키마. 클라이언트 폼 검증과 서버 입력 검증에 동시 사용.

파일: `admins.ts`, `clients.ts`, `estimates.ts`, `library.ts`, `mindnotes.ts`, `partners.ts`, `projects.ts`, `project-schedules.ts`, `schedules.ts`, `todos.ts`

### types (`@packages/types`)

공유 상수 및 타입 정의.

- `constants.ts` — `TAX_TYPE`, `DISCOUNT_TYPE`, `PROJECT_STATUS`, `ESTIMATE_STATUS`, `PARTNER_SPECIALTIES` 등
- `common.ts` — 공통 타입
- `results.ts` — API 응답 타입 (`ApiResponse`, `PaginatedResponse`)

### utils (`@packages/utils`)

- `amount-calculator.ts` — `calculateTotal()`, `calculateTaxBreakdown()`, `buildPriceSummaryDisplay()`
- `result.ts` — Result 패턴 헬퍼
- `constants.ts` — 공유 상수
