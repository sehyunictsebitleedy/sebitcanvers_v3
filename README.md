# SEbit Canvers V3

**AI가 초안을 만들고, 사용자가 직접 완성하는 PC Dashboard Builder.**

사용자가 제작 조건을 선택하면 AI가 샘플 데이터 기반 대시보드를 생성하고,
AI 수정과 CMS Editor로 다듬은 결과를 HTML/CSS/JavaScript 소스 ZIP으로 제공합니다.
회원가입·로그인 없이 무료로 사용하는 PC 전용 제작 도구를 목표로 합니다.
실제 업무 데이터에 연결된 시스템이나 완성 템플릿 선택 서비스와는 구분합니다.

이 문서는 [AI Dashboard Builder V1 최종 기획서](AI_DASHBOARD_BUILDER_V1_PLAN.md)
v1.0(2026-09-30)의 요약입니다. 아래 기획 범위는 구현 완료를 의미하지 않으며,
현재 구현 상태는 별도로 명시합니다. 기획서 원문의 정식 서비스명은 미정입니다.

## 핵심 사용자 흐름

```text
Home → Create → Generating → Preview → AI Edit → CMS Editor → Finalize → Download ZIP
```

- Create에서 조건을 선택하고 추가 요청을 입력합니다. 기본값만으로도 생성할 수 있어야 합니다.
- Preview에서 결과를 확인합니다. AI 수정과 CMS 편집은 선택이며 바로 확정할 수도 있습니다.
- AI Edit는 자연어 요청을 검증된 Patch로 반영하고 변경 요약과 Undo를 제공합니다.
- CMS Editor는 Component Tree / Canvas / Property Panel 구조로 직접 편집합니다.
- Finalize에서 구조·데이터·이미지를 검증한 후 다운로드를 허용합니다.
- 확정 이후 다시 편집하면 재확정이 필요하며, 실패 시 마지막 정상 작업을 보존합니다.

## Home 기획 요약

| 영역 | 기획 기준 |
|---|---|
| 목적 | 서비스 역할과 결과물을 이해하고 한 번의 CTA 클릭으로 Create 진입 |
| GNB | Logo → 사용방법 → 대시보드 만들기 → SEbit 순서 고정 |
| Hero | 핵심 설명과 ‘대시보드 만들기’ 중심 CTA, 실제 결과 예시 |
| 사용방법 | 조건 선택 → AI 생성 → 수정 및 편집 → 다운로드 안내 |
| 최근 작업 | 브라우저에 저장된 프로젝트명·수정 시각 표시 및 상태별 복원. 없으면 영역 숨김 |
| Footer | 이용약관 / 개인정보처리방침 / 서비스 안내 / SEbit / Copyright |
| 레이아웃 | 일반 페이지 스크롤, 기준 폭 1440px, 최소 지원 폭 1280px |

SEbit은 GNB 마지막 메뉴이며 `http://sebit.co.kr`로 새 창 이동합니다.
링크에는 `target="_blank"`와 `rel="noopener noreferrer"`를 적용합니다.
이 메뉴 규칙은 Builder 서비스용이며 생성된 대시보드에 강제로 삽입하지 않습니다.

## V1 필수 기능

| 구분 | 범위 |
|---|---|
| 제작 대상 | 샘플 데이터 기반 단일 PC 대시보드 |
| 유형 | Analytics / Admin / Project / Monitoring (후속 사용자 결정으로 CRM 제외) |
| Create 입력 | Dashboard Type, Navigation, Style, Color, Components, Density, Main Visual, Additional Request |
| 스타일 | Modern / Minimal / Corporate / Dark |
| Navigation | Sidebar / Top Navigation |
| Main Visual | 최대 1개, ON/OFF 및 Banner / Hero / Image + Text, 이미지·텍스트·CTA 편집 |
| AI | Generate / Edit / Repair, 검증한 구조화 데이터만 적용 |
| 편집 | CMS 속성·데이터 편집, 기본 Component Library, 최소 1단계 Undo |
| 차트 | Line / Bar / Area / Donut |
| 저장 | Local Storage 자동 저장, 최근 작업 및 상태별 복원, 저장 실패 안내 |
| 결과물 | HTML / CSS / Vanilla JS / Schema JSON / README / 사용 Asset을 포함한 ZIP |
| 운영·보안 | 서버 Rate Limit, 사용량·오류 기록, 점검 모드, 입력 검증, API Key 보호 |

