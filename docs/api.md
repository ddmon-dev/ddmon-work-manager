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
| GET | `/projects/:id` | 상세 (payments/memos/estimateSeries 포함) |
| PATCH | `/projects/:id` | 수정 |
| DELETE | `/projects/:id` | 소프트 삭제 |
| PATCH | `/projects/:id/status` | 상태 변경 |
| POST | `/projects/:id/payments` | 입금 내역 생성 |
| PATCH | `/projects/payments/:id` | 입금 내역 수정 |
| DELETE | `/projects/payments/:id` | 입금 내역 소프트 삭제 |
| POST | `/projects/:id/memos` | 메모 생성 |
| PATCH | `/projects/memos/:id` | 메모 수정 |
| DELETE | `/projects/memos/:id` | 메모 소프트 삭제 |

### Project Schedules (`/api/project-schedules`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/project-schedules` | 목록 (`?projectId=`, sortOrder 정렬, 비페이지네이션) |
| POST | `/project-schedules` | 생성 |
| GET | `/project-schedules/:id` | 상세 |
| PATCH | `/project-schedules/:id` | 수정 |
| DELETE | `/project-schedules/:id` | **하드 삭제** |
| PUT | `/project-schedules/reorder` | 순서 변경 (`{ items: [{ id, sortOrder }] }`) |
| GET | `/project-schedules/overview` | 멀티 프로젝트 오버뷰 (`?status=active\|completed`) |

카테고리: `planning` (기획), `design` (디자인), `development` (개발), `revision` (수정), `delivery` (납품)

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

헬퍼: `apps/server/src/lib/query-helpers.ts`

### author 변환

상세 조회 시 author ID → `"name(username)"` 포맷으로 변환.
user 테이블에서 `inArray()`로 일괄 조회 후 매핑.
