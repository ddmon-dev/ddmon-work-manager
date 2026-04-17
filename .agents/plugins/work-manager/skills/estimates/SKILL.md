---
name: estimates
description: "리틀어썸 Work Manager의 견적서(estimates) 데이터를 조회·생성·수정·상태변경한다. '견적', '견적서', '견적번호', '최종 버전', 'A-2025-001', '계약 상태', '수금완료', '원천징수', '부가세', 'PDF 견적서' 같은 발화에 트리거. 시리즈별·버전별 조회, 상태 전환, 최종 버전 지정, 새 버전 생성을 커버."
---

# Work Manager: Estimates 스킬

Work Manager 앱의 `estimates` 엔티티(견적서)를 Hono API 경유로 조작한다.

## 핵심 도메인 개념

- **시리즈(estimateSeries)**: 하나의 견적 번호(`A-2025-001` 등)가 여러 버전을 담는 단위. 상태(`pending` / `contracted` / `expired`)는 시리즈 단위.
- **버전(estimate)**: 시리즈 내 개별 견적서. 금액·항목이 다른 여러 버전 공존 가능.
- **`finalEstimateId`**: 시리즈에서 "최종 계약 버전"으로 지정된 버전의 ID. `contracted` 상태는 반드시 `finalEstimateId` 필수 (CHECK 제약).
- **`taxType`**: `"vat"`(기본) 또는 `"withholding"`. 금액 계산 방식이 달라짐.
- **`billingClientId`**: 청구 클라이언트. `clientId` 와 다를 수 있음(총판 경유 등). null이면 `clientId` 와 동일.

## 트리거 예시

- "A-2025-001 견적 상태 뭐야?"
- "DDP 에이전시 최근 견적 최종 버전 알려줘"
- "견적서 A-2025-001 계약 상태로 바꿔줘 (최종 버전 2차로)"
- "새 버전으로 금액 조정해서 만들어줘"

## 실행 절차

### Step 1 — 공통 참조

1. `../../shared/api-client.md`
2. `../../shared/auth.md`

### Step 2 — 쓰기 작업이면 위험 게이트

다음은 **반드시** `../../shared/risk-gate.md` 프로토콜 적용:

- 시리즈 상태 변경 (`PATCH /series/:estimateNumber/status`)
- 최종 버전 지정 변경 (`PATCH /series/:estimateNumber/final`) — 청구 근거 교체
- 버전 삭제 (`DELETE /:id`)
- 시리즈 전체 삭제 (`DELETE /series/:estimateNumber`)
- 신규 버전 생성 (`POST /`) — 청구 가능한 공식 문서가 추가됨
- 버전 내 금액·항목 수정 (`PATCH /:id`)
- `billingClientId` 변경

### Step 3 — 엔드포인트 참조

`references/endpoints.md` 확인.

### Step 4 — 호출 + 보고

## 보고 양식

조회:
```
[견적서 A-2025-001 — DDP 에이전시]
상태: contracted (최종: v2)
v1: 공급가액 10,000,000원, VAT 1,000,000원 (2025-11-10)
v2: 공급가액 12,000,000원, VAT 1,200,000원 (2025-12-05) ← 최종
청구 클라이언트: DDP 에이전시 (자체)
```

상태 변경 완료:
```
[완료] A-2025-001 상태 pending → contracted, 최종 버전 v2 고정
```

## 관련 스킬

- **clients**: 견적 대상 고객 정보
- **projects**: 계약 후 프로젝트 생성 흐름
