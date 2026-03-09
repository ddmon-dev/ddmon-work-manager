# 데이터베이스

Drizzle ORM + PostgreSQL 17. 스키마 파일: `apps/server/src/db/schema/`

## 테이블 개요

### 인증 (Better Auth)

Admins = Better Auth user 테이블 (별도 admins 테이블 없음).

| 테이블 | 설명 | PK |
|--------|------|-----|
| `user` | 사용자 (관리자) | text |
| `session` | 세션 | text |
| `account` | 인증 계정 | text |
| `verification` | 인증 검증 | text |

**user 커스텀 필드**: `super_admin` (boolean), `phone` (text), `deleted` (boolean)

### 비즈니스 엔티티

| 테이블 | 설명 | PK | 삭제 방식 |
|--------|------|-----|-----------|
| `clients` | 고객 | uuid | 소프트 |
| `client_memos` | 고객 메모 | uuid | 소프트 |
| `estimate_series` | 견적서 계열 (상태 관리) | text (estimate_number) | — |
| `estimates` | 견적서 (버전별 데이터) | uuid | 소프트 |
| `estimate_item_groups` | 견적서 아이템 그룹 | uuid | CASCADE |
| `estimate_items` | 견적서 아이템 | uuid | CASCADE |
| `projects` | 프로젝트 | uuid | 소프트 |
| `project_payments` | 입금 내역 | uuid | 소프트 |
| `project_memos` | 프로젝트 메모 | uuid | 소프트 |
| `project_schedule_lanes` | 프로젝트 일정 레인 | uuid | **하드** (CASCADE) |
| `project_schedules` | 프로젝트 일정 (카테고리 기반 태스크) | uuid | **하드** |
| `schedules` | 일정 (sortOrder로 프로젝트 내 수동 정렬) | uuid | **하드** |
| `todos` | 투두 | uuid | **하드** |
| `todo_time_blocks` | 타임블록 (30분 단위) | uuid | **하드** |
| `mindnotes` | 마인드노트 | uuid | **하드** |
| `business_info` | 사업자 정보 | uuid | — |

## 관계 구조

```
clients ─────┬── client_memos (1:N, CASCADE)
             ├── estimates (1:N, RESTRICT)
             ├── projects (1:N, RESTRICT)
             └── schedules (1:N, SET NULL)

estimate_series ─── estimates (1:N)
                     └── estimate_item_groups (1:N, CASCADE)
                          └── estimate_items (1:N, CASCADE)

projects ─────┬── project_payments (1:N, CASCADE)
              ├── project_memos (1:N, CASCADE)
              ├── project_schedule_lanes (1:N, CASCADE)
              │    └── project_schedules (1:N, CASCADE)
              └── schedules (1:N, SET NULL)

user ─────┬── todos (1:N, CASCADE)
          │    └── todo_time_blocks (1:N, CASCADE)
          ├── mindnotes (1:N, CASCADE)
          └── session, account (1:N, CASCADE)
```

## FK 삭제 전략

| 전략 | 적용 | 이유 |
|------|------|------|
| **CASCADE** | 메모, 입금 내역, 아이템, 세션 | 부모 삭제 시 자식 함께 삭제 |
| **RESTRICT** | clients → estimates, projects | 고객에 연결된 견적서/프로젝트 있으면 삭제 차단 |
| **SET NULL** | schedules → project/client, estimates → author | 참조 대상 삭제 시 null로 변환 |

## 제약조건

### UNIQUE

- `estimates`: `(estimate_number, version)` — 계열 내 버전 중복 방지
- `projects`: `project_number` — 프로젝트 번호 고유
- `todo_time_blocks`: `(todo_id, block_date)` — 투두당 날짜별 타임블록 1개
- `user`: `email`, `username`

### CHECK

- `estimate_series`: `(status = 'contracted') = (final_estimate_id IS NOT NULL)` — contracted 상태에만 최종 버전 존재

### 인덱스

- `estimates`: `client_id`, `estimate_number`, `issued_date`, `deleted`
- `estimate_item_groups`: `estimate_id`
- `estimate_items`: `group_id`