생성·Preview·편집·Undo·확정·Export는 동일한 **Dashboard Schema**를 기준으로 합니다.
AI의 임의 HTML/JS를 실행하지 않고, 검증된 컴포넌트와 12열 Grid로 렌더링합니다.
AI 실패나 잘못된 CMS 입력은 기존 정상 Schema를 덮어쓰지 않습니다.

다운로드한 ZIP은 압축 해제 후 `index.html`을 PC 브라우저에서 직접 열어 실행해야 하며,
React 런타임이나 npm 빌드가 필요하지 않아야 합니다. 외부 CDN을 사용하면 인터넷이
필요할 수 있으므로 V1에서 오프라인 실행을 보장하지 않습니다.

작업은 현재 브라우저에 저장됩니다. 브라우저 데이터를 지우거나 다른 기기·브라우저로
이동하면 기존 작업을 복구할 수 없습니다. 최근 작업 보관 수, 이미지 보존 방식,
AI 제공업체·모델·호출 한도 등 미확정 운영값은 구현 단계에서 결정합니다.

## 제외 범위와 후속 확장

- V1 제외: 모바일·태블릿·반응형 제작 및 기기 Preview, 계정·서버 프로젝트 저장,
  실제 DB/API 데이터 연동, 팀 협업, 결제, 생성 사이트 호스팅·도메인 연결.
- V1 제외: React/Vue 등 프레임워크 Export, GitHub 자동 Push, Figma Export,
  AI 이미지 생성, 자유 픽셀 배치, HTML/CSS 직접 편집.
- 선택 후순위: Drag & Drop, Redo, Canvas Zoom, 고급 Table 기능.
- V2 방향: 회원 기반 프로젝트 관리, 일반 홈페이지·다중 페이지 생성, 유료 요금제.
  배포·협업·실제 데이터 연동 등은 별도 검토 후보입니다.

## 기술 방향과 개발 순서

프론트엔드는 React + TypeScript + Vite, 백엔드는 Node.js + TypeScript를 기준으로 합니다.
Schema 및 Validation을 공유하고 AI Provider Adapter로 제공업체 의존성을 분리합니다.
React Router, 경량 Store, Zod, Chart.js, 클라이언트 ZIP 라이브러리 등은 기획상의
권장·선정 방향이며 현재 설치 완료 목록을 뜻하지 않습니다.

1. 공통 UI·Routing·Store 및 Schema/Validation 기반 구성.
2. Component Library와 Renderer로 샘플 Schema 렌더링.
3. 스타일·Density, CMS 편집, Undo·자동 저장·최근 작업 복원.
4. Backend AI 생성·Repair 및 AI Edit/Patch 연결.
5. Preview·Finalize·Export 완성, Home/Create 마감.
6. 운영·보안 및 QA → Alpha → Beta → Public V1.

첫 수직 구현 목표는 **Sample Schema → Renderer → CMS 수정 → HTML/CSS/JS 다운로드**입니다.
최소 Export를 먼저 검증하고 AI를 연결합니다. 전체 필수 기능과 대표 E2E 흐름이
통과해야 V1 완료로 간주합니다. PC 1280/1366/1440/1920px의 Chrome·Edge에서
주요 화면, 실패 복구, 접근성 및 Preview와 다운로드 결과의 일치를 확인합니다.

## 현재 구현 상태와 문서 차이

