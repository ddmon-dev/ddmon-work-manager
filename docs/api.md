# API

모든 API는 `/api` 프리픽스 하위. Hono 라우터 기반.

## 인증

### Better Auth

이메일 + 비밀번호 인증. `username` 플러그인 활성화. 세션 만료: 30일.

- 인증 엔드포인트: `/api/auth/*` (Better Auth 내장 핸들러)
- 세션 쿠키 기반 (`credentials: "include"`)

### 미들웨어

```
requireAuth → requireSuperAdmin (선택적)
```

- **requireAuth**: 모든 API 라우트에 적용. 세션 검증 후 `c.set("user", ...)`, `c.set("session", ...)` 설정
- **requireSuperAdmin**: `user.superAdmin === true` 검증. 관리자 CRUD 등 특정 엔드포인트에만 적용

미들웨어 위치: `apps/server/src/middleware/auth.ts`

### 클라이언트 측 처리

`shared/lib/api-client.ts`에서 자동 처리:
- 401 → `/auth/sign-in`으로 리다이렉트
- 403 → `/unauthorized`로 리다이렉트

## 응답 패턴

### 성공

```typescript
// 단건
{ success: true, data: T }

// 페이지네이션 목록
{ success: true, data: { items: T[], total: number, page: number, pageSize: number } }

// 비페이지네이션 목록 (schedules/monthly, todos, todos/incomplete)
{ success: true, data: { items: T[] } }
```

헬퍼: `successResponse(c, data, status?)` — status 기본값 200, 생성 시 201

### 에러

```typescript
{ success: false, error: "ERROR_CODE", message: "상세 메시지" }
```

| 에러 코드 | HTTP | 설명 |
|-----------|------|------|
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `CREATE_FAILED` | 500 | 생성 실패 |
| `UPDATE_FAILED` | 500 | 수정 실패 |
| `DELETE_FAILED` | 500 | 삭제 실패 |
| `UNEXPECTED_ERROR` | 500 | 예기치 않은 오류 |
| `PARTNER_HAS_ASSIGNMENTS` | 409 | 프로젝트에 배치된 파트너 삭제 불가 |
| `DUPLICATE_ASSIGNMENT` | 409 | 이미 배치된 파트너 |

헬퍼: `errorResponse(c, ERRORS.XXX, status, detail?)` — detail이 있으면 기본 메시지 대체

정의 파일: `apps/server/src/lib/errors.ts`

### 페이지네이션

쿼리 파라미터: `page` (기본 1), `pageSize` (기본 15, 최대 100), `search` (선택)

헬퍼: `parsePagination(c.req.query())`, `calcOffset(page, pageSize)`

정의 파일: `apps/server/src/lib/pagination.ts`

## 엔드포인트 레퍼런스

### Clients (`/api/clients`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/clients` | 목록 (페이지네이션, 검색: companyName, contactName, email) |
| POST | `/clients` | 생성 |
| GET | `/clients/:id` | 상세 (메모 포함, author → "name(username)" 변환) |
| PATCH | `/clients/:id` | 수정 |
| DELETE | `/clients/:id` | 소프트 삭제 |
| POST | `/clients/:id/memos` | 메모 생성 |
| PATCH | `/clients/memos/:id` | 메모 수정 |
| DELETE | `/clients/memos/:id` | 메모 소프트 삭제 |

### Partners (`/api/partners`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/partners` | 목록 (페이지네이션, 검색: name, phone) |
| POST | `/partners` | 생성 |
| GET | `/partners/:id` | 상세 (메모 포함, author → "name(username)" 변환) |
| PATCH | `/partners/:id` | 수정 |
| DELETE | `/partners/:id` | 소프트 삭제 (프로젝트 배치 있으면 409 거부) |
| POST | `/partners/:id/memos` | 메모 생성 |
| PATCH | `/partners/memos/:id` | 메모 수정 |
| DELETE | `/partners/memos/:id` | 메모 소프트 삭제 |

### Estimates (`/api/estimates`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/estimates` | 목록 (DISTINCT ON으로 계열별 대표 1건) |
| POST | `/estimates` | 생성 (트랜잭션: estimate + groups + items) |
| GET | `/estimates/:id` | 상세 (groups/items/versions/series/linkedProject) |
| PATCH | `/estimates/:id` | 수정 |
| DELETE | `/estimates/:id` | 소프트 삭제 |
| PATCH | `/estimates/series/:estimateNumber/status` | 계열 상태 변경 |
| GET | `/estimates/series/:estimateNumber/project-info` | 프로젝트 자동채움 데이터 |
| GET | `/estimates/available` | 프로젝트 연결 가능 견적서 (`?clientId=&currentEstimateNumber=`) |

