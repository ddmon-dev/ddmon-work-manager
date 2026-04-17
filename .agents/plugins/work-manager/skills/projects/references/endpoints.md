# Projects 엔드포인트

Base URL은 `../../shared/api-client.md` 참조.

## 목록 조회

`GET /api/projects?page=<n>&pageSize=<n>&search=<q>`

응답 `data`:
```json
{
  "items": [
    {
      "id": "proj_xxx",
      "projectNumber": "P-2025-003",
      "title": "DDP 리뉴얼",
      "status": "in_progress",
      "contractAmount": 12000000,
      "taxType": "vat",
      "clientId": "cli_xxx",
      "billingClientId": null,
      "startDate": "2025-11-15",
      "endDate": "2026-01-31",
      "paymentsSum": 5500000,
      ...
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 12 }
}
```

## 단건 상세

`GET /api/projects/:id`

전체 정보 + `collections[]`, `invoices[]`, `partners[]`, `partnerPayments[]`, `expenses[]`, `memos[]` 포함.

## 생성

`POST /api/projects`

요청 body (`projectWriteSchema`): 기본 프로젝트 정보 + `contractAmount`, `taxType`, `clientId` 필수.

## 수정 (위험 — 금액·세금 포함 시)

`PATCH /api/projects/:id`

요청 body: `projectWriteSchema.partial()`.

## 상태 변경 (위험)

`PATCH /api/projects/:id/status`

```json
{ "status": "pending" | "in_progress" | "completed" | "on_hold" | "cancelled" }
```

## 삭제 (위험)

`DELETE /api/projects/:id` — 소프트 삭제.

## 순서 재배치

`PUT /api/projects/reorder` — Reorder 프로토콜 준수. 일반적으로 스킬이 호출할 일은 드묾.

---

## 수금 (Collections) — 위험

- `POST /api/projects/:id/collections` — 수금 차수 기록
- `PATCH /api/projects/collections/:collectionId` — 기록 수정
- `DELETE /api/projects/collections/:collectionId` — 소프트 삭제

body 예:
```json
{ "round": 1, "amount": 5500000, "collectedAt": "2025-12-10", "memo": "1차" }
```

## 세금계산서 (Invoices)

- `POST /api/projects/:id/invoices`
- `PATCH /api/projects/invoices/:invoiceId`
- `DELETE /api/projects/invoices/:invoiceId`

## 파트너 배치 (Partners) — 위험

- `GET /api/projects/:id/partners` — 배치 목록
- `POST /api/projects/:id/partners` — 파트너 배치 (`projectPartnerWriteSchema`)
- `PATCH /api/projects/partners/:partnerId` — 배치 금액/메모 수정
- `DELETE /api/projects/partners/:partnerId` — 배치 해제

## 파트너 지급 (Partner Payments) — 위험

- `POST /api/projects/:id/partner-payments`
- `PATCH /api/projects/partner-payments/:paymentId`
- `DELETE /api/projects/partner-payments/:paymentId`

## 비용 (Expenses) — 위험

- `POST /api/projects/:id/expenses`
- `PATCH /api/projects/expenses/:expenseId`
- `DELETE /api/projects/expenses/:expenseId`

## 메모 (게이트 불필요)

- `POST /api/projects/:id/memos` — body: `{ "content": "..." }`
- `PATCH /api/projects/memos/:memoId`
- `DELETE /api/projects/memos/:memoId`