후속 사용자 결정에 따라 홈 예시와 모든 유형 선택 UI는 분석·관리자·프로젝트·모니터링
4개로 운영합니다. 원본 기획서의 CRM 항목은 현재 지원 범위에서 제외합니다.
기존 CRM 로컬 데이터는 삭제하지 않고 최근 작업에서 숨깁니다.

Home UI와 공통 Schema/Renderer를 연결했습니다. 샘플 JSON 검증, KPI·4종 차트·Table 표시,
KPI 제목·값·단위 편집, 1단계 Undo, Schema 저장·복원, 편집 UI 없는 Preview,
검증 후 최소 HTML/CSS/JS ZIP 다운로드를 지원합니다.

AI 생성·수정, 전체 Create 옵션, 전체 CMS, 이미지 Asset 및 완전한 Finalize 화면은
아직 구현하지 않았습니다. [엔진 구현 문서](docs/DASHBOARD_ENGINE.md)와
[Home 구현 문서](docs/HOME_IMPLEMENTATION.md)를 참고하세요.

| 항목 | 기획서 기준 | 현재 디자인 가이드 또는 구현 |
|---|---|---|
| 서비스 테마 | Light + Minimal + Professional + Blue Accent | 사용자가 지정한 디자인 가이드·시안을 따라 Dark Premium SaaS 적용 |
| 만들기 CTA | Create 화면으로 진입 | 이름·유형 선택 Modal → 샘플 KPI 편집 화면 |
| 최근 작업 없음 | 영역 숨김 | 빈 상태와 새 프로젝트 버튼 표시 |
| 최근 작업 복원 | 조건·Schema·상태에 따라 편집 흐름 복원 | 저장된 Schema를 편집 화면으로 복원. 기존 초안은 샘플로 초기화 |
| 보관 수 | 5~10개는 제안, 최종 정책 미정 | 자동 개수 제한·삭제 없음. 브라우저 용량 초과 시 오류 안내 |
| 최소 Export | 최종 Library·Asset까지 동일 결과 출력 | KPI·SVG 차트·Table 및 텍스트 Main Visual, 검증 Snapshot ZIP |
| Footer | 약관·개인정보처리방침·서비스 안내 등 | 브랜드·사용방법·SEbit·Copyright 구현, 정책 링크 미구현 |

기획서 요약과 기존 디자인 결정을 구분하기 위해 차이를 기록했습니다.
서비스의 다크 디자인 기준은 유지하며, 현재 엔진 계약은 전체 V1 이전의 `0.1`입니다.

## 저장소 구조와 실행

현재 실제 Vite 앱은 루트의 `frontend/`가 아니라 **`sebitcanvers_v3/frontend/`**에 있습니다.

```text
./
├─ README.md
├─ AI_DASHBOARD_BUILDER_V1_PLAN.md
├─ frontend/                         # 예정된 최상위 프론트엔드 위치
├─ backend/
├─ docs/
│  ├─ HOME_IMPLEMENTATION.md
│  └─ design/
│     ├─ DESIGN_GUIDE.md
│     └─ design_b.png
└─ sebitcanvers_v3/
   └─ frontend/                      # 현재 실행하는 Vite 앱
```

프로젝트 루트에서 실행합니다. PowerShell 스크립트 실행 정책의 영향을 피하도록
Windows 명령은 `npm.cmd`로 표기합니다.

```powershell
cd sebitcanvers_v3/frontend
npm.cmd install
npm.cmd run dev
```

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

## 참고 문서

- [V1 최종 기획서](AI_DASHBOARD_BUILDER_V1_PLAN.md): 기능·상태·운영·QA 상세 기준
- [디자인 가이드](docs/design/DESIGN_GUIDE.md): 현재 홈의 디자인 기준
- [기준 시안](docs/design/design_b.png): Home / Create / CMS 화면 참고
- [Home 구현 기록](docs/HOME_IMPLEMENTATION.md): 현재 동작 및 미구현 범위
- [Dashboard 엔진 구현](docs/DASHBOARD_ENGINE.md): Schema 계약, 편집·저장·Export 및 테스트
