# Work Manager API 호출 규약

work-manager 플러그인의 모든 스킬은 Hono REST API를 직접 호출해 데이터를 얻는다. 이 문서는 호출 패턴, base URL, 응답 포맷을 정의한다.

## Base URL

**현재 타깃:** `http://localhost:8001` (개발 서버)

> **중요**: 이 줄이 유일한 타깃 전환점이다. 최종 운영 전환 시 `http://localhost:7070` 으로 변경 후 커밋. 다른 스킬 파일에 base URL을 하드코딩하지 말고 항상 이 문서를 참조해 사용할 것.

## 인증 헤더

모든 요청에 아래 헤더를 포함한다:

```
X-Skill-Key: <SKILL_API_KEY>
Content-Type: application/json  (POST/PATCH/PUT 시)
```

`SKILL_API_KEY` 값은 `shared/auth.md` 참조.

## 호출 방식

Claude Code 안에서는 **Bash 도구로 curl 실행** 이 가장 간단하다 (별도 fetch 래퍼 없이):

```bash
curl -sS -H "X-Skill-Key: $SKILL_API_KEY" \
  "http://localhost:8001/api/clients?page=1&pageSize=20"
```

POST/PATCH 예:

```bash
curl -sS -X PATCH \
  -H "X-Skill-Key: $SKILL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}' \
  "http://localhost:8001/api/estimates/series/A-2025-001/status"
```

- `-sS` 플래그: 진행 로그는 숨기되 에러는 표시
- 환경변수 `SKILL_API_KEY` 를 쓰고 직접 키 값을 타이핑/출력하지 않는다

## 응답 포맷

**성공:**
```json
{ "success": true, "data": ... }
```

**실패:**
```json
{ "success": false, "error": "<CODE>", "message": "<사람 읽기 좋은 설명>" }
```

스킬은 응답을 **반드시 JSON 파싱**해 `success` 필드를 먼저 확인한다. 실패면 사용자에게 `error` + `message` 를 그대로 전달.

## 페이지네이션 쿼리

목록 엔드포인트 대부분이 지원:

- `page` (기본 1)
- `pageSize` (기본 20)
- `search` (텍스트 검색)

응답 shape 예시(clients 목록):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": { "page": 1, "pageSize": 20, "total": 42 }
  }
}
```

## 에러 처리 원칙

- 4xx/5xx 응답도 JSON body를 담고 있다. `curl -sS` 로 body는 확보 가능.
- 401 나오면 (1) 서버가 꺼졌거나, (2) `SKILL_API_KEY` 미설정/불일치, (3) 타깃 환경 불일치(개발키로 운영 호출 등)를 의심. 스킬은 이 세 가지를 주인님께 먼저 안내.
- 5xx는 서버 로그(`npm run dev:server` 터미널) 확인 권유.
