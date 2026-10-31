# SEbit Canvers V3

**AI가 초안을 만들고, 사용자가 직접 완성하는 PC Dashboard Builder.**

사용자가 제작 조건을 선택하면 AI가 샘플 데이터 기반 대시보드를 생성하고,
AI 수정과 CMS Editor로 다듬은 결과를 HTML/CSS/JavaScript 소스 ZIP으로 제공합니다.
회원가입·로그인 없이 무료로 사용하는 PC 전용 제작 도구를 목표로 합니다.
실제 업무 데이터에 연결된 시스템이나 완성 템플릿 선택 서비스와는 구분합니다.

이 문서는 [AI Dashboard Builder V1 최종 기획서](AI_DASHBOARD_BUILDER_V1_PLAN.md)
v1.0(2026-09-30)의 요약입니다. 아래 기획 범위는 구현 완료를 의미하지 않으며,
현재 구현 상태는 별도로 명시합니다. 기획서 원문의 정식 서비스명은 미정입니다.

## 현재 상태와 다음 작업

- CRM을 제외한 분석·관리자·프로젝트·모니터링 4개 유형을 지원합니다.
- AI 생성·수정, 9개 데이터 컴포넌트의 CMS 편집, 미리보기·확정·ZIP 다운로드와 로컬 저장·복구를 구현했습니다.
- 최근 완료 기능은 KPI 개별 색상·아이콘 편집과 메인 비주얼 OFF 설정 보존입니다.
- 다음 작업은 **CMS 높이 프리셋·속성 그룹 구분·필드별 오류 안내·Tree 표시/숨김 직접 조작**입니다. [CMS 기획 대조표](docs/CMS_AUDIT.md)에 종료 조건을 정리했습니다.
- 날짜별 변경 내용·검증 결과·브랜치 이력은 **[작업 내역](docs/WORK_LOG.md)**에서 확인하세요. 앞으로 상세 작업 기록은 해당 파일에만 추가합니다.
- 공개 V1 전체 완료는 아직 아니며, 서비스 정책·실제 운영 환경·통합 QA 검수가 남아 있습니다.

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

## 공개 V1 작업 묶음별 상태

기존 6개 묶음의 진행 상태를 유지하는 표입니다. AI 대기 UX의 기본 검수는 끝났으며 아래 6개가 모두 미착수라는 뜻은 아닙니다. 현재 CMS 종료 조건은 [대조표](docs/CMS_AUDIT.md)로 관리합니다. CRM은 계속 제외합니다.

| 순서 | 작업 묶음 | 남은 내용 및 완료 기준 |
|---|---|---|
| 1 | Library·CMS 세부 기능 보완 (대조 완료·보완 중) | KPI 색상·아이콘까지 구현. 높이 프리셋, 속성 그룹, 필드별 오류 연결, Tree 직접 표시/숨김이 남음. 상세 종료 조건은 CMS 대조표 참조 |
| 2 | 프로젝트 관리·저장 복구 (기본 보호 구현) | 초기화·삭제·이미지 정리·편집 잠금·손상 원문 보존 및 백업 복구·버전/권한/용량 오류 구분 완료. 목록 자체 손상 시 재탐색, 파일 가져오기·향후 버전 마이그레이션, 운영 보관 정책과 통합 복구 QA 남음 |
| 3 | AI 대기 UX·품질 검수 (기본 검수 완료) | 생성·재생성·수정의 대기·취소·오류 안내 완료. 새 컴포넌트 4종과 선택 차트의 실제 수정·데이터 보존 2개 사례 통과. 더 넓은 요청 조합과 실제 브라우저 API 왕복 품질은 통합 QA에서 추가 검수 |
| 4 | 공개 운영·비용 제한 (단일 서버 설정 준비 완료) | 일일 한도·실패 차감 제외·SQLite·잔여 사용량·토큰/오류 기록·신뢰 프록시·운영 문서 완료. 실제 HTTPS 서버 적용과 접근 보호 확인은 배포 QA에서 수행. 다중 서버 전역 제한·비용 통계 화면은 후속 확장 |
| 5 | 이용 안내·정책 확정 | 실제 운영 방식에 맞춘 이용약관·개인정보·로컬 저장·AI 결과 이용 안내와 라이선스 표시, Footer 연결. 정책과 보관 기간은 서비스 운영자가 최종 확정 |
| 6 | 통합 QA·배포 | 4개 유형과 스타일·이미지·신규 컴포넌트 조합, Chrome/Edge·해상도·접근성, 압축 해제한 ZIP의 직접 실행·Preview 일치, 배포 설정·모니터링·롤백 및 제한된 Beta 검증 |

1~3은 제작 기능 완성, 4~6은 무료 공개 서비스 출시 준비에 해당합니다. 전체 필수 완료 기준을 통과하기 전에는 V1 전체 완료로 표시하지 않습니다.

## 저장소 구조와 실행

현재 실제 Vite 앱은 루트의 `frontend/`가 아니라 **`sebitcanvers_v3/frontend/`**에 있습니다.

```text
./
├─ README.md
├─ AI_DASHBOARD_BUILDER_V1_PLAN.md
├─ frontend/                         # 예정된 최상위 프론트엔드 위치
├─ backend/
├─ docs/
│  ├─ WORK_LOG.md
│  ├─ CMS_AUDIT.md
│  ├─ HOME_IMPLEMENTATION.md
│  ├─ CREATE_IMPLEMENTATION.md
│  ├─ GENERATION_CMS_FINALIZE.md
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
npm.cmd run test:e2e
```

## 참고 문서

- [작업 내역](docs/WORK_LOG.md): 날짜별 구현·검증·브랜치 기록
- [CMS 기획 대조표](docs/CMS_AUDIT.md): CMS 구현 현황과 남은 보완 항목

- [V1 최종 기획서](AI_DASHBOARD_BUILDER_V1_PLAN.md): 기능·상태·운영·QA 상세 기준
- [디자인 가이드](docs/design/DESIGN_GUIDE.md): 현재 홈의 디자인 기준
- [기준 시안](docs/design/design_b.png): Home / Create / CMS 화면 참고
- [Home 구현 기록](docs/HOME_IMPLEMENTATION.md): 현재 동작 및 미구현 범위
- [Dashboard 엔진 구현](docs/DASHBOARD_ENGINE.md): Schema 계약, 편집·저장·Export 및 테스트
- [Create 화면 구현](docs/CREATE_IMPLEMENTATION.md): 옵션, 요약, 저장·복원, 이미지 및 샘플 연결
- [AI 생성·CMS·Finalize](docs/GENERATION_CMS_FINALIZE.md): 백엔드 환경변수·실행, 편집·확정·다운로드와 검수
- [AI 수정 구현](docs/AI_EDIT_IMPLEMENTATION.md): Patch 계약, 수정 패널·요약·Undo, 실제 AI 검수 재개 방법
