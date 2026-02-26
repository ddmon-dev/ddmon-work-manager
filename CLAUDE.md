# CLAUDE.md

외주 고객정보와 견적서 작성 및 관리를 위한 개인용 내부 시스템.
기존 Next.js 기반 시스템을 **React + Hono + Drizzle** 스택으로 마이그레이션하는 프로젝트다.
개인용 프로젝트이지만 **프로덕션 레벨 기준**으로 작업한다.

## 핵심 원칙 (우직실)

- **우아함**: 불필요한 복잡성 없이 깔끔한 구조
- **직관성**: 누가 봐도 바로 이해되는 명확한 코드
- **실용성**: 과도한 추상화보다 실제 개발과 유지보수에 도움되는 구조
- **오버엔지니어링 금지**: 컨텍스트와 상황에 맞는 적절한 수준의 개발

## 기술 스택

| 분야          | 기술                                |
| ------------- | ----------------------------------- |
| **Frontend**  | React 19 + Vite                     |
| **Backend**   | Hono                                |
| **Language**  | TypeScript (Strict Mode)            |
| **ORM**       | Drizzle ORM                         |
| **Database**  | PostgreSQL (Supabase)               |
| **CSS**       | Tailwind CSS V4                     |
| **UI**        | Shadcn UI                           |
| **Form**      | React Hook Form + Zod              |
| **Auth**      | Better Auth                         |
| **Validation**| Zod                                 |

> 정확한 버전은 각 `package.json` 참조.

## 아키텍처

모노레포 구조:

```
_react/
├── apps/
│   ├── client/       # React 19 + Vite (프론트엔드)
│   └── server/       # Hono (백엔드 API)
├── packages/
│   ├── schemas/      # Zod 스키마 (공유 검증)
│   ├── types/        # 공유 타입 정의
│   └── utils/        # 공유 유틸리티
└── docs/
    └── migration/    # 마이그레이션 문서
```

- **client**: FSD(Feature-Sliced Design) 기반 구조 유지
- **server**: Hono 라우터 기반 API
- **packages**: 클라이언트·서버 간 공유 코드

## 개발 규칙

### 코드

- **파일명**: kebab-case, 엔티티 프리픽스 제거 (폴더가 컨텍스트 제공)
- **FSD**: 클라이언트 측 Feature-Sliced Design 구조 유지
- **Path Alias**: 각 앱/패키지별 설정 참조

### 문서화

- 마이그레이션 관련 결정사항은 `docs/migration/`에 기록한다.

### Git

- 커밋 형식: `타입: 제목` (feat, fix, refactor, docs, style, test, chore)

## 문서

- **[docs/migration/](docs/migration/)** - 마이그레이션 계획 및 진행 문서