### Projects (`/api/projects`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/projects` | 목록 (페이지네이션, 검색: name, projectNumber, clientName) |
| POST | `/projects` | 생성 (프로젝트 번호 자동 생성) |
| GET | `/projects/:id` | 상세 (invoices/payments/expenses/partnerPayments/memos/projectPartners 포함) |
| PATCH | `/projects/:id` | 수정 |
| DELETE | `/projects/:id` | 소프트 삭제 |
| PATCH | `/projects/:id/status` | 상태 변경 |
| POST | `/projects/:id/invoices` | 세금계산서 발행 (`paymentType`, `description`, `amount`, `issueDate`) |
| PATCH | `/projects/invoices/:id` | 세금계산서 수정 (`paymentType?`, `description?`, `amount?`, `issueDate?`, `paidDate?` nullable) |
| DELETE | `/projects/invoices/:id` | 세금계산서 소프트 삭제 |
| POST | `/projects/:id/payments` | 입금 내역 생성 (`paymentType` 필수, 원천징수 프로젝트용) |
| PATCH | `/projects/payments/:id` | 입금 내역 수정 (`paymentType?`) |
| DELETE | `/projects/payments/:id` | 입금 내역 소프트 삭제 |
| POST | `/projects/:id/expenses` | 지출 생성 (`description`, `amount`, `expenseDate`) |
| PATCH | `/projects/expenses/:id` | 지출 수정 |
| DELETE | `/projects/expenses/:id` | 지출 소프트 삭제 |
| POST | `/projects/:id/partner-payments` | 파트너 지급 생성 (`partnerId`, `description`, `amount`, `paidDate`) |
| PATCH | `/projects/partner-payments/:id` | 파트너 지급 수정 (`withholdingReported`, `withholdingReportedDate` 포함) |
| DELETE | `/projects/partner-payments/:id` | 파트너 지급 소프트 삭제 |
| POST | `/projects/:id/memos` | 메모 생성 |
| PATCH | `/projects/memos/:id` | 메모 수정 |
| DELETE | `/projects/memos/:id` | 메모 소프트 삭제 |
| GET | `/projects/:id/partners` | 프로젝트 파트너 목록 |
| POST | `/projects/:id/partners` | 파트너 배치 (중복 409) |
| PATCH | `/projects/partners/:id` | 파트너 배치 수정 |
| DELETE | `/projects/partners/:id` | 파트너 배치 해제 (하드 삭제) |

### Project Schedules (`/api/project-schedules`)

#### 레인 CRUD

| Method | Path | 설명 |
|--------|------|------|
| GET | `/project-schedules/lanes` | 레인 목록 (`?projectId=`, sortOrder 정렬) |
| POST | `/project-schedules/lanes` | 레인 생성 (`{ projectId, title?, sortOrder? }`) |
| PATCH | `/project-schedules/lanes/:id` | 레인 수정 (`{ title?, sortOrder? }`) |
| DELETE | `/project-schedules/lanes/:id` | 레인 삭제 (CASCADE: 소속 일정도 삭제) |
| PUT | `/project-schedules/lanes/reorder` | 레인 순서 변경 (`{ items: [{ id, sortOrder }] }`) |

#### 일정 CRUD

| Method | Path | 설명 |
|--------|------|------|
| GET | `/project-schedules` | 목록 (`?projectId=`, sortOrder 정렬, 비페이지네이션) |
| POST | `/project-schedules` | 생성 (`laneId` 필수) |
| GET | `/project-schedules/:id` | 상세 |
| PATCH | `/project-schedules/:id` | 수정 (`laneId` 변경으로 레인 간 이동 가능) |
| DELETE | `/project-schedules/:id` | **하드 삭제** |
| PUT | `/project-schedules/reorder` | 순서 변경 (`{ items: [{ id, sortOrder }] }`) |
| GET | `/project-schedules/overview` | 멀티 프로젝트 오버뷰 (`?status=active\|completed`) |

프리셋 카테고리: `planning` (기획), `design` (디자인), `development` (개발), `revision` (수정), `delivery` (납품). 커스텀 카테고리도 지원 (이름+색상).

**오버뷰 응답 구조**: 프로젝트 → 레인 → 일정 (레인 기반 행 구조)

**프로젝트 생성 시**: 기본 레인 1개 자동 생성

### Schedules (`/api/schedules`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/schedules` | 목록 (페이지네이션, `?projectId=` 시 sortOrder 정렬) |
| POST | `/schedules` | 생성 |
| GET | `/schedules/:id` | 상세 |
| PATCH | `/schedules/:id` | 수정 |
| DELETE | `/schedules/:id` | **하드 삭제** |
| PUT | `/schedules/reorder` | 순서 변경 (`{ items: [{ id, sortOrder }] }`) |
| GET | `/schedules/monthly` | 월간 일정 (`?year=&month=`, 비페이지네이션) |