## 삭제 전략

### 소프트 삭제 (기본)

`deleted` boolean 컬럼 + `updated_at` 타임스탬프.
모든 SELECT에서 `softDeleteFilter(table.deleted)` 적용 필수.

대상: clients, client_memos, estimates, projects, project_payments, project_memos, user

### 하드 삭제

대상: project_schedules, schedules, todos, todo_time_blocks, mindnotes

- schedules: 마이그레이션 스쿼시 시 deleted 컬럼 제거
- todos/todo_time_blocks: 사용자 소유 데이터, 복원 불필요
- mindnotes: 사용자 소유 데이터, 복원 불필요

## 주요 컬럼 설명

### 견적서 (estimates)

- `tax_type`: `"vat"` (기본) | `"withholding"` — 세금 유형
- `discount_type`: `"none"` | `"amount"` | `"percentage"`
- `total_amount`, `discount_amount`: `numeric(14,2)` / `numeric(12,2)`
- `publisher_info`: `jsonb` — 발행 시점 사업자/발행자 정보 스냅샷
- `version`: 계열 내 자동 증가
- `version_label`: 사용자 지정 레이블

### 프로젝트 (projects)

- `status`: `pending` | `active` | `settling` | `completed` | `discarded`
- `work_phase`: `preparing` | `working` | `reviewing` | `delivered`
- `contract_amount`: 공급가액 (`numeric(15,2)`). 견적서와 독립
- `tax_type`: nullable. 신규 기본값 `"vat"`, 기존 withholding 유지
- `estimate_number`: nullable. 견적서 없이도 프로젝트 생성 가능

### 프로젝트 일정 레인 (project_schedule_lanes)

- `project_id`: NOT NULL FK → projects(id) ON DELETE CASCADE
- `title`: text — 레인 제목 (기본 빈 문자열)
- `sort_order`: integer — 간트 차트 내 레인 정렬 순서 (기본 0)
- 프로젝트 생성 시 기본 레인 1개 자동 생성

### 프로젝트 일정 (project_schedules)

- `project_id`: NOT NULL FK → projects(id) ON DELETE CASCADE
- `lane_id`: NOT NULL FK → project_schedule_lanes(id) ON DELETE CASCADE — 소속 레인
- `category`: string — 프리셋 카테고리(`planning`/`design`/`development`/`revision`/`delivery`) 또는 커스텀 카테고리명
- `category_color`: nullable text — 커스텀 카테고리 색상 (프리셋이면 null)
- `sort_order`: integer — 간트 차트 내 수동 정렬 순서 (기본 0)

### 일정 (schedules)

- `sort_order`: integer — 프로젝트 간트 차트 내 수동 정렬 순서 (기본 0)
- `recurrence_type`: `"none"` | `"daily"` | `"weekly"` | `"monthly"`
- `color`: 바 색상 키 (default, blue, green, yellow 등 9종)
- `project_id`, `client_id`: nullable FK (SET NULL)

### 투두 타임블록 (todo_time_blocks)

- `start_slot`: 0~47 (30분 단위, 0=00:00, 47=23:30)
- `duration_slots`: 기본 2 (1시간)
- `(todo_id, block_date)` UNIQUE → upsert 패턴

## 마이그레이션 관리

마이그레이션 파일: `0000_initial` ~ `0004_add_project_schedules` (5개). 0000~0003은 초기 스키마, 0004는 프로젝트 일정 관련 테이블 추가.

### 스키마 변경 절차

```bash
# 1. 스키마 파일 수정 (apps/server/src/db/schema/*.ts)
# 2. 마이그레이션 파일 생성 (--name 필수)
npm run db:generate -- --name "add_xxx"

# 3. 마이그레이션 실행
npm run db:migrate

# 4. 전체 재적용 (개발환경만)
npm run db:reset
```

### 시드 데이터

`apps/server/src/db/seed.ts` — 기존 Next.js 운영 DB 이관 데이터. `.gitignore`에 포함.
