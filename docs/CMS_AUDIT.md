# CMS 기획 대조표

검토일: 2026-10-31. 기준: 루트 `AI_DASHBOARD_BUILDER_V1_PLAN.md` 8·11·12절 및 `docs/design/DESIGN_GUIDE.md` 15·16절.
CRM 제외와 4개 유형 운영은 사용자의 후속 결정을 우선한다. 이 표의 ‘구현’은 코드와 명시한 검사 범위이며 공개 V1 전체 완료를 의미하지 않는다.

| 항목 | 현재 구현 및 근거 | 판정 |
|---|---|---|
| KPI | 제목·값·단위·증감·너비, 이번에 개별 색상·아이콘 추가. `ComponentForm`, `schema`, `Renderer`, `kpiStyle` 검사 | 구현 |
| Chart | line/bar/area/donut, 데이터 Grid, 색상·범례·너비. `chartLegend` 및 `builder` 검사 | 구현 |
| Table | 컬럼명·행 데이터·표시, 행 추가/마지막 행 삭제. `builder` 검사. 검색·정렬·페이지 구분은 선택 범위 | 기본 구현 |
| Progress / Notification | 값·최대값 / 문구·상태, 제목·표시·너비. `editing` 및 `builder` 검사 | 구현 |
| Summary / Activity / Button / Status Badge | 추가·속성 편집·삭제·Undo·공용 Renderer/Export. 각 이름의 기존 단위/브라우저 검사 파일 | 구현, 이번 브라우저 재검사 대상은 아님 |
| Navigation / Header | 메뉴명·아이콘·순서·표시·위치 / 제목·설명·고정 기준일 표시. `NavigationEditor`, `GlobalForm`, 기존 `navigation`, `headerDate` 검사 | 구현 |
| Main Visual | 사용 여부·유형·높이·제목·설명·이미지·CTA·Overlay·정렬. OFF 시 세부 설정 비활성화 및 값 보존 추가 | 구현 |
| 테마 | 강조·배경·카드·글자·보조글자·테두리 색상. 입력 후 검증해 적용 | 구현 |
| 너비·순서 | 공통 3/4/6/8/12열, 기존 다른 폭도 유지. 같은 섹션 내 위/아래 이동. 섹션 간 이동은 AI Patch만 지원 | 기본 구현 |
| 컴포넌트 높이 | Main Visual만 높이 프리셋 보유. 일반 카드/차트의 허용 높이 선택은 없음 | 보완 필요 |
| Property Panel 구성 | 컴포넌트별 폼은 있으나 Content/Style/Layout/Data/Visibility 그룹 구분이 없음 | 보완 필요 |
| 입력 오류 | 잘못된 입력은 정상 Schema에 미반영. 오류는 폼 하단에 합산하며 필드별 연결·한국어 안내 개선 필요 | 보완 필요 |
| Tree | 펼침/접힘·선택·숨김 상태 표시·위/아래·삭제·Undo. 표시/숨김 조작은 속성 폼에 있고 Tree 직접 조작은 없음 | 보완 필요 |
| 저장·Undo·확정 | 검증→Schema 갱신→Canvas→자동 저장, 최근 1단계 Undo, 편집 후 재확정, 저장 실패 메모리 보존 | 구현 |

## 이번 변경의 계약

- KPI `color`는 선택 필드이며 6자리 HEX 또는 `null`이다. 생략/`null`은 기존 기본 숫자색, 아이콘은 테마 강조색을 사용한다. 개별 색상은 숫자·아이콘에 적용하고 증감의 기존 의미 색상은 유지한다.
- KPI `icon`은 `none/chart/users/wallet/target/activity` 중 하나다. 생략은 `none`. 기존 Lucide 라이브러리를 사용하며 ZIP에는 인라인 SVG를 포함한다. 외부 아이콘 이미지 요청이 필요 없다.
- 기존 Schema 0.1 저장본은 필드를 추가하지 않아도 유효하다. AI 수정 계약도 같은 선택 필드를 허용하며, KPI 외 컴포넌트에 잘못 적용한 Patch는 전체 검증에서 거부한다. 백엔드도 공용 Schema를 읽으므로 실행 중인 구버전 서버는 재시작 후 새 필드를 처리한다.
- 비주얼 OFF는 세부 입력만 잠그고 값을 삭제하지 않는다. 적용/취소와 다시 ON은 계속 가능하다.
- 유료 AI 호출은 하지 않았다. AI 연동은 계약·Patch 검증 및 모의 공급자 회귀 검사로 확인했다.

## 이번 검증

- 프론트엔드 단위 테스트 55개, 빌드·린트 통과.
- 백엔드 타입 검사와 테스트 22개 통과.
- Chromium 브라우저 검사 8개: `kpiStyle.spec.ts`, `chartLegend.spec.ts`, `builder.spec.ts`.
- 잘못된 색상 비반영, 입력 취소, 새로고침 복원, Undo, 확정, 비주얼 OFF/ON 보존, 기존 차트·데이터 편집·실제 ZIP 다운로드/직접 실행 회귀를 확인했다. 신규 KPI 속성의 HTML/JSON Export 반영은 단위 검사로 확인했다.

## 다음 작업의 종료 조건

CMS 후속 보완은 위의 네 가지 미완료 항목으로 한정한다: 허용 높이 프리셋, Property 그룹 구분, 필드별 오류 연결, Tree 표시/숨김 직접 조작. 기존 데이터 호환·최소 하나의 표시 데이터 유지·Undo·저장·Export 회귀를 함께 확인한다. Drag & Drop, Redo, 자유 CSS 편집, 고급 Table은 추가하지 않는다.

그 뒤 서비스 이용 안내·정책, 실제 운영 환경 확인 및 통합 QA로 진행한다. 저장 목록 재탐색·파일 가져오기·미래 버전 마이그레이션은 별도 후속 개선이며 이번 CMS 완료 조건에 섞지 않는다.
