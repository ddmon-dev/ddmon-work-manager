---
name: projects
description: "리틀어썸 Work Manager의 프로젝트(projects) 데이터를 조회·생성·수정·상태변경한다. '프로젝트', '진행 중', '완료된 프로젝트', '수금', '1차 수금', '파트너', '계약금', '프로젝트 비용', '세금계산서', '번호 P-2025' 같은 발화에 트리거. 프로젝트 목록·상세, 상태 전환, 수금·세금계산서·파트너 배치·비용 관리까지 커버."
---

# Work Manager: Projects 스킬

Work Manager 앱의 `projects` 엔티티와 부속(수금, 세금계산서, 파트너, 비용, 파트너 지급)을 Hono API 경유로 조작한다.

## 핵심 도메인 개념

- **`contractAmount`**: 공급가액 (VAT 제외).
- **`taxType`**: `"vat"`(기본) 또는 `"withholding"`.
  - VAT: 수금액 = 공급가액 × 1.1
  - 원천: 실수령 = 공급가액 × 0.967
- **`billingClientId`**: 청구 클라이언트. `clientId` 와 다를 수 있음(총판 경유 등).
- **하위 리소스**:
  - `collections` — 수금 차수별 기록
  - `invoices` — 세금계산서
  - `partners` — 프로젝트에 배치된 외주 파트너
  - `partnerPayments` — 파트너 지급 내역
  - `expenses` — 프로젝트 비용
  - `memos` — 내부 메모

## 트리거 예시

- "이번 달 진행 중인 프로젝트 보여줘"
- "P-2025-003 수금 1차 5,500,000원 완료 기록해줘"
- "프로젝트 X 상태 '완료'로 바꿔줘"
- "DDP 리뉴얼 프로젝트에 배치된 파트너 누구야?"
- "프로젝트 Y 비용 내역 합산 알려줘"

## 실행 절차

### Step 1 — 공통 참조

1. `../../shared/api-client.md`
2. `../../shared/auth.md`

### Step 2 — 쓰기 작업이면 위험 게이트

다음은 **반드시** `../../shared/risk-gate.md` 프로토콜:

- 프로젝트 상태 변경 (`PATCH /:id/status`)
- 수금 기록 추가·수정·삭제 (`POST /:id/collections`, `PATCH /collections/:id`, `DELETE /collections/:id`)
- 세금계산서 발행·수정·삭제
- 파트너 배치·금액 수정·지급 (`POST /:id/partners`, `PATCH /partners/:id`, `POST /:id/partner-payments`)
- 프로젝트 본체 금액·세금유형 수정 (`PATCH /:id`)
- `billingClientId` 변경
- 프로젝트 삭제
- 프로젝트 비용 수정·삭제

일상 조회·메모 추가는 게이트 없이 바로.

### Step 3 — 엔드포인트 참조

`references/endpoints.md` 확인.

### Step 4 — 호출 + 보고

## 보고 양식

조회:
```
[프로젝트 P-2025-003 — DDP 리뉴얼]
상태: in_progress / 2025-11-15 시작 / 2026-01-31 종료 예정
공급가액: 12,000,000원 (VAT 별도, 총 13,200,000원)
수금: 2차 중 1차 완료 (5,500,000원 @ 2025-12-10), 2차 대기
파트너: 2명 배치 (지급 완료 1, 미지급 1)
비용 누계: 3,400,000원
```

변경 완료:
```
[완료] P-2025-003 수금 1차: 5,500,000원, 2025-12-10 입금 기록됨
```

## 관련 스킬

- **clients**: 프로젝트의 고객/청구 클라이언트 정보
- **estimates**: 프로젝트의 원천 견적서
