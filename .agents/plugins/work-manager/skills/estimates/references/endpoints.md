# Estimates 엔드포인트

Base URL은 `../../shared/api-client.md` 참조.

## 목록 조회 (시리즈 대표 버전)

`GET /api/estimates?page=<n>&pageSize=<n>&search=<q>&status=<s>`

- `status`: `pending` / `contracted` / `expired` 필터링.
- 검색 대상: 견적번호, 제목, 고객 회사명, 청구 클라이언트 회사명.
- 응답은 시리즈당 1개 대표 버전(최종 버전 우선, 없으면 최신 version).

응답 `data`:
```json
{
  "items": [
    {
      "id": "est_xxx",
      "estimateNumber": "A-2025-001",
      "title": "DDP 리뉴얼 견적",
      "taxType": "vat",
      "totalAmount": 12000000,
      "version": 2,
      "seriesStatus": "contracted",
      "finalEstimateId": "est_xxx",
      "clientCompanyName": "DDP 에이전시",
      "billingClientCompanyName": null,
      ...
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

## 시리즈 버전 목록

`GET /api/estimates/series/:estimateNumber/versions`

해당 견적번호의 모든 버전(삭제 제외) + 시리즈 상태·최종 버전 ID.

## 단일 버전 상세

`GET /api/estimates/:id`

본 버전의 품목 그룹(`estimateItemGroups`) + 품목(`estimateItems`) 포함한 전체 구조.

## 시리즈 상태 변경 (위험)

`PATCH /api/estimates/series/:estimateNumber/status`

```json
{
  "status": "pending" | "contracted" | "expired",
  "finalEstimateId": "est_xxx"   // status=contracted 시 필수, 외엔 자동 null
}
```

**주의:**
- `contracted` 로 전환 시 `finalEstimateId` 필수.
- 이미 `contracted` + 연결된 프로젝트 있으면 다른 상태로 변경 불가 (400).

## 최종 버전 지정 변경 (위험)

`PATCH /api/estimates/series/:estimateNumber/final`

```json
{ "finalEstimateId": "est_xxx" | null }
```

## 신규 버전 생성 (위험)

`POST /api/estimates`

요청 body (`estimateWriteSchema`): 견적 정보 + `groups[].items[]` 구조. 복잡하므로 주인님이 직접 값을 지정하지 않은 경우 스킬이 생성을 주도하지 말 것. 필요 시 주인님께 입력값을 한 단계씩 확인.

## 버전 내 수정 (위험)

`PATCH /api/estimates/:id`

버전 메타 + 품목 전체 교체 형태.

## 삭제 (위험)

- `DELETE /api/estimates/:id` — 개별 버전 소프트 삭제
- `DELETE /api/estimates/series/:estimateNumber` — 시리즈 전체 삭제

## 보조 엔드포인트

- `GET /api/estimates/available` — 프로젝트 연결 가능한 견적서 목록
- `GET /api/estimates/series/:estimateNumber/project-info` — 프로젝트 자동 생성용 정보
