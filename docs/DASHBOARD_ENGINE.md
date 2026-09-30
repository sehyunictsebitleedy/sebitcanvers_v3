# Dashboard 엔진 1차 구현

## 완료 목표

`Sample JSON → Validation → Renderer → KPI 편집 → 검증 → HTML/CSS/JS ZIP`

기획서의 첫 수직 구현을 검증하는 최소 엔진입니다. 전체 V1 Schema나 CMS가
완성된 단계는 아닙니다. 기존 홈의 하드코딩 대시보드를 공통 Renderer로 교체했습니다.

## 사용 방법

1. 홈에서 **대시보드 만들기**를 누릅니다.
2. 프로젝트 이름과 유형을 선택하고 **샘플 편집 시작**을 누릅니다.
3. 왼쪽 목록이나 캔버스에서 KPI를 선택합니다.
4. 오른쪽에서 제목·값·단위를 변경하고 **변경 적용**을 누릅니다.
5. **실행 취소**로 직전 정상 상태를 한 번 복원할 수 있습니다.
6. **미리보기**에서 편집 패널과 선택 표시를 숨깁니다.
7. **검증 후 ZIP 다운로드**로 현재 상태를 검증·확정하고 ZIP을 생성합니다.
8. 압축을 풀어 `index.html`을 엽니다. 최근 작업을 열면 저장된 Schema를 복원합니다.

AI 호출 없이 검증된 샘플로 시작합니다. 차트·테이블은 현재 표시만 지원하며,
일반 Create 옵션 화면과 전체 Property Editor는 다음 단계입니다.

## 모듈

실행 프로젝트: `sebitcanvers_v3/frontend/`.

| 경로 (`src/dashboard/` 기준) | 역할 |
|---|---|
| `schema.ts` | Zod 런타임 검증, TypeScript 타입, 불변 KPI 수정 함수 |
| `sample.json` | 분석 대시보드의 실제 입력 JSON |
| `samples.ts` | 공통 샘플을 바탕으로 5개 유형 생성 및 검증 |
| `Renderer.tsx` | Schema 기반 KPI, Line/Bar/Area/Donut, Table 렌더링 |
| `renderer.css` | 서비스 UI와 분리된 결과물 스타일; Export에서도 동일 파일 사용 |
| `Preview.tsx` | 홈·유형 카드·확대 창에서 같은 Renderer를 축소 표시 |
| `Workspace.tsx` | KPI 선택·편집, Undo, Preview, 저장 및 다운로드 흐름 |
| `storage.ts` | 검증된 Schema 저장·복원 |
| `export.tsx` | 동일 Renderer의 정적 HTML 직렬화 및 ZIP 생성 |

편집 화면과 ZIP 생성 모듈은 지연 로딩합니다. 백엔드에서 Schema를 공유할 때
검증 모듈을 공통 패키지로 이동할 수 있도록 React 의존성을 분리했습니다.

## Schema 0.1 계약

필수 영역: `schemaVersion`, `project`, `status`, `theme`, `layout`,
`navigation`, `header`, `mainVisual`, `sections`, `settings`.

- 버전은 `0.1`. 미지원 버전·컴포넌트·추가 필드는 거부합니다.
- 샘플 데이터 전용, 디자인 폭 및 최소 폭 1280px, 12열 Grid입니다.
- Section·Component 배열 순서가 표시 순서이며 `visible`로 표시 여부를 정합니다.
- Project·Navigation·Section·Component ID는 전체 문서에서 고유해야 합니다.
- KPI: 제목, 유한 숫자 값, 단위, 증감률.
- Chart: 4종, 최대 24개 라벨·4개 데이터셋. 라벨·데이터 길이가 일치해야 합니다.
- Donut: 단일 데이터셋, 음수 금지, 합계는 0보다 커야 합니다.
- Table: 고유한 컬럼 key, 행 구조 일치. 빈 행 배열은 Empty State로 표시합니다.
- Navigation: Sidebar/Top. 단일 화면의 메뉴 표현이며 페이지 전환은 없습니다.
- Main Visual: 텍스트 Banner/Hero 표시만 지원합니다. 이미지·CTA·Image + Text는 후속 범위입니다.
- Theme: HEX 색상, Radius, Grid Gap. Style/Density 프리셋은 아직 포함하지 않습니다.