### Todos (`/api/todos`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/todos` | 날짜별 조회 (`?date=YYYY-MM-DD`, 비페이지네이션) |
| POST | `/todos` | 생성 |
| PATCH | `/todos/:id` | 수정 |
| DELETE | `/todos/:id` | 하드 삭제 |
| GET | `/todos/incomplete` | 미완료 조회 (`?before=YYYY-MM-DD`, 이월 후보) |
| POST | `/todos/carry-over` | 이월 (트랜잭션: 날짜 변경 + 타임블록 삭제) |
| PUT | `/todos/:id/time-block` | 타임블록 upsert |
| DELETE | `/todos/time-blocks/:id` | 타임블록 삭제 |

userId 필터링: 모든 투두 API는 `user.id`로 자동 필터링 (사용자별 데이터 분리).

### Mindnotes (`/api/mindnotes`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/mindnotes` | 전체 목록 (createdAt desc, 비페이지네이션) |
| GET | `/mindnotes/random` | 랜덤 1건 (대시보드 히어로 섹션용) |
| POST | `/mindnotes` | 생성 |
| PATCH | `/mindnotes/:id` | 수정 |
| DELETE | `/mindnotes/:id` | **하드 삭제** |

userId 필터링: 모든 마인드노트 API는 `user.id`로 자동 필터링 (사용자별 데이터 분리).

### Memos (`/api/memos`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/memos` | 전체 목록 (createdAt desc, 비페이지네이션) |
| POST | `/memos` | 생성 |
| PATCH | `/memos/:id` | 수정 |
| DELETE | `/memos/:id` | **하드 삭제** |

userId 필터링: 모든 메모 API는 `user.id`로 자동 필터링 (사용자별 데이터 분리).

### Admins (`/api/admins`)

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/admins` | 목록 | requireAuth |
| POST | `/admins` | 생성 | requireSuperAdmin |
| GET | `/admins/:id` | 상세 | requireAuth |
| PATCH | `/admins/:id` | 수정 | requireSuperAdmin |
| DELETE | `/admins/:id` | 소프트 삭제 | requireSuperAdmin |

### Dashboard (`/api/dashboard`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/dashboard/stats` | 통계 (클라이언트/견적서/프로젝트 수, 미수금 등) |
| GET | `/dashboard/revenue-summary` | 매출 요약 |
| GET | `/dashboard/schedules` | 오늘/이번주 일정 |

### Revenue (`/api/revenue`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/revenue` | 연도별 매출 집계 (`?year=`) |

**집계 기준:**
- 연도별 요약 카드: 매출액·수금액 모두 **프로젝트 계약일 연도** 기준으로 집계
- 월별 차트: 매출액은 계약일, 수금액은 **실제 입금일** 기준 (현금 흐름 반영)

### Settlement (`/api/settlement`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/settlement` | 월별 미처리 건 조회 (`?year=&month=`) |
| PATCH | `/settlement/collections/batch` | 미수금 세금계산서 일괄 수금 완료 (`{ invoiceIds, paidDate }`) |
| PATCH | `/settlement/withholdings/batch` | 원천세 일괄 신고 마크 (`{ partnerPaymentIds, reportedDate }`) |

**GET 응답**: `{ uncollectedInvoices, unreportedPartnerPayments, summary: { uncollectedCount, unreportedCount } }`

- 미수금 세금계산서: `project_invoices` WHERE `paid_date IS NULL` AND `tax_type='vat'` AND 발행일 해당 월
- 원천세 미신고: `partner_payments` WHERE `withholding_reported=false` AND 해당 월

### Library Boards (`/api/library-boards`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/library-boards` | 목록 (sortOrder 정렬, 비페이지네이션) |
| POST | `/library-boards` | 생성 |
| PATCH | `/library-boards/:id` | 수정 |
| DELETE | `/library-boards/:id` | 소프트 삭제 |
| PUT | `/library-boards/reorder` | 순서 변경 (`{ ids: string[] }`) |

### Library Documents (`/api/library-documents`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/library-documents` | 목록 (`?boardId=` 필수, updatedAt desc, content 제외) |
| POST | `/library-documents` | 생성 |
| GET | `/library-documents/:id` | 상세 (content 포함) |
| PATCH | `/library-documents/:id` | 수정 (title, content 부분 수정 가능) |
| DELETE | `/library-documents/:id` | 휴지통으로 이동 |
| PATCH | `/library-documents/:id/move` | 게시판 이동 (`{ boardId }`) |
| PATCH | `/library-documents/:id/restore` | 휴지통에서 복원 |
| DELETE | `/library-documents/:id/permanent` | 영구 삭제 |

