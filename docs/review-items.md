# 앱 리뷰 항목 정리

`todos.md` 기반으로 정리한 개선/학습 트래킹 문서.

---

## 학습/질문 (개념 이해)

| # | 항목 | 상태 |
|---|------|------|
| 1 | API 응답 컨벤션 (정석적인 패턴) | 미완 |
| 2 | 모노레포 구조 설명 | 미완 |
| 4 | `drizzle/migrations/meta` 역할 | 미완 |
| 5 | 마이그레이션 파일명 규칙 + 정리 여부 | 완료 (→ 개선 20번) |

---

## 의견/논의

| # | 항목 | 상태 |
|---|------|------|
| 6 | 앱 전역 상수화 (세션 유효기간, 비밀번호 최소 길이 등) | 완료 (→ 개선 21번) |
| 9 | 로딩 스켈레톤이 현재 앱에 필요한가 | 완료 (→ 개선 22번) |
| 14 | searchbar 동작방식 (키입력 기반 + 전체 싱크) | 완료 (→ 개선 23번) |
| 17 | 토스트 위치 변경 (우측 상단 vs 하단 중앙) | 완료 (`top-right` 적용) |
| 18 | `features/ui` 디렉토리 위치가 FSD 관점에서 적절한가 | 미완 |

---

## 개선/수정 작업

| # | 항목 | 난이도 | 상태 |
|---|------|--------|------|
| 3 | 개발환경 종료 스크립트 추가 | 낮음 | 미완 |
| 7 | seed 파일 git 추적 제외 + 히스토리 완전 제거 | 중간 | 미완 |
| 8 | `softDeleteFilter` 미사용 코드 정리 | 낮음 | 미완 |
| 10 | 스켈레톤 최적화 (실제 UI 괴리감, atLeast 딜레이 미적용) | 완료 (→ 개선 22번) |  |
| 11 | 에러 바운더리 전반 동작 확인 | 중간 | 미완 |
| 12 | unauthorized 바운더리 미동작 수정 | 중간 | 미완 |
| 13 | 에러/404/비인가 페이지를 사이드바 레이아웃 내부에서 렌더링 | 중간 | 미완 |
| 15 | 인라인 편집·메모·입금내역 등 optimistic update 패턴 적용 | 높음 | 미완 |
| 16 | 인라인 편집 성공 시 불필요한 토스트 제거 | 낮음 | 미완 |
| 19 | 목록 API 응답 구조 통일 — 배열 직접 반환 엔드포인트(`/schedules/month`, `GET /todos`, `GET /revenue`)를 나머지 목록과 일관된 형태로 맞추기 | 낮음 | 미완 |
| 20 | 마이그레이션 스쿼시 (v1 클린 슬레이트) — 기존 7개 파일 삭제 후 `drizzle-kit generate`로 단일 `0000_initial.sql` 재생성. 7번(seed 개인정보 처리) 선행 필요. 로컬 운영환경은 백업 후 DB 초기화 + 재적용 | 중간 | 미완 |
| 21 | 상수 중앙화 — `packages/utils/src/constants.ts`에 공유 상수(`PASSWORD_MIN_LENGTH`, `DEFAULT_PAGE_SIZE`) 추출. 서버 전용 상수는 `apps/server/src/lib/constants.ts`로 분리. 클라이언트 내 `\|\| 15` 하드코딩(`clients`, `admins` 모듈)도 `APP_CONFIG` 참조로 통일 | 낮음 | 미완 |
| 22 | 스켈레톤 정리 — 모듈별 스켈레톤(`list-skeleton`, `form-skeleton`, `estimate-skeleton`, `calendar-skeleton`, 대시보드 인라인 등) 및 `atLeast` 강제 딜레이 제거. `app-layout-skeleton`과 사이드바 `nav-user` 스켈레톤은 유지하되 `atLeast` 딜레이 적용 | 중간 | 미완 |
| 23 | SearchBar 키입력 기반으로 변경 — `onChange`에 debounce(300ms) 적용해 Enter 없이 실시간 검색. `shared/ui/data-list/search-bar.tsx` 단일 변경으로 전체 적용 | 낮음 | 미완 |