실패한 검증 결과는 기존 Schema를 대체하지 않습니다. 편집은 적용 버튼으로
확정하며, 유효한 변경 직후 브라우저 저장을 시도합니다. 잘못된 숫자나 빈 제목은
입력 오류로 안내하고 마지막 정상 값을 유지합니다.

## 저장과 복구

- 기존 프로젝트 목록 키: `sebit-canvers-drafts-v1`.
- 새 Schema 키: `sebit-dashboard-schema-v01:<projectId>`.
- 이름·유형만 있던 기존 초안은 처음 열 때 해당 샘플 Schema로 시작합니다.
- Schema가 있으면 검증 후 복원합니다. 손상된 데이터를 샘플로 조용히 덮어쓰지 않습니다.
- 저장 성공 이후에만 성공 상태를 표시합니다. 저장 실패 시 메모리 작업을 유지하고
  다시 저장하거나 ZIP을 내려받을 수 있습니다. 저장 실패 상태로 홈에 나갈 때 확인합니다.
- 목록을 임의로 잘라 오래된 프로젝트를 자동 삭제하던 동작을 제거했습니다.
- Undo는 현재 편집 세션의 최소 1단계입니다. 재진입 시 Undo 이력은 복원하지 않습니다.
- 이미지 영속 저장, Schema 버전 마이그레이션, 전체 Create 조건과 상태별 화면 복원은 후속 범위입니다.

## 최소 Export

```text
dashboard.zip
├─ index.html
├─ css/style.css
├─ js/dashboard.js
├─ data/dashboard.json
└─ README.md
```

검증한 Snapshot을 `finalized`로 고정한 후 ZIP을 만듭니다. 편집 선택 표시와
Property UI는 포함하지 않습니다. 다운로드 전달 후 `exported`로 표시하며,
디스크 저장 완료를 보장하는 상태는 아닙니다. 이후 변경은 `editing`으로 돌아갑니다.

현재 4종 차트는 외부 라이브러리 없이 SVG로 렌더링합니다. 기획서의 Chart.js 우선
방향과 별개로 최소 Export의 직접 실행과 화면 일치를 검증하기 위한 구현입니다.
이 최소 결과물은 React·npm·로컬 서버·CDN 없이 실행됩니다. 이미지와 외부 Asset을
지원할 후속 Export 전체에 오프라인 실행을 보장하는 의미는 아닙니다.

내용·SVG 차트는 `index.html`, 스타일은 `css/style.css`에 있습니다.
`dashboard.json`은 최종 Schema 보관용이며 JSON만 수정하면 화면이 갱신되지는 않습니다.
`dashboard.js`는 인쇄 버튼만 연결합니다. 임의 코드·원격 데이터·AI Key를 포함하지 않습니다.

## 검증

```powershell
cd sebitcanvers_v3/frontend
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

테스트는 Schema 정상·오류 사례, KPI 수정의 불변성, 4종 차트, 빈 Table,
텍스트 escape, 확정 전 Export 차단, ZIP 파일과 Snapshot 일치, 저장 오류,
DOM 환경의 KPI 편집·Undo·Preview·홈에서 시작 및 최근 작업 재진입을 검증합니다.

DOM 통합 테스트는 jsdom을 사용합니다. 실제 Chrome/Edge 화면 비교, 키보드·스크롤
시각 QA, 브라우저 ZIP 다운로드 및 압축 해제 후 육안 검증은 별도 확인이 필요합니다.
