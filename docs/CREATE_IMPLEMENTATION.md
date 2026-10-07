# Create 옵션 선택 화면

## 구현 범위

홈의 ‘대시보드 만들기’는 기존 Modal 대신 `#create` 화면을 엽니다.
GNB·Footer를 유지하는 PC 전용 Website Layout이며, 좌측 선택 카드와 우측 Sticky
설정 요약으로 구성합니다. 기준 문서는 V1 기획서 7~8절과 디자인 가이드 8~10절입니다.
CRM은 후속 사용자 결정에 따라 제외합니다.

| 옵션 | 지원값 / 기본값 |
|---|---|
| 프로젝트 이름 | 기본 ‘새 대시보드’, 최대 60자 |
| Dashboard Type | 분석 / 관리자 / 프로젝트 / 모니터링, 기본 분석 |
| Navigation | Sidebar / Top, 기본 Sidebar |
| Style | Modern / Minimal / Corporate / Dark, 기본 Modern |
| Color | Blue / Green / Purple / Neutral, 기본 Blue |
| Components | KPI / Chart / Table / Progress / Notification, 기본 KPI+Chart+Table |
| Density | Compact / Standard / Spacious, 기본 Standard |
| Main Visual | ON/OFF, 기본 OFF. Banner / Hero / Image + Text |
| Additional Request | 선택 입력, 최대 500자 |

메인 비주얼에는 높이, 제목, 설명, 이미지, Overlay, 정렬, CTA 사용 여부·이름·URL을
설정합니다. OFF로 전환해도 하위 입력값을 보존합니다. 이미지가 없을 때는 기본 영역을
사용합니다. URL은 http(s) 또는 #앵커만 허용하며 자격증명이 들어간 URL은 거부합니다.

## 미리보기 연결

‘샘플 미리보기 만들기’는 옵션을 검증한 뒤 선택한 조건을 반영한 Schema를 생성하고,
편집 UI를 숨긴 결과 Preview로 이동합니다. 이후 기존 KPI 편집·Undo·ZIP Export를 이용합니다.
각 스타일은 배경·Surface·Border·Radius·Shadow·제목 표현이 다르고, 밀도는 Gap·Padding에
반영됩니다. 선택하지 않은 컴포넌트는 결과에서 제외합니다. Progress와 Notification도
공통 Renderer 및 Export에서 표시됩니다.

AI API는 호출하지 않습니다. 추가 요청은 저장만 하며 현재 샘플 결과를 변경하지 않습니다.
화면과 CTA에서 이 제한을 안내합니다. 기본값만으로 바로 미리보기를 만들 수 있고,
이름이 비어 있거나 컴포넌트가 0개이면 생성하지 않습니다.

## 저장과 이미지

- 선택 조건은 `sebit-create-options-v1`에 버전 1 Envelope로 자동 저장합니다.
- 새로고침·Create 재진입 시 복원합니다. 홈 예시에서 특정 유형을 선택하면 그 유형을 우선합니다.
- 미완성 입력도 초안으로 저장하고, 생성 시 별도로 검증합니다.
- 손상된 초안은 자동 덮어쓰기하지 않습니다. ‘기존 데이터 백업 후 저장’으로
  `sebit-create-options-v1-recovery`에 원문을 남긴 뒤 현재 선택을 저장합니다.
- 저장 차단·용량 초과 시 실패를 표시하고 현재 선택을 유지합니다. ‘다시 저장’을 제공합니다.
- 이미지는 IndexedDB `sebit-assets-v1` / `images`에 Blob으로 저장하고 Schema에는 ID만 넣습니다.
- 이번 구현의 업로드 제한은 PNG/JPG/WebP, 최대 2MB입니다. MIME과 파일 시그니처를 검사합니다.
- 저장된 이미지가 누락되면 생성·Export를 차단하고 교체 또는 제거를 안내합니다.
- ZIP은 사용 중인 이미지를 `assets/main-visual.*`로 포함하고 HTML에서 해당 경로를 참조합니다.
- 이미지 교체·제거 시 기존 프로젝트에서 참조할 수 있으므로 이전 Blob을 자동 삭제하지 않습니다.

생성된 프로젝트의 `settings.selections`에 Create 옵션을 함께 보존합니다.
기존 프로젝트의 재편집·다운로드 흐름은 유지하고, 선택 조건 전체를 다시 변경해 현재
결과물을 대체하는 기능은 후속 작업입니다.

## 주요 코드

`sebitcanvers_v3/frontend/src/create/`:

- `contracts.ts`: 4개 유형, 기본값, Draft/생성 검증, 저장 계약.
- `buildDashboard.ts`: 옵션 → 샘플 Schema, 스타일·밀도 프리셋.
- `CreatePage.tsx`, `create.css`: 선택 카드, 요약, 필드 및 상태 UI.
- `assets.ts`: 이미지 검증 및 IndexedDB 저장·조회.

공통 `dashboard/schema.ts`, `Renderer.tsx`, `export.tsx`는 추가 컴포넌트와 메인 비주얼
속성·Asset을 지원하도록 확장했습니다. 기존 0.1 데이터의 필드는 유지하고 새 속성은
선택 필드로 추가해 기존 저장 결과도 읽을 수 있습니다.

## 검증과 남은 작업

```powershell
cd sebitcanvers_v3/frontend
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

자동 검증: 4개 유형 × 4개 스타일 × 4개 색상 × 2개 Navigation × 3개 Density(384조합),
단일 컴포넌트 구성, 입력 오류, Draft 복원·손상 보호, 메인 비주얼 설정 유지,
이미지 저장·용량·형식·누락, 실제 ZIP Asset 포함, Create → Preview → 편집 → 재열기.

DOM 통합 검증은 jsdom, 이미지 저장 검증은 fake-indexeddb를 사용합니다.
실제 브라우저의 1280/1440/1920px 시각 QA와 파일 선택·새로고침·다운로드 확인은 별도입니다.
AI 생성·수정, 전체 CMS 속성 편집, 상세 Finalize Modal은 아직 미구현입니다.
