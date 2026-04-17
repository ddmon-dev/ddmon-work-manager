# Clients 엔드포인트

Base URL은 `../../shared/api-client.md` 참조.

## 목록 조회

`GET /api/clients?page=<n>&pageSize=<n>&search=<q>`

- 쿼리 파라미터 모두 선택. 기본 `page=1&pageSize=20`.
- 검색 대상 필드: `companyName`, `contactName`, `email`.

응답 `data` 형태:
```json
{
  "items": [
    {
      "id": "cli_xxx",
      "companyName": "DDP 에이전시",
      "contactName": "홍길동",
      "phone": "010-1234-5678",
      "email": "foo@bar.com",
      "address": "서울시 ...",
      "createdAt": "2025-11-12T...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 42 }
}
```

## 단건 상세

`GET /api/clients/:id`

응답 `data` 에 고객 본 정보 + `memos` 배열(각 메모: `id`, `content`, `author`, `createdAt`).

## 생성

`POST /api/clients`

요청 body (`clientWriteSchema`):
```json
{
  "companyName": "필수",
  "contactName": "선택",
  "phone": "선택",
  "email": "선택 (이메일 형식)",
  "address": "선택"
}
```

응답: 생성된 클라이언트 객체 (201).

## 수정

`PATCH /api/clients/:id`

요청 body: `clientWriteSchema.partial()` — 바꿀 필드만 포함.

## 삭제 (소프트)

`DELETE /api/clients/:id`

- **위험 작업**. 반드시 `shared/risk-gate.md` 프로토콜.
- 활성 프로젝트/견적서가 하나라도 있으면 400 `HAS_REFERENCES` 반환. 스킬은 이 경우 주인님께 "참조 존재로 삭제 불가"를 명확히 전달.

## 메모 관련

- `POST /api/clients/:id/memos` — 메모 추가 (body: `{ "content": "텍스트" }`)
- `PATCH /api/clients/memos/:memoId` — 메모 수정
- `DELETE /api/clients/memos/:memoId` — 메모 소프트 삭제
