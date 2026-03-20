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
| `project_invoices` | 세금계산서 (VAT 프로젝트) | uuid | 소프트 |
| `project_payments` | 입금 내역 (원천징수 프로젝트) | uuid | 소프트 |
| `project_expenses` | 프로젝트 지출 내역 | uuid | 소프트 |
| `partner_payments` | 파트너 지급 내역 | uuid | 소프트 |
| `project_memos` | 프로젝트 메모 | uuid | 소프트 |
| `project_schedule_lanes` | 프로젝트 일정 레인 | uuid | **하드** (CASCADE) |
| `project_schedules` | 프로젝트 일정 (카테고리 기반 태스크) | uuid | **하드** |
| `schedules` | 일정 (sortOrder로 프로젝트 내 수동 정렬) | uuid | **하드** |
| `todos` | 투두 | uuid | **하드** |
| `todo_time_blocks` | 타임블록 (30분 단위) | uuid | **하드** |
| `mindnotes` | 마인드노트 | uuid | **하드** |
| `memos` | 메모 (개인 메모장) | uuid | **하드** |
| `business_info` | 사업자 정보 | uuid | — |
| `partners` | 파트너 (프리랜서/협력사) | uuid | 소프트 |
| `partner_memos` | 파트너 메모 | uuid | 소프트 |
| `project_partners` | 프로젝트-파트너 배치 (다대다) | uuid | **하드** |
| `library_boards` | 라이브러리 게시판 | uuid | 소프트 |
| `library_documents` | 라이브러리 문서 | uuid | 소프트 (휴지통) |
| `files` | 드라이브 파일/폴더 | uuid | 소프트 (휴지통) |

## 관계 구조

```
clients ─────┬── client_memos (1:N, CASCADE)
             ├── estimates (1:N, RESTRICT)
             ├── projects (1:N, RESTRICT)
             └── schedules (1:N, SET NULL)

estimate_series ─── estimates (1:N)
                     └── estimate_item_groups (1:N, CASCADE)
                          └── estimate_items (1:N, CASCADE)

partners ─────┬── partner_memos (1:N, CASCADE)
              ├── project_partners (1:N, RESTRICT)
              └── partner_payments (1:N, RESTRICT)

projects ─────┬── project_invoices (1:N, CASCADE)
              ├── project_payments (1:N, CASCADE)
              ├── project_expenses (1:N, CASCADE)
              ├── partner_payments (1:N, CASCADE)
              ├── project_memos (1:N, CASCADE)
              ├── project_partners (1:N, CASCADE)
              ├── project_schedule_lanes (1:N, CASCADE)
              │    └── project_schedules (1:N, CASCADE)
              └── schedules (1:N, SET NULL)

user ─────┬── todos (1:N, CASCADE)
          │    └── todo_time_blocks (1:N, CASCADE)
          ├── mindnotes (1:N, CASCADE)
          ├── memos (1:N, CASCADE)
          └── session, account (1:N, CASCADE)

library_boards ─── library_documents (1:N, RESTRICT)

files ─── files (self-ref, folderId → RESTRICT)
```

## FK 삭제 전략

| 전략 | 적용 | 이유 |
|------|------|------|
| **CASCADE** | 메모, 입금 내역, 아이템, 세션 | 부모 삭제 시 자식 함께 삭제 |
| **RESTRICT** | clients → estimates, projects; partners → project_partners, partner_payments | 연결된 하위 엔티티 있으면 삭제 차단 |
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

대상: clients, client_memos, estimates, projects, project_invoices, project_payments, project_expenses, partner_payments, project_memos, partners, partner_memos, user, library_boards, library_documents, files

### 하드 삭제

대상: project_schedules, project_schedule_lanes, schedules, todos, todo_time_blocks, mindnotes, memos

- project_schedules/project_schedule_lanes: 프로젝트 삭제 시 CASCADE
- schedules: deleted 컬럼 없음
- todos/todo_time_blocks: 사용자 소유 데이터, 복원 불필요
- mindnotes/memos: 사용자 소유 데이터, 복원 불필요

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

### 파트너 (partners)

- `name`: 성명 (NOT NULL)
- `resident_number`: 주민등록번호 (평문 저장, 원천세 신고용)
- `bank_name`, `bank_account`, `account_holder`: 정산 계좌 정보
- `specialties`: text[] — 전문분야 (PARTNER_SPECIALTIES 상수 + 기타)

### 프로젝트 입금 내역 (project_payments)

- `payment_type`: `"deposit"` (계약금) | `"interim"` (중도금) | `"balance"` (잔금) | `"additional"` (추가금) — 기본값 `"deposit"`
- `invoice_issued`: boolean — 세금계산서 발행 여부 (기본 false)
- `invoice_date`: date nullable — 세금계산서 발행일