### Files (`/api/files`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/files` | 목록 (`?folderId=&sort=&order=`, null이면 루트) |
| POST | `/files/upload` | 파일 업로드 (multipart, `file` + `folderId`) |
| POST | `/files/folder` | 폴더 생성 |
| GET | `/files/:id/download` | 파일 다운로드 |
| PATCH | `/files/:id` | 이름 변경 |
| PATCH | `/files/:id/move` | 폴더 이동 (`{ folderId }`) |
| DELETE | `/files/:id` | 휴지통으로 이동 |
| PATCH | `/files/:id/restore` | 휴지통에서 복원 |
| DELETE | `/files/:id/permanent` | 영구 삭제 (스토리지 파일도 삭제) |
| POST | `/files/:id/open` | 네이티브 앱으로 파일 열기 |
| POST | `/files/:id/duplicate` | 파일/폴더 복제 |
| PATCH | `/files/:id/favorite` | 즐겨찾기 토글 (`{ isFavorited }`) |
| PUT | `/files/favorites/reorder` | 즐겨찾기 순서 변경 (`{ ids }`) |
| GET | `/files/:id/path` | 폴더 경로 조회 (브레드크럼용) |
| POST | `/files/batch-delete` | 배치 소프트 삭제 (`{ ids }`) |
| POST | `/files/batch-permanent-delete` | 배치 영구 삭제 (`{ ids }`) |
| POST | `/files/batch-move` | 배치 이동 (`{ ids, folderId }`) |
| POST | `/files/copy` | 배치 복사 (`{ ids, folderId }`) |

정렬 옵션: `sort=name|date|size`, `order=asc|desc`. 폴더가 항상 먼저 표시.

### Uploads (`/api/uploads`)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/uploads` | 에디터 이미지 업로드 (BlockNote용, multipart) |
| GET | `/uploads/:key` | 업로드된 파일 서빙 (immutable 캐시) |

### Trash (`/api/trash`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/trash` | 휴지통 목록 (문서 + 파일 통합, deletedAt desc) |
| DELETE | `/trash/empty` | 휴지통 비우기 (스토리지 파일 + DB 영구 삭제) |

### Business Info (`/api/business-info`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/business-info` | 사업자 정보 조회 |
| PATCH | `/business-info` | 사업자 정보 수정 |

## 비즈니스 로직

### 세금 계산

`taxType`: `"vat"` (기본) | `"withholding"`

| 항목 | VAT | Withholding |
|------|-----|-------------|
| contractAmount | 공급가액 | 원천징수 차감 전 금액 |
| taxAmount | contractAmount x 0.1 | contractAmount x 0.033 |
| 총수금액 | contractAmount x 1.1 | contractAmount |
| 실수령액 | contractAmount x 1.1 | contractAmount x 0.967 |

계산 로직: `packages/utils/src/amount-calculator.ts`

- `calculateTotal()` — 견적서 금액 계산 (그룹/아이템 소계 → 할인 → 세금)
- `calculateTaxBreakdown()` — 프로젝트 계약금액 기반 세금 분리

### 번호 생성

트랜잭션 내에서 호출 (동시성 방지).

- 견적서: `EST-YYYY-NNN` (예: EST-2026-001)
- 프로젝트: `PRJ-YYYY-NNN` (예: PRJ-2026-001)

정의 파일: `apps/server/src/lib/number-generator.ts`

### 견적서 계열/버전

- `estimateSeries` — 계열 상태 관리 (pending / contracted / expired)
- `estimates` — 계열 내 버전별 데이터
- 계열 내 개정본 추가: 기존 estimateNumber + version 자동 증가
- 계약 확정: `finalEstimateId` 설정 (최종 버전 지정)
- 목록 조회: `DISTINCT ON(estimate_number)` + finalEstimateId 우선 정렬

### 소프트 삭제

대부분 엔티티에 적용. 모든 SELECT에 `softDeleteFilter()` 필수.

```typescript
// 읽기
where(softDeleteFilter(table.deleted))

// 삭제
.set(softDeletePayload())  // { deleted: true, updatedAt: new Date() }
```

예외: schedules, todos, todo_time_blocks, mindnotes → 하드 삭제 (`db.delete()`)

헬퍼: `apps/server/src/lib/query-helpers.ts` — `softDeleteFilter`, `softDeletePayload`, `searchFilter`, `getBilledAmount`, `reorderSchema`, `executeReorder`

### author 변환

상세 조회 시 author ID → `"name(username)"` 포맷으로 변환.
user 테이블에서 `inArray()`로 일괄 조회 후 매핑.