### 프로젝트 지출 내역 (project_expenses)

- `project_id`: NOT NULL FK → projects(id) ON DELETE CASCADE
- `description`: 지출 내용 (NOT NULL)
- `amount`: 지출 금액 `numeric(15,2)` (기본 0)
- `expense_date`: 지출일 (NOT NULL)
- `deleted`: 소프트 삭제 플래그

### 파트너 지급 내역 (partner_payments)

- `project_id`: NOT NULL FK → projects(id) ON DELETE CASCADE
- `partner_id`: NOT NULL FK → partners(id) ON DELETE RESTRICT
- `description`: 지급 내용 (NOT NULL)
- `amount`: 실지급액 `numeric(15,2)` (기본 0) — 원천징수 3.3% 차감 후 파트너에게 실제 이체하는 금액. 원천세 역산: `amount ÷ 0.967 × 0.033`
- `paid_date`: 지급일 (NOT NULL)
- `withholding_reported`: boolean — 원천세 신고 여부 (기본 false)
- `withholding_reported_date`: date nullable — 원천세 신고일
- `deleted`: 소프트 삭제 플래그

### 프로젝트 파트너 (project_partners)

- `project_id`: NOT NULL FK → projects(id) ON DELETE CASCADE
- `partner_id`: NOT NULL FK → partners(id) ON DELETE RESTRICT
- `roles`: text[] — 배치 역할 (PARTNER_SPECIALTIES 상수 공유 + 기타)
- `amount`: numeric — 파트너 비용
- `tax_type`: text — 정산방식 (`"withholding"` 기본 | `"vat"`)

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

### 라이브러리 게시판 (library_boards)

- `name`: 게시판 이름 (NOT NULL)
- `description`: 설명 (nullable)
- `sort_order`: 수동 정렬 순서 (기본 0)
- `deleted`: 소프트 삭제 플래그

### 라이브러리 문서 (library_documents)

- `board_id`: NOT NULL FK → library_boards(id) ON DELETE RESTRICT
- `title`: 문서 제목 (NOT NULL)
- `content`: 문서 본문 (BlockNote JSON, nullable)
- `author`: 작성자, `updated_by`: 최종 수정자
- `deleted` + `deleted_at`: 휴지통 (소프트 삭제)

### 파일 (files)

- `name`: 파일/폴더 이름 (NOT NULL)
- `s3_key`: 스토리지 상대 경로 (예: `files/uuid.ext`). 폴더는 null
- `mime_type`, `size`: 파일 메타데이터
- `folder_id`: self-referencing FK → files(id) ON DELETE RESTRICT. null이면 루트
- `is_folder`: 폴더 여부 (기본 false). 폴더는 DB에만 존재 (스토리지에 물리 디렉토리 없음)
- `is_favorited`: 즐겨찾기 여부 (기본 false)
- `favorite_order`: 즐겨찾기 정렬 순서 (nullable)
- `deleted` + `deleted_at`: 휴지통 (소프트 삭제)

## 마이그레이션 관리

마이그레이션 파일: `0000_initial` ~ 최신 (순차 증가). 0000~0003은 초기 스키마, 0004는 프로젝트 일정, 0006은 라이브러리/드라이브 테이블 추가, 0007~0008은 파일 즐겨찾기, 0011은 파트너 관리, 이후는 프로젝트 재무 관리 (project_expenses, partner_payments 추가, project_payments 컬럼 확장).

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

### 마이그레이션 통합 규칙

- **운영 DB에 적용된 마이그레이션은 절대 수정/통합/삭제하지 않는다**
- 피쳐 개발 중 여러 개 생긴 마이그레이션은 main 머지 전에 순효과로 통합한다
- 통합 대상은 운영 DB에 아직 적용되지 않은 마이그레이션만 해당한다
- 통합 시 중간 과정의 무의미한 변경(컬럼 추가 후 삭제, paid_date 기본값 변경 등)을 제거한다
- 통합 후 journal, snapshot도 함께 정리한다

### 네이밍 컨벤션

`--name` 플래그로 의미 있는 이름을 부여한다. snake_case, 영문 사용.

| 접두사 | 용도 | 예시 |
|--------|------|------|
| `add_xxx` | 테이블/컬럼 추가 | `add_project_schedules` |
| `drop_xxx` | 테이블/컬럼 삭제 | `drop_legacy_column` |
| `alter_xxx` | 컬럼 변경 | `alter_status_type` |

### 시드 데이터

`apps/server/src/db/seed.ts` — 기존 Next.js 운영 DB 이관 데이터. `.gitignore`에 포함.
