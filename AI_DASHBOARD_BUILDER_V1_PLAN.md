# AI Dashboard Builder V1 최종 기획서

| 항목 | 내용 |
|---|---|
| 문서 버전 | 1.0 |
| 작성일 | 2026-09-30 |
| 문서 목적 | UI 디자인·개발 착수 및 QA의 공통 기준 |
| 대상 제품 | AI Dashboard Builder V1 — 정식 서비스명 미정 |
| 근거 | 「홈페이지 기획서 작성」 대화의 1~25단계 및 최종 통합 요청 |
| 원문 | chatgpt-conversation://6ab14b69-eb00-83e8-a766-39cd79b31cfd |
| 산출물 | 본 Markdown 문서 한 개 |

**V1은 PC 전용이다. 모바일·태블릿·반응형 제작 및 해당 Preview는 제외한다.**

문서 적용 원칙:

- 사용자가 명시한 결정과 후반 단계의 최종 범위를 초기 제안보다 우선한다.
- 본문의 ‘필수’는 출시 기준이다. ‘권장·초기안·예시·미정’은 확정된 요구사항과 구분한다.
- 초기 대화의 회원 저장 제외는 서버 저장 제외를 의미하며, 이후 추가된 Local Storage와 자동 저장은 V1에 포함한다.
- 초기 P1로 제안됐던 Undo, 최근 작업, 자동 저장, 변경 요약 및 최종 Component Library 항목은 24~25단계 완료 기준을 우선하여 기본 기능을 포함한다.
- Schema의 정확한 필드 계약, 수치 프리셋 및 운영값은 구현 전에 검증한다. 이 문서의 통합 예시는 실행 가능한 Validation 구현 자체가 아니다.

## 목차

1. 프로젝트 개요
2. 서비스 목표
3. V1 / V2 범위
4. 핵심 사용자 플로우 및 상태
5. IA / 메뉴 구조
6. 화면 정의
7. Create 옵션
8. Main Visual
9. AI 생성 / 수정 규칙
10. Dashboard Schema
11. Component Library
12. CMS Editor
13. Preview / Finalize
14. Export
15. Local Storage
16. 운영 정책
17. 보안 정책
18. 디자인 시스템
19. UI 컴포넌트
20. 개발 아키텍처
21. 개발 Phase
22. QA / Acceptance Criteria
23. V1 제외 기능
24. V2 확장
25. 용어 정의
26. 변경 이력

## 1. 프로젝트 개요

사용자가 대시보드 제작 기준을 선택하고 추가 요청을 입력하면 AI가 PC용 대시보드를 생성한다. 사용자는 Preview에서 결과를 확인하고 AI 수정과 CMS Editor로 완성한 후, 확정된 결과를 HTML/CSS/JavaScript 소스 ZIP으로 다운로드한다.

제품의 핵심 정의는 **“AI가 초안을 만들고, 사용자가 직접 완성하는 PC Dashboard Builder”**이다.

- 회원가입·로그인 없이 무료 이용한다.
- 생성 결과는 이미지가 아니라 실제 렌더링되는 웹 대시보드다.
- 샘플 데이터 기반 디자인 제작 도구이며 실제 업무 데이터 시스템은 아니다.
- 완성 템플릿 하나를 고르는 방식이 아니라, AI가 검증된 컴포넌트를 선택·배치하고 속성·샘플 데이터·테마를 구성한다.
- CMS는 생성된 대시보드를 편집하는 도구다. 서비스 소개 페이지를 운영하는 CMS나 다운로드 후 운영되는 서버 CMS를 의미하지 않는다.
- 기획 완료 후 화면 설계 → UI 디자인 → 구현 → QA까지 같은 기준으로 이어간다.

## 2. 서비스 목표

| 목표 | 확인 방법 |
|---|---|
| 빠른 제작 시작 | 가입 없이 Home에서 한 번의 CTA 클릭으로 Create 진입 |
| 가이드형 생성 | 모든 필수 옵션에 기본값 제공, 추가 요청 없이 생성 가능 |
| 생성 품질 | 선택한 유형·스타일·구성요소를 지키는 유효한 Schema 생성 |
| 수정 편의 | AI로 큰 방향 수정, CMS로 세부 내용 즉시 수정 |
| 결과 활용 | 빌드 없이 실행할 수 있는 소스 ZIP 제공 |
| 작업 연속성 | 같은 브라우저에서 최근 작업 복원 |

제품 검증 지표는 생성 성공률, AI 수정 성공률, 수정 재요청·Undo 비율, CMS 사용률, 확정률, 다운로드율, 오류율이다. 핵심 전환은 **생성 완료 → 다운로드**이며 확정 → 다운로드도 함께 측정한다. 목표 비율은 Beta에서 정한다.

## 3. V1 / V2 범위

| 영역 | V1 | V2 방향 |
|---|---|---|
| 제작 대상 | 단일 PC 대시보드 | 대시보드 + 일반 홈페이지 |
| 회원·요금 | 가입 없음, 무료 | 회원가입·로그인, 유료 요금제 |
| 입력 | 선택형 조건 + 자연어 추가 요청 | 홈페이지 유형·업종별 조건 확장 |
| 생성·수정 | Generate / Edit / Repair, CMS Editor | 기존 엔진 재사용 및 확장 |
| 데이터 | 샘플 데이터 | 실제 데이터 연동은 별도 후속 검토 |
| 저장 | Local Storage, 최근 작업 | 계정별 서버 프로젝트 저장·관리 |
| 페이지 | 단일 대시보드 | 다중 페이지, Website Schema |
| 결과 | HTML/CSS/Vanilla JS ZIP | 소스 다운로드 유지, 추가 Export 별도 검토 |
| 배포·협업 | 제외 | 향후 후보, V2 필수로 확정하지 않음 |

V1 필수 범위는 생성부터 Export까지의 전체 흐름, Main Visual, 기본 Component Library, 자동 저장, 최소 1단계 Undo, 최근 작업, 오류 복구 및 최소 운영·보안이다. Drag & Drop, Redo, Canvas Zoom, 고급 Table 옵션은 일정에 따라 후순위로 둔다.

## 4. 핵심 사용자 플로우 및 상태

### 4.1 기본 흐름

```text
Home → Create → Generating → Preview → AI Edit → CMS Editor → Finalize → Download ZIP
                                  ↑        ↓          │
                                  └────────┴──────────┘
```

이 순서는 권장 제작 흐름이다. AI 수정이나 CMS 수정을 강제하지 않는다. Preview에서 바로 CMS Editor 또는 Finalize로 이동할 수 있으며, CMS Editor에서도 최신 상태를 기준으로 AI 수정과 Preview를 반복할 수 있다.

### 4.2 저장 상태

| 상태 | 의미 | 다음 동작 |
|---|---|---|
| `draft` | 조건 선택 중 | 생성 요청 |
| `generating` | 최초 생성 처리 중 | 성공 시 generated, 실패 시 draft |
| `generated` | 최초 유효 Schema 생성 완료 | Preview, AI/CMS 수정, 확정 |
| `editing` | AI 또는 CMS 편집 단계 | 수정, Preview, 확정 |
| `finalized` | 현재 Schema 검증·확정 완료 | Export 또는 편집 복귀 |
| `exported` | ZIP 생성 및 브라우저 다운로드 전달 완료 | 재다운로드 또는 편집 복귀 |

`Preview`는 화면 모드이며 프로젝트 상태가 아니다. `finalizing`, `exporting`, 오류 및 저장 중 표시는 일시적인 UI 상태로 분리한다. 브라우저는 실제 디스크 저장 완료를 보장할 수 없으므로 exported의 판정은 ZIP 생성·다운로드 전달 기준으로 구현한다. 이는 상태 의미를 명확히 하기 위한 구현 보완 기준이다.

### 4.3 상태·복구 규칙

- Create 옵션 변경은 Summary와 Draft에 반영하며 AI를 호출하지 않는다.
- AI 처리 중에는 중복 요청과 해당 작업에 충돌하는 수정을 막는다.
- AI Edit는 수정 전 Snapshot을 확보한다. 실패하면 기존 Schema와 Preview를 유지한다.
- CMS 입력은 검증 후 반영한다. 잘못된 입력은 필드에 오류를 표시하고 마지막 정상 Schema를 유지한다.
- Finalized/Exported에서 편집으로 돌아가면 editing으로 전환하고 다시 확정해야 다운로드할 수 있다.
- Export 실패는 확정된 Schema를 손상시키지 않는다. 재다운로드를 제공한다.
- 생성 중 새로고침으로 요청을 이어갈 수 없으면 중단 안내와 동일 조건 재시도를 제공한다.
- 재생성은 현재 조건 유지 또는 조건 다시 선택을 제공한다. 기존 Schema를 최소 1회 백업하고 이전 디자인 복귀를 지원한다. 전체 버전 관리 UI는 필수가 아니다.
- 현재 디자인 대체, 프로젝트 초기화, 최근 작업 삭제는 확인을 받는다. 일반 속성 수정에는 확인 Modal을 사용하지 않는다.

## 5. IA / 메뉴 구조

```text
Home
├─ 사용방법: 제작 흐름 안내 영역 또는 안내 페이지
├─ 대시보드 만들기
│  └─ Create → Generating → Preview
│                           ├─ AI Edit Drawer
│                           ├─ CMS Editor ↔ Preview / AI Edit
│                           └─ Finalize Modal → Download Modal
├─ 최근 작업: 브라우저 저장 프로젝트 복원
├─ SEbit: 외부 사이트
└─ Footer: 이용약관 / 개인정보처리방침 / 서비스 안내 / SEbit / Copyright
```

**GNB 순서는 `Logo / 사용방법 / 대시보드 만들기 / SEbit`으로 고정한다. SEbit은 GNB 마지막 메뉴이며 `http://sebit.co.kr`로 새창 이동한다.**

구현 시 SEbit 링크에 `target="_blank"`와 `rel="noopener noreferrer"`를 적용한다. 이 GNB는 Builder 서비스 메뉴이며 생성된 대시보드의 Navigation과 구분한다. 생성 결과에 SEbit 메뉴를 강제 삽입하는 요구사항은 없다.

Home/Create는 Website Layout과 Footer를 사용하고 Preview/CMS Editor는 전체 화면 Application Layout과 작업 Toolbar를 사용한다. 사용방법의 페이지/앵커 방식과 실제 URL 경로는 구현 시 확정한다.

## 6. 화면 정의

### 6.1 화면 목록

| 화면 ID | 화면 | 핵심 구성·행동 | 상태·예외 |
|---|---|---|---|
| V1-001 | Home | GNB, Hero, 결과 예시, 사용방법, CTA, 최근 작업, Footer | 최근 작업 없으면 영역 숨김 |
| V1-002 | Create | 조건 선택, Main Visual, 추가 요청, 우측 Summary, 생성 CTA | 기본값으로 즉시 생성 가능, 입력 오류·사용 제한 안내 |
| V1-003 | Generating | 진행 단계, Skeleton | 성공 시 Preview, 실패 시 재시도·조건으로 복귀 |
| V1-004 | Preview | 프로젝트명, 결과 Canvas, AI 수정·CMS·재생성·확정 | 읽기 전용, 편집 UI 제거 |
| V1-005 | AI Edit | 우측 Drawer, 요청 입력, 적용, 변경 요약, Undo | 처리 중 잠금, 실패 시 현재 결과 유지 |
| V1-006 | CMS Editor | Toolbar, Component Tree, Canvas, Property Panel | 선택 상태, 즉시 반영, 자동 저장, 입력 오류 |
| V1-007 | Finalize | 검증 체크리스트 Modal | 오류 위치 안내, 통과 시 Download 활성화 |
| V1-008 | Download | 프로젝트명, 파일 목록·구조, ZIP CTA | 생성 중 표시, 실패 시 재시도 |

### 6.2 공통 PC 화면 규격

수치는 디자인 착수 기준이며 범위로 제시된 값은 화면 설계에서 하나로 정한다.

| 항목 | 기준 |
|---|---|
| 기준 디자인 폭 / 최소 지원 폭 | 1440px / 1280px |
| 일반 페이지 최대 콘텐츠 폭 | 1200~1240px |
| 좌우 여백 / 상단 콘텐츠 여백 | 24~32px / 32px |
| GNB 높이 | 64px |
| 일반 섹션 간격 | 32~48px |
| Home Hero 높이 / 제목 최대 폭 | 약 600~720px / 700px |
| Create | 좌측 입력 약 70%, 우측 Summary 약 30%, 간격 32px |
| Create Summary | 300~340px 권장, 상단 24px Sticky |
| 선택 카드 | 폭 160~200px, 높이 120~160px, 간격 16px |
| Generating | 진행 영역 최대 700px, Skeleton 폭 800~900px |
| Preview Toolbar | 높이 56~64px, 고정 또는 Sticky |
| AI Drawer | 폭 380~420px, Toolbar 아래, Padding 20~24px |
| CMS 기본 배치 | Toolbar 60px / 왼쪽 240px / 오른쪽 320px / 중앙 나머지 |
| Tree 항목 | 높이 32~36px, 들여쓰기 16px, 글자 13~14px |
| Property 입력 | 높이 36~40px, Label 12~13px, 섹션 간격 20~24px |
| Modal | Small 480px / Medium 640px / Large 800~960px |
| Download Modal | 560~640px |

Create의 좌측 820~900px 권장 폭은 넓은 화면에서의 참고값이다. 최소 1280px에서 고정폭 합계가 사용 폭을 초과하지 않도록 좌측을 조정한다. 이는 PC 범위 내부의 폭 조정이며 모바일 반응형 범위 추가가 아니다.

### 6.3 화면별 스크롤·액션

- Home: 전체 페이지 스크롤. Hero CTA는 ‘대시보드 만들기’ 한 개를 중심으로 한다.
- Create: 전체 페이지 스크롤 + Summary Sticky. 생성 CTA는 입력 콘텐츠 마지막에 배치한다.
- Generating: 중앙 정렬. 요청 분석 → Layout → Component → Sample Data → Style → Preview 준비를 표시한다. 실제 완료를 확인하지 않은 단계를 완료로 확정 표시하지 않도록 구현한다.
- Preview: Toolbar 고정 + Canvas 스크롤. 최소 1280px의 결과 영역이 가용 폭보다 크면 내부 가로 스크롤을 제공한다.
- CMS Editor: Body 고정, 좌측·중앙·우측 독립 스크롤. Canvas 디자인 폭 1440px, 최소 1280px. 패널 때문에 줄어든 공간에 결과물을 강제 재배치하지 않는다. Zoom은 선택 기능이다.
- Modal: 본문 내부 스크롤, 하단 취소/적용 액션. Data Editor는 Large Modal을 사용한다.

## 7. Create 옵션

| 옵션 | 선택값 | 기본값 | 규칙 |
|---|---|---|---|
| Dashboard Type | Analytics / Admin / CRM / Project / Monitoring | Analytics | 단일 선택 |
| Navigation | Sidebar / Top Navigation | Sidebar | 단일 선택, 고급 Mega Menu 제외 |
| Style | Modern / Minimal / Corporate / Dark | Modern | 색뿐 아니라 Radius·Shadow·Typography·Border 차이 반영 |
| Color | Blue / Green / Purple / Neutral | Blue | Primary 중심으로 테마 토큰 생성 |
| Components | KPI / Chart / Table / Progress / Notification | KPI + Chart + Table | 다중 선택, 지원 Library 안에서 생성 |
| Density | Compact / Standard / Spacious | Standard | Gap·Padding·정보 밀도에 반영 |
| Main Visual | 사용 안 함 / 사용함 | OFF 권장 초기안 | ON이면 하위 옵션 표시, 8절 참조 |
| Additional Request | 자유 텍스트 | 빈 값 | 선택사항, 선택 조건과 함께 전달 |

Main Visual OFF 기본값은 기존 대화에서 명시적으로 확정되지 않아 초기안으로 둔다. Activity/Summary 등은 Library에서 지원하지만 Create의 기본 체크박스 항목 확대는 확정하지 않는다.

옵션을 바꾸면 Summary와 로컬 Draft를 즉시 갱신한다. 추가 요청에는 예시와 민감정보 입력 금지 안내를 제공한다. 자연어가 선택 조건·V1 범위를 충돌시키면 묵시적으로 범위를 확장하지 않고 지원 범위를 안내한다. 최소 하나의 데이터 컴포넌트가 있어야 하며 모두 해제한 경우 오류를 안내한다.

## 8. Main Visual

Main Visual은 V1 정식 기능이며 대시보드 상단의 전용 영역이다. 최대 1개만 허용하고 KPI·Chart 등의 데이터 영역을 대체하지 않는다.

| 항목 | 지원 내용 |
|---|---|
| 사용 여부 | ON/OFF. OFF 시 공간도 제거, 하위 설정 숨김 또는 비활성화 |
| 유형 | Banner: 얇고 넓은 영역 / Hero: 큰 제목 중심 / Image + Text: 이미지·문구 조합 |
| 높이 | Small / Medium / Large. 실제 px 프리셋은 디자인 단계에서 확정 |
| 콘텐츠 | Title, Description |
| CTA | ON/OFF, Label, URL |
| 이미지 | 사용자 업로드 또는 기본 Placeholder, Thumbnail·교체·제거 |
| 표현 | Background Image, Overlay, Text Alignment |
| 편집 | CMS에서 모든 지원 속성 수정, Canvas 즉시 반영 |

OFF로 전환하더라도 하위 설정을 보존해 다시 ON할 때 복원하는 방식을 권장한다. 이미지 제거 시 배경색 또는 기본 배경으로 대체한다. 이미지 없는 Banner/Hero를 무조건 오류로 처리하지 않는다. 필수 이미지가 지정된 Variant에서 누락되면 Finalize가 위치를 안내한다.

이미지 원본을 Local Storage에 큰 Base64로 저장하지 않는 방향을 권장한다. IndexedDB에 Blob 보존 또는 임시 Object URL 사용을 검토하되, Object URL만으로 브라우저 재시작 후 복원을 보장할 수 없으므로 저장·복원 정책을 먼저 확정한다. 업로드 한도 5MB는 제안값이며 파일 형식·해상도·용량 한도는 미정이다.

Export에 최종 이미지, 제목, 설명, Overlay, 정렬, CTA를 반영한다. 로컬 이미지는 ZIP의 assets에 포함하고 임시 Object URL을 결과에 남기지 않는다.

Video Background, Slider, Carousel, 복잡한 Animation, Multiple Hero, AI 이미지 생성은 제외한다.

## 9. AI 생성 / 수정 규칙

### 9.1 역할과 입력·출력

| 기능 ID | 역할 | 입력 | 출력 |
|---|---|---|---|
| GEN-001 | Generate | Create 선택값 + Main Visual + 추가 요청 + 디자인 규칙 | Dashboard Schema |
| GEN-002 | Edit | 최신 Schema + 자연어 요청 + 지원 규칙 | 검증 가능한 Patch + 변경 요약 |
| GEN-003 | Repair | 잘못된 Schema + Validation 오류 | 복구된 Schema |

AI는 임의 HTML/JS를 직접 실행시키지 않는다. 지원 컴포넌트, 데이터 구조, 테마 및 12열 Grid 안에서 새로운 디자인을 구성한다. HTML/CSS/JS는 검증된 Export Engine이 만든다.

### 9.2 Generate 규칙

1. 사용자 조건·추가 요청을 Backend로 전달한다.
2. System 규칙 → 디자인 규칙 → Component 규칙 → Type별 Blueprint → 사용자 선택·추가 요청 순서로 Prompt를 구성한다.
3. PC 전용, 최소 1280px, 12열 Grid, 샘플 데이터, 지원 컴포넌트만 허용한다.
4. Main Visual ON이면 상단 영역을 확보한다. 기본 정보 계층은 요약 KPI → 주요 추이 → 상세 Chart → Table/Activity다.
5. JSON 파싱 → Schema Validation → 업무 규칙 검증을 통과한 결과만 렌더링·저장한다.
6. 실패하면 Auto Repair 후 재검증한다. 자동 복구 1회를 초기안으로 하며 무한 재시도는 금지한다.
7. 끝내 실패하면 기존 조건을 유지하고 재시도/돌아가기를 제공한다.

### 9.3 유형·스타일별 규칙

| 유형 | 우선 구성 |
|---|---|
| Analytics | KPI, Line/Area 추이, 비교 Chart, Table |
| Admin | 사용자·시스템 KPI, 통계 Chart, Activity, 상태 Table |
| CRM | 고객 KPI, 고객 추이, Donut, 고객 Table·Activity |
| Project | 진행률, KPI, Task 상태, Activity |
| Monitoring | 상태 KPI, Line, Notification/Alert, Log Table; 실시간처럼 보이는 샘플만 사용 |

Blueprint는 고정 완성 템플릿이 아니라 조합 지침이다. Project의 Timeline 등 초기 예시는 전용 신규 컴포넌트 의무로 해석하지 않고 지원 Library 안에서 표현한다.

| 스타일 | 디자인 규칙 |
|---|---|
| Modern | 여유 있는 공간, 큰 Radius, 부드러운 Shadow, 밝은 배경 |
| Minimal | Border 중심, Shadow 최소, 절제된 색상과 여백 |
| Corporate | 작은 Radius, 명확한 구분선, 안정적인 타이포, 비교적 높은 밀도 |
| Dark | 어두운 배경, 충분한 텍스트 대비, Card Layer 구분 |

Density는 Compact/Standard/Spacious의 간격·Padding 프리셋으로 적용한다. 스타일의 기본 밀도와 명시적 Density가 충돌하면 사용자 Density를 우선하는 것을 통합 구현 기준으로 한다.

### 9.4 Edit / Patch 규칙

- 작은 변경은 대상 컴포넌트만, Layout 변경은 관련 Section만 수정한다.
- 전체 스타일 요청은 Theme과 필요한 속성만 수정하며 기존 데이터와 불필요한 구조 변경을 피한다.
- ‘더 예쁘게’처럼 모호한 요청은 현재 Style 안에서 간격·정보 계층·대비를 개선하고 변경 내용을 설명한다.
- Patch action은 `update`, `add`, `remove`, `move`, `themeChange`를 기준으로 설계한다. 대상 ID, 허용 필드, 값, 변경 후 전체 Schema를 검증한다.
- 수정 전 Snapshot을 남기고 Patch 전체를 검증한 뒤 한 번에 적용한다. 실패한 일부 변경을 남기지 않는다.
- AI 처리 중 CMS 등에서 기준 Schema가 바뀌면 오래된 Patch를 그대로 덮어쓰지 않는다. 잠금 또는 기준 버전 비교 방식은 구현 시 선택한다.
- 변경 요약과 최소 1단계 Undo를 제공한다. AI 수정 후 CMS 수정값을 유지해야 한다.
- 모바일 제작, 실제 DB/API 연결, 지원하지 않는 Chart·위험한 Script 요청은 지원 범위를 안내한다.

```json
{
  "action": "update",
  "targetId": "chart_01",
  "changes": { "layout": { "columnSpan": 12, "height": 420 } }
}
```

위 Patch의 중첩 객체 병합, 속성 삭제, 다중 action 표현은 Phase 1에서 명세·검증기를 확정한다. 무관한 필드를 삭제하는 얕은 객체 교체로 처리하지 않는다.

## 10. Dashboard Schema

### 10.1 단일 기준 데이터

AI 생성, Preview, CMS, AI Edit, Undo, Finalize, Export는 동일한 Dashboard Schema를 사용한다. 화면 DOM을 편집 상태의 원본으로 삼지 않는다.

| 영역 | 주요 필드·역할 |
|---|---|
| Project | id, name, type, createdAt, updatedAt; 회원 ID 없음 |
| Status | draft / generating / generated / editing / finalized / exported |
| Theme | style, Primary·Background·Surface·Text·Border 토큰, font, radius, shadow, density |
| Layout | desktopWidth 1440, minWidth 1280, gridColumns 12, gap, sidebarWidth |
| Navigation | sidebar/top, logoText, items의 id·label·icon·active·visible·order |
| Header | title, description, showDate, showUserArea |
| Main Visual | enabled, type, height 프리셋, title, description, image, overlay, align, CTA |
| Sections | id, type, order, visible, components |
| Component | id, type, title, order, visible, layout, style + 유형별 데이터 |
| Settings | 샘플 데이터 모드 등 공통 설정; 실제 연결 자격증명 금지 |

모바일/태블릿 breakpoint나 자유 픽셀 좌표는 저장하지 않는다. Navigation은 단일 화면의 메뉴 표현이며 다중 페이지 생성이나 계정 기능을 뜻하지 않는다.

### 10.2 통합 구조 예시

아래는 분산된 대화 예시를 연결한 **개발용 초안**이다. `schemaVersion`, Section의 `components` 포함 방식, Main Visual 필드명은 통합을 위한 제안이며 Phase 1에서 TypeScript/Zod 계약으로 고정한다. Draft는 Schema가 아직 없을 수 있다.

```json
{
  "schemaVersion": "1.0",
  "project": {
    "id": "dashboard_001",
    "name": "Sales Dashboard",
    "type": "analytics",
    "createdAt": "2026-09-30T00:00:00Z",
    "updatedAt": "2026-09-30T00:00:00Z"
  },
  "status": "generated",
  "theme": {
    "style": "modern",
    "density": "standard",
    "primaryColor": "#2563EB",
    "backgroundColor": "#F5F7FA",
    "cardColor": "#FFFFFF",
    "textColor": "#111827",
    "subTextColor": "#6B7280",
    "borderColor": "#E5E7EB",
    "borderRadius": 12,
    "fontFamily": "Pretendard"
  },
  "layout": {
    "desktopWidth": 1440,
    "minWidth": 1280,
    "gridColumns": 12,
    "sidebarWidth": 240,
    "contentGap": 24
  },
  "navigation": {
    "type": "sidebar",
    "logoText": "Sales",
    "items": [
      { "id": "nav_01", "label": "Overview", "icon": "home", "order": 1, "active": true, "visible": true }
    ]
  },
  "header": { "title": "Sales Dashboard", "description": "Sample sales overview", "showDate": true, "showUserArea": false },
  "mainVisual": {
    "enabled": true,
    "type": "hero",
    "height": "medium",
    "title": "Sales Performance",
    "description": "Monthly business performance",
    "imageAssetId": null,
    "overlay": 0,
    "align": "left",
    "cta": { "enabled": false, "label": "", "url": "" }
  },
  "sections": [
    {
      "id": "section_01", "type": "kpi-group", "order": 1, "visible": true,
      "components": [
        {
          "id": "kpi_01", "type": "kpi", "title": "Revenue", "order": 1,
          "value": 125000000, "unit": "KRW", "change": 12.5, "changeType": "increase",
          "visible": true, "layout": { "columnSpan": 3 },
          "style": { "variant": "basic", "accentColor": "#2563EB" }
        }
      ]
    },
    {
      "id": "section_02", "type": "chart-group", "order": 2, "visible": true,
      "components": [
        {
          "id": "chart_01", "type": "chart", "chartType": "line", "title": "Monthly Revenue", "order": 1,
          "labels": ["Jan", "Feb", "Mar"],
          "datasets": [{ "name": "Revenue", "data": [120, 180, 220] }],
          "options": { "showLegend": true, "showGrid": true },
          "layout": { "columnSpan": 12, "height": 360 }, "style": {}, "visible": true
        }
      ]
    },
    {
      "id": "section_03", "type": "table-group", "order": 3, "visible": true,
      "components": [
        {
          "id": "table_01", "type": "table", "title": "Recent Orders", "order": 1,
          "columns": [{ "key": "orderId", "label": "Order ID" }, { "key": "amount", "label": "Amount" }],
          "rows": [{ "orderId": "ORD-001", "amount": 120000 }],
          "layout": { "columnSpan": 12 }, "style": {}, "visible": true
        }
      ]
    }
  ],
  "settings": { "dataMode": "sample" }
}
```

### 10.3 유형별 데이터 계약

| 유형 | 추가 데이터 |
|---|---|
| KPI | value, unit, change, changeType, icon |
| Chart | chartType: line/bar/area/donut, labels, datasets, legend/grid 옵션, height |
| Table | columns: key/label, rows: 컬럼 key별 값; 표시·정렬 옵션은 지원 범위 내 |
| Progress | value, max, title; max > 0 및 범위 검증 |
| Notification | title, message, status: info/success/warning/error, time |
| Activity | items의 title, description, timestamp, icon |
| Summary | title, description 및 표시 값 |
| Status Badge | label, status |
| Button | label, variant, size, 허용된 action 또는 URL |

### 10.4 Validation

- 필수 필드·자료형·허용 enum 검사, 전역 ID 중복 금지, 참조 대상 존재 확인.
- columnSpan은 정수 1~12, gridColumns는 12. 레이아웃은 Grid 배치로 처리한다.
- 높이·간격·색상·URL은 허용된 형식과 컴포넌트별 범위를 적용한다. 정확한 최소·최대값은 Phase 1에서 정의한다.
- Main Visual 최대 1개, 최소 하나의 표시 가능한 데이터 컴포넌트 유지.
- Chart는 지원 4종만 허용하고 labels와 각 dataset의 길이 일치, 유효한 수치, 필수 데이터 존재를 검사한다.
- Table은 컬럼 key 중복과 행 데이터 구조를 검사한다. 빈 행은 명시적 Empty State로 처리하고 필수 데이터 요구 시 Finalize에서 안내한다.
- 사용자 입력에 실행 코드·임의 외부 요청·비밀정보 연결 필드를 허용하지 않는다.
- AI 결과 복구는 재검증 후 적용하고, CMS의 잘못된 입력은 자동으로 정상값을 덮어쓰지 않는다.

## 11. Component Library

| 컴포넌트 | V1 내용 | CMS 편집 핵심 |
|---|---|---|
| Navigation | Sidebar, 기본 Top Navigation | 메뉴명, 아이콘, 순서, 표시/숨김 |
| Main Visual | Banner, Hero, Image + Text | 8절 전체 속성 |
| Header | 제목, 설명, 날짜 표시 | 텍스트, 표시 옵션 |
| KPI | 기본 카드; Icon/Trend Variant 권장 | 제목, 값, 단위, 증감, 아이콘, 색, 크기 |
| Line Chart | 추이 | 제목, 데이터, 색, Legend, 크기 |
| Bar Chart | 비교 | Chart 공통 속성 |
| Area Chart | 면적형 추이 | Chart 공통 속성 |
| Donut Chart | 구성 비율 | Chart 공통 속성 |
| Table | 기본/상태 Table | 제목, 컬럼명, 행 데이터, 표시 |
| Progress | 진행률, 목표 진행 | 제목, 값, 최대값, 표시 |
| Notification | Info/Success/Warning/Error | 제목, 문구, 상태 |
| Activity | 최근 작업·주문 등 샘플 목록 | 항목, 설명, 시간 |
| Summary | 설명형 요약 카드 | 제목, 설명, 값 |
| Status Badge | 상태 표시 | Label, 상태 토큰 |
| Button | Primary/Secondary/Ghost/Danger | Label, Variant, Size, 허용 동작 |

공통 속성은 ID, type, title, order, visible, layout, style이다. 컴포넌트별 Property 정의를 통해 CMS 패널을 구성한다. Card 내부 Badge/Button은 중첩 표현할 수 있으며 모든 컴포넌트를 독립 Section으로 만들 필요는 없다.

크기 프리셋 초기안은 KPI Small/Medium/Large, Chart 4/6/8~12열, Table 8/12열이다. Grid 일반 유효 범위 1~12와 별개로 CMS에는 지원 프리셋만 노출한다. Form, KPI Trend 고급형, Table 검색·필터·Pagination·고급 정렬은 필수가 아니다. 기본 Sorting의 실제 동작 지원 여부는 구현 전 확정한다.

## 12. CMS Editor

### 12.1 구조와 역할

좌측 Component Tree에서 구조를 선택하고, 중앙 Canvas에서 실제 결과를 확인하며, 우측 Property Panel에서 속성을 수정한다. Preview와 같은 Renderer에 선택·편집 UI만 추가한다.

Toolbar에는 프로젝트명, 저장 상태, Undo, AI 수정, Preview, 확정을 제공한다. Property는 Content / Style / Layout / Data / Visibility로 나누고 선택한 컴포넌트에 맞춰 전환한다.

### 12.2 기능 명세

| 기능 ID | 기능 | 동작 |
|---|---|---|
| EDT-001 | 텍스트·KPI 편집 | 제목, 메뉴명, 설명, 버튼명, KPI 값·단위·증감 수정 |
| EDT-002 | 색상 편집 | Primary, Background, Card, Text, Accent 및 지원 속성 |
| EDT-003 | Chart 편집 | 지원 4종 전환, 제목, labels/data, Legend, 색상 |
| EDT-004 | 표시/숨김 | Tree와 Canvas 선택 동기화, 숨김 상태 표시 |
| EDT-005 | Table 편집 | 컬럼명과 샘플 행 데이터 수정 |
| EDT-006 | 순서·크기 | 위/아래 이동 등 제한적 순서 변경, Grid Size·허용 Height |
| EDT-007 | Undo | 최근 AI/CMS 변경 최소 1단계 복원 |
| VIS-001 | Main Visual 사용 설정 | ON/OFF, 상단 전용 영역 반영 |
| VIS-002 | Main Visual 편집 | 유형·높이·콘텐츠·CTA·이미지·Overlay·정렬 |

모든 변경은 **입력 → Validation → Schema Update → Canvas 갱신 → Auto Save** 순서로 처리한다. 단순 직접 수정에 AI를 호출하지 않는다.

Chart/Table Data Editor는 간단한 Grid 입력 Modal이며 적용/취소를 제공한다. 행 추가/삭제와 Table 편집 강화는 선택 범위다. 잘못된 숫자, 빈 필수 Dataset, 잘못된 색상, 음수 높이는 정상 Schema에 반영하지 않는다.

Tree는 펼치기/접기, 선택, 표시/숨김, 순서 변경을 지원한다. 삭제 가능한 항목은 삭제 후 Undo를 제공하며 마지막 필수 데이터 컴포넌트까지 제거해 유효성을 깨뜨리지 않는다. 자유로운 컴포넌트 제작·Canvas 픽셀 이동·HTML/CSS 직접 편집은 제외한다.

Snapshot 기반 History를 권장한다. 최소 1단계는 필수이고 최근 10~20단계, Redo, Canvas Zoom, Drag & Drop, 인라인 텍스트 편집은 선택 개선 기능이다. Drag & Drop 없이도 버튼 기반 순서 변경은 가능해야 한다.

## 13. Preview / Finalize

### 13.1 Preview

- 읽기 전용 결과 확인 화면이며 선택 Border, Drag Handle, Property UI가 대시보드 안에 노출되지 않는다.
- 상단 Builder Toolbar는 허용하며 실제 Export 결과에는 포함하지 않는다.
- PC 화면만 제공하고 Device Switch는 없다.
- AI 수정, CMS Editor, 새로 생성, 확정으로 이동할 수 있다.
- CMS에서 Preview 전환 시 최신 Schema를 사용하며 ‘편집으로 돌아가기’를 제공한다.

### 13.2 Finalize

EXP-001은 다음을 검사한다: Schema → Component 필수값 → Chart/Table Data → Main Visual/Asset → 렌더링 → Export 가능 여부.

통과 시 현재 Schema의 최종 Snapshot을 만들고 finalized로 저장한 뒤 Download를 활성화한다. 실패 시 해당 컴포넌트와 항목을 안내하고 ‘수정하기’로 이동한다. 검증 실패 상태에서 다운로드를 진행하지 않는다.

확정은 영구 잠금이 아니라 다운로드 준비 상태다. 다시 편집할 수 있으며 편집 복귀 시 확정을 해제한다. Export는 검증한 Snapshot을 사용해 중간 변경과 섞이지 않게 한다.

## 14. Export

### 14.1 산출물과 실행 조건

EXP-002는 확정된 Schema로 정적 HTML/CSS/Vanilla JS를 만들고 ZIP으로 제공한다. React 런타임이나 npm 설치·빌드가 필요하지 않아야 한다.

```text
project-name/
├─ index.html
├─ css/
│  ├─ reset.css
│  └─ style.css
├─ js/
│  ├─ dashboard.js
│  └─ charts.js
├─ data/
│  └─ dashboard.json
├─ assets/
│  ├─ icons/
│  └─ images/
└─ README.md
```

최소 필수 파일은 index.html, css/style.css, js/dashboard.js, data/dashboard.json, README.md다. reset.css/charts.js는 분리 권장이고 실제 사용한 assets는 반드시 포함한다.

압축을 풀고 `index.html`을 PC 브라우저에서 직접 열어 동작해야 한다. Chart.js CDN은 기존의 우선 제안이며 인터넷 연결이 필요하다. 라이브러리를 ZIP에 포함하는 Offline Export는 후속 후보이므로 V1에 오프라인 실행을 약속하지 않는다. 정확한 버전과 로딩 방식은 개발 시 고정한다.

**직접 실행을 위한 구현 보완:** 로컬 파일에서 `fetch('./data/dashboard.json')`가 성공한다고 가정하지 않는다. 초기 표시·Chart 데이터는 정적 HTML 또는 안전하게 직렬화한 JS에 포함해 로컬 서버 없이 실행되도록 한다. dashboard.json은 최종 Schema 보관용으로 함께 제공한다. JSON만 편집하면 화면이 자동 변경된다고 README에 안내하지 않으며 실제 반영 파일 위치를 정확히 적는다.

### 14.2 생성 코드 규칙

- semantic HTML, 읽을 수 있는 class·변수명, 컴포넌트별 section을 사용한다.
- CSS는 Variables / Base / Layout / Navigation / KPI / Charts / Tables / Utility 등으로 구분하고 테마를 CSS Custom Properties로 제공한다.
- 중복·미사용 CSS/JS, 불필요한 inline style, 디버그 console.log, 깨진 경로를 제거한다.
- JS는 Chart 초기화, 메뉴 UI, 지원하는 Table 동작과 간단한 Toggle에 한정한다.
- Preview와 Export는 동일한 디자인 토큰 및 Chart Config Generator를 사용한다.
- Chart 네 종류, Theme, Sample Data, Main Visual과 이미지가 Preview와 동일하게 표현되어야 한다.
- 파일명은 프로젝트명 기반 안전한 slug 및 날짜 등을 사용한다. 경로 문자 제거와 빈 이름 대체값을 적용한다. 예: `sales-dashboard_20260930.zip`.

### 14.3 README와 실패 처리

README는 프로젝트명·생성일, 실행 방법, PC 전용, 파일 구조, 실제 수정 위치, 샘플 데이터 안내, 외부 라이브러리/폰트/아이콘 라이선스, CDN 인터넷 필요 여부, 결과물 검토 안내를 포함한다.

ZIP 생성은 브라우저 우선을 권장한다. 생성 실패 시 확정 상태를 유지하고 재시도한다. 사용자 프로젝트의 AI Key·서버 Secret·내부 운영정보는 어떤 파일에도 포함하지 않는다. 서버 CMS, 코드 Import·재편집 기능, GitHub/Figma/프레임워크 Export는 제공하지 않는다.

## 15. Local Storage

### 15.1 저장·복원

STO-001은 프로젝트 ID·이름·생성일·수정일·Create 선택값·Schema·상태를 저장한다. STO-002는 자동 저장·최근 작업 복원을 담당한다. 선택적으로 제한된 History를 보존한다.

- Create 옵션 변경과 검증된 CMS/AI 변경을 자동 저장한다. 저장 지연 500ms~1초는 초기 권장값이다.
- ‘저장 중 / 저장됨 / 저장 실패’를 구분하고 실제 저장 성공 전에 성공으로 표시하지 않는다.
- Home에서 최근 프로젝트명·수정 시각을 표시한다. 없으면 해당 영역을 숨긴다.
- draft는 Create, generated는 Preview, editing은 CMS, finalized/exported는 Preview와 다운로드 액션으로 복원한다.
- 저장된 데이터도 로드 시 검증한다. 손상·지원하지 않는 Schema 버전은 안내하고 앱 전체를 중단시키지 않는다.
- 용량 초과·저장소 차단 시 현재 메모리의 정상 작업을 유지하고 저장 실패 및 가능한 복구 행동을 안내한다.
- 최근 프로젝트 5~10개 및 History 10~20개는 제안 범위다. 확정된 보관 수·정리 정책 없이 사용자 작업을 조용히 삭제하지 않는다.
- 재생성 백업과 최초 생성 Snapshot 복원은 전체 프로젝트 버전 관리와 구분한다.

이미지는 8절의 별도 저장 정책을 따른다. Schema의 Asset 참조만 남기고 이미지 원본이 사라지는 경우를 복원 성공으로 처리하지 않는다. 저장 형식 버전·마이그레이션·깨진 Asset 처리 방식은 Phase 1/5에서 정한다.

사용자 안내 문구:

> 작업 내용은 현재 브라우저에 저장됩니다. 브라우저 데이터를 삭제하거나 다른 기기·브라우저를 사용하면 기존 작업을 복구할 수 없습니다.

서버 프로젝트 저장, Cloud Sync, 계정 기반 복원 및 JSON Import UI는 V1에 포함하지 않는다.

## 16. 운영 정책

### 16.1 무료 사용 및 최소 운영 기능

가입 없이 무료 공개한다. CMS, Preview, Download는 횟수 제한 없이 사용하며 AI 비용 제어를 위해 신규 생성과 AI 수정을 별도로 제한한다.

| 설정 | 초기 제안 | 확정 상태 |
|---|---|---|
| AI 신규 생성 | 5회/일 | Beta 결과에 따라 조정 |
| AI 수정 | 20회/일 | Beta 결과에 따라 조정 |
| 시스템 실패 | 사용자 성공 횟수 차감 제외 | 정책 기준 |
| Auto Repair | 1회 | 초기안, 서버에서 상한 관리 |
| CMS / Preview / Download | 무제한 | V1 범위 |

브라우저 익명 식별 + IP 보조 제한을 권장하되 실제 제한은 Backend에서 집행한다. Local Storage만을 신뢰하지 않는다. 공용 IP 사용자를 고려하고 제한 초과 시 다음 사용 가능 시점을 안내한다. 리셋 시간대, 요청 동시성·속도·Timeout, 실패·복구 호출의 내부 비용 기록은 출시 전 확정한다.

운영 기능은 AI Usage, Rate Limit, Prompt 설정, 오류 로그, Maintenance Mode에 한정한다. 초기의 대규모 관리자 메뉴·Style/Component Manager는 V1 필수에서 제외한다. 별도 관리자 화면 없이도 운영 가능한 구성을 선택할 수 있고, 운영 접근·설정 변경에는 인증을 적용한다.

### 16.2 관측·운영

- 요청 종류, 시간, 성공/실패, 처리 시간, 토큰 사용량, Validation·Export 오류를 기록한다.
- Prompt·Style Preset·Component 정의·서비스 설정을 버전 관리하고 백업한다. Prompt 복원은 권장 기능이다.
- 점검 시 AI 기능을 차단하고 안내한다. 가능한 경우 기존 프로젝트 열기·CMS·다운로드는 유지한다.
- DB 없는 MVP도 가능하지만 Public V1의 다중 서버·재시작 환경에서 제한과 Usage가 일관되도록 운영 저장 방식을 결정한다.
- Alpha는 내부 품질 검증, Beta는 소수 사용자 막힘·전환 측정, Public V1은 무료 공개와 제한 운영 단계다.

## 17. 보안 정책

이 절은 대화에서 정한 제품 요구사항이며 법률 검토 완료나 특정 규정 준수를 선언하는 문서가 아니다.

| 영역 | 필수 기준 |
|---|---|
| API Key | Backend에서만 관리, 프론트 번들·로그·Export 노출 금지 |
| AI 응답 | 구조화 데이터만 허용, 파싱·Schema·업무 규칙 검사 후 적용 |
| 입력 | 텍스트 출력 escape/sanitize, 숫자·색상·URL 형식 검증 |
| 실행 코드 | eval, Script Injection, 임의 외부 요청, Cookie 탈취, 동적 외부 JS 실행 금지 |
| Export | AI Key, 서버 Secret, DB 정보, 내부 URL, 운영 로그, 관리자·식별 정보 제외 |
| 외부 의존성 | 검증한 버전 고정, 라이선스 표시 |
| 운영 접근 | 설정·로그 접근 인증, 공개 사용자 기능과 분리 |
| 악용 방지 | 서버 Rate Limit, 속도 제한, 비정상 요청 차단 |
| 로그 | 비밀정보 마스킹, Prompt 원문 장기·무기한 보관 최소화 |

URL의 허용 프로토콜, 이미지 형식·크기 검증, 업로드 Asset 처리와 텍스트 직렬화 규칙은 Phase 1/12에서 구현 명세로 고정한다. Script가 포함된 프로젝트명·메뉴명·Table 셀도 Preview와 Export에서 실행되지 않아야 한다.

이름·이메일·전화번호·회원 ID는 수집하지 않는다. 사용량·오류 분석에 필요한 정보만 최소 수집하고 IP·익명 식별 사용 여부와 보관 기간을 공개 전 확정한다. Create/AI Edit 입력에는 개인정보·비밀번호·API Key 입력 금지 안내를 둔다.

공개 전에 이용약관, 개인정보처리방침, Local Storage 안내, AI 결과물 이용 안내를 마련한다. 약관에는 서비스 목적·무료 제공·변경/중단·금지 행위·AI 결과 검토·책임 범위를, 개인정보처리방침에는 수집 항목·목적·보관 기간·AI 제공업체·쿠키/로컬 저장 사용을 반영한다.

결과물 수정·재사용·상업적 활용 허용은 기존 권장 방향이며 최종 이용정책은 미정이다. 외부 라이브러리·폰트·아이콘·사용자 업로드 이미지의 권리와 라이선스를 별도로 따른다. 생성 결과가 실제 업무 시스템 완성품이 아니라 샘플 데이터 기반 디자인·코드임을 안내한다.

## 18. 디자인 시스템

### 18.1 서비스 UI와 결과물 분리

- 서비스 UI: Light + Minimal + Professional + Blue Accent. Off White 배경, White Surface, Light Gray Border, Dark Gray Text를 기본 방향으로 한다.
- 생성 Dashboard: 사용자 선택에 따라 Modern/Minimal/Corporate/Dark를 적용한다.
- Home은 소개와 결과 예시, Create는 선택 카드, Preview는 결과물, CMS는 도구의 명료함을 우선한다.
- 서비스의 시각적 톤과 생성 대시보드의 Theme을 서로 독립 관리한다.

### 18.2 토큰과 규격

| 항목 | 기준·권장값 |
|---|---|
| Grid | 12열, 기본 gap 24px |
| Dashboard 간격 | Section 24~32px, Card Padding 20~24px |
| Sidebar | 220~260px |
| Spacing | 8px 기반, 보조 4px; 4/8/12/16/20/24/32/40/48/64/80 |
| Font | Pretendard 우선, fallback 정의 |
| Weight | 400 / 500 / 600 / 700 |
| 서비스 타이포 | Hero 42~52, Page 28~32, Section 20~24, Component 16~18, Body 14~16, Caption 12~13px |
| Dashboard 타이포 | Page 28, Section 20~22, Card 16~18, Body 14~16, Caption 12~13, KPI Value 28~36px |
| 서비스 Radius | Small 6 / Medium 8 / Large 12 / XL 16 / Pill 999px |
| Shadow | Small/Medium/Large, Editor는 Border 중심 |
| Motion | Fast 120 / Normal 180 / Slow 240ms, 로딩·패널·상태 피드백 중심 |

Color Token은 Primary·Hover·Light·Dark, Background, Surface, Surface Secondary, Text, Muted, Border, Success, Warning, Error, Info를 역할별로 관리한다. 명칭 예시는 `--color-primary`, `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`다.

Style Radius 초기 범위는 Minimal 6~8px, Modern 10~14px, Corporate 4~6px, Dark 8~12px다. 정확한 컬러 HEX, 각 Density의 수치, Main Visual 높이, Style별 타이포·Shadow 토큰은 UI 디자인에서 확정한다.

아이콘은 하나의 Line Icon Library로 통일한다. Lucide/Heroicons/Material Symbols 등은 후보이며 특정 Library는 미정이다. 버튼 Focus, Label 연결, 색 대비, 이미지 alt, Modal Focus 처리를 기본 접근성 기준으로 적용한다.

## 19. UI 컴포넌트

생성 Dashboard Library와 Builder 서비스 UI를 별도로 관리한다.

| 서비스 UI | 규칙·용도 |
|---|---|
| Button | Primary/Secondary/Ghost/Danger, S/M/L, Default/Hover/Pressed/Disabled/Loading |
| Input | Text/Textarea/Select/Checkbox/Radio/Toggle/Color/Number, Focus/Error/Disabled/Readonly |
| Selection Card | Thumbnail + 제목 + 설명 + 선택 상태; Border·Tint·Check로 구분 |
| Card | Basic / Selectable / Preview; 최근 작업·선택 옵션 |
| Modal | Title / Description / Content / Footer Action; Finalize·Download·Data·삭제 확인 |
| Drawer | 오른쪽 AI Edit, 요청·적용·변경 요약·Undo |
| Toast | 저장·적용·다운로드·오류 피드백, 위치는 디자인 단계 확정 |
| Tooltip | 아이콘 액션 및 옵션 설명 |
| Tabs / Accordion | Property 섹션 정리, 탭은 3개 이내 권장 |
| Editor Toolbar | 프로젝트명, 저장 상태, Undo, AI 수정, Preview, 확정 |
| Component Tree | 펼침/접힘, 선택, 숨김 상태, 순서 변경 |
| Property Panel | 컴포넌트별 Content/Style/Layout/Data/Visibility |
| Status Badge | Draft/Generated/Editing/Finalized/Exported 등 |
| Empty State | 빈 Table 등 내용 없음 표시; Home 최근 작업 없음은 영역 숨김 우선 |
| Loading | Button/Inline/Page Skeleton/AI Progress |
| Error | 제목, 짧은 설명, 재시도 또는 돌아가기 |

공통 상태는 Hover, Selected, Disabled, Loading, Success, Error, Warning을 포함한다. 짧은 작업은 버튼 상태, 긴 AI 생성은 단계 표시와 Skeleton을 사용한다. 입력 오류는 Inline, 저장 오류는 Toast/상태, 생성·Export 실패는 주요 복구 UI로 안내한다.

디자인·개발 이름은 역할 중심으로 맞춘다. 예: `EditorToolbar`, `ComponentTree`, `PropertyPanel`, `PreviewCanvas`, `AiDrawer`, `MainVisualEditor`.

## 20. 개발 아키텍처

### 20.1 엔진 구성

```text
Browser: Home / Create / Preview / CMS Editor
              │
        Project Store + Dashboard Schema
         ├─ Renderer → Canvas / Preview
         ├─ Patch + Validation + History
         ├─ Local Storage (+ 이미지 별도 저장)
         ├─ Finalize → Client Export → ZIP
         └─ Backend API → AI Service → Provider Adapter
                          ├─ Prompt Builder
                          ├─ Generate / Edit / Repair
                          └─ Validation / Rate Limit / Logs
```

프론트와 백은 Schema Type·Validation·Component Type·Patch Type을 공유한다. Store는 project/schema/selection/history/editorState/aiState/exportState를 구분하고 Schema를 단일 기준으로 둔다.

### 20.2 기술 방향

| 영역 | 방향 | 비고 |
|---|---|---|
| Frontend | React + TypeScript + Vite | 기존 대화의 개발 기준 |
| Routing | React Router | 권장 |
| State | Zustand 수준의 경량 Store | 구현 시 확정 |
| Validation | Zod | Front/Backend 공유 |
| Styling | CSS Modules 또는 Tailwind 계열 | 미정 |
| Backend | Node.js + TypeScript | Express/Fastify 등 API Framework 미정 |
| AI | AIService + Provider Adapter | 제공업체·모델 미정 |
| Chart | Chart.js 우선 | 정확한 버전·Export 로딩 방식 고정 필요 |
| Storage | Local Storage | 이미지 IndexedDB 검토 |
| ZIP | Client-side ZIP, JSZip 계열 후보 | Library 미정 |
| 버전 관리 | Git | Schema·Prompt·Preset 함께 관리 |
| 최종 결과 | HTML/CSS/Vanilla JS | React·npm 빌드 환경 불필요 |

이 표는 기존 기획의 기술 방향이며 최신 라이브러리 버전 검토 결과가 아니다. 실제 착수 시 호환 버전을 고정한다. V1은 로그인·SSR 중심 서비스가 아니므로 Vite 우선 방향을 유지한다.

API 역할 초안:

| API | 입력 | 출력 |
|---|---|---|
| `POST /api/ai/generate` | selections, additionalRequest | 검증된 Schema |
| `POST /api/ai/edit` | currentSchema, request | 검증된 Patch, 변경 요약 |
| `POST /api/ai/repair` | invalidSchema, validationErrors | 복구 Schema |

Repair는 내부 처리로 제한할 수 있으며 공개 호출 범위·에러 계약·Timeout은 구현 시 확정한다. 클라이언트도 Patch 적용 결과를 검증하고 정상 결과만 저장한다.

권장 코드 구조:

```text
src/
├─ app/
├─ pages/                 # Home, Create, Preview, Editor
├─ components/service-ui/
├─ dashboard/
│  ├─ components/
│  ├─ renderer/
│  ├─ editor/
│  └─ presets/
├─ ai/
├─ export/               # HTML, CSS, JS, JSON, README, ZIP
├─ store/
└─ utils/
packages/dashboard-schema/  # 공유 Type, Validation, Patch
server/                     # AI, Rate Limit, 운영 설정·로그
```

### 20.3 구현 전 결정 목록

| 결정 항목 | 현재 기준 | 결정 시점 |
|---|---|---|
| Schema/Patch 정확한 계약 | 10절 통합 초안 | Phase 1 |
| Main Visual 기본값·높이·정렬값 | OFF 초기안, S/M/L | 디자인 및 Phase 1~3 |
| 토큰·아이콘·스타일 도구 | 18~20절 방향 | 디자인/Phase 0~3 |
| 이미지 보존·한도·형식 | 업로드 + Placeholder, 별도 저장 권장 | Phase 1/5 |
| 최근 작업 수·History·마이그레이션 | 5~10개 / 10~20단계 제안 | Phase 5 |
| AI 모델·Timeout·Repair 상한 | Provider Adapter, 복구 1회 제안 | Phase 6 |
| Chart.js 버전·CDN·직접 실행 | CDN 우선 제안, file 직접 실행 필수 | Phase 2/9 |
| Table 정렬·행 추가삭제·Form | 기본 외 기능은 선택 | Phase 2/4 |
| 운영 저장소·제한 리셋·보관 기간 | 서버 집행, 최소 수집 | Phase 11/12 |
| 약관·결과물 이용정책 | 상업 활용 허용 권장, 미확정 | 공개 전 |
| 일정·담당자·측정 환경 | 인원·일정 미정 | 착수 시 |

이 목록은 V1 범위를 다시 논의하기 위한 것이 아니라, 아직 확정되지 않은 구현값을 거짓 확정하지 않기 위한 기록이다.

## 21. 개발 Phase

디자인 착수는 CMS Editor → Create → Preview/AI Edit → Home → Finalize/Download 순으로 주요 화면과 상태를 정리하고, 공통 토큰·컴포넌트를 맞춘다. 구현은 화면 순서보다 엔진 의존성을 우선한다.

| Phase | 작업 | 완료 기준 |
|---|---|---|
| 0 | 프로젝트·Routing·Store·Validation·UI Token·환경변수·포맷 설정 | Home/Create/Preview/Editor 이동 가능 |
| 1 | Project/Theme/Layout/Navigation/Main Visual/Component Schema | 샘플 JSON으로 전체 대시보드 표현·검증 |
| 2 | Component Library + Renderer + Chart Config | AI 없이 샘플 Schema 정상 렌더링 |
| 3 | Modern/Minimal/Corporate/Dark, Density·Token 연결 | Style별 명확한 차이와 일관성 |
| 4 | CMS Tree/Canvas/Property, 데이터·Main Visual 편집 | 검증된 변경 즉시 반영 |
| 5 | History, Snapshot, Local Storage, 최근 작업 | Undo 및 브라우저 재진입 복원 |
| 6 | Prompt Builder, Backend Generate, Parse/Validate/Repair | Create → 유효 Schema → Preview |
| 7 | AI Edit, Patch, 변경 요약, Undo | 요청 영역 수정, 기존 데이터 보존 |
| 8 | Preview, Finalize | 편집 UI 제거, 오류 차단·수정 이동 |
| 9 | HTML/CSS/JS/JSON/README/Asset/ZIP | 압축 해제 후 직접 실행, Preview 일치 |
| 10 | Home/Create UI 마감 | 기본값, Summary, Main Visual, GNB·Footer 완성 |
| 11 | Usage·Rate Limit·Prompt·오류·점검 모드 | 최소 운영 가능 |
| 12 | 보안·정책 | 비밀정보 보호, 입력 검증, 안내·약관 준비 |
| 13 | 기능·디자인·실패·호환성 QA | 22절 필수 기준 통과 |
| 14 | Alpha | 내부 오류·생성 품질·Export 안정화 |
| 15 | Beta | 소수 사용자 피드백·전환·오류 측정 |
| 16 | Public V1 | 가입 없는 PC 전용 무료 공개 |

첫 수직 구현 목표는 **Sample Schema → Renderer → CMS 수정 → HTML/CSS/JS 다운로드**다. Phase 9의 전체 Export 완성 전에도 최소 Export 실험을 앞당겨 구조를 검증한다. AI는 이 기반이 확인된 후 연결한다.

기간은 인원·방식 확정 후 산정한다. CMS Editor, AI Edit, Export를 주요 일정 위험 영역으로 본다. 필수 기능을 임의로 제외하지 않으며 선택 기능은 Drag & Drop·Redo·Zoom·고급 Table·Prompt History 순으로 조정할 수 있다.

## 22. QA / Acceptance Criteria

### 22.1 기능별 완료 기준

| QA ID | 화면·기능 | 통과 조건 |
|---|---|---|
| QA-001 | V1-001 Home | 핵심 설명·CTA·사용방법·Footer 동작, 1회 클릭으로 Create, 최근 작업 없으면 숨김 |
| QA-002 | GNB | SEbit이 마지막이며 정확히 http://sebit.co.kr 새창 이동 |
| QA-003 | V1-002 Create | 기본값만으로 생성, 8개 옵션과 Summary 일치, 변경 시 불필요한 AI 호출 없음 |
| QA-004 | VIS-001/002 | OFF 시 영역 제거, ON 시 상단 확보, 3종·높이·CTA·이미지 편집 반영 |
| QA-005 | GEN-001/003 | 선택값 전달, 유효 Schema만 반영, 오류 시 Repair 재검증·최종 실패 복구 |
| QA-006 | V1-003 | 진행/완료/실패 구분, 중복 요청 방지, 동일 조건 재시도 |
| QA-007 | V1-004 | 편집 Border·Handle·Property 제거, AI/CMS/재생성/확정 진입 |
| QA-008 | GEN-002 | ‘메인 차트 확대’ 시 대상 크기 변경, 무관한 Chart/Table 데이터 유지, 변경 요약 표시 |
| QA-009 | AI 실패 | 잘못된 Patch·Timeout 때 기존 Schema/Preview 유지, 재시도 가능 |
| QA-010 | EDT-001~006 | 텍스트·KPI·색·차트 종류/데이터·Table·숨김·순서·크기 변경 즉시 반영 |
| QA-011 | CMS Validation | 잘못된 HEX·음수 높이·빈 필수 Dataset·숫자 오류를 차단하고 정상값 유지 |
| QA-012 | EDT-007 | AI 수정과 CMS 최근 수정 각각 최소 1단계 Undo 후 직전 정상 Schema 복원 |
| QA-013 | STO-001/002 | 저장 성공 표시 이후 브라우저 재진입 시 조건·Schema·상태·최근 작업 복원 |
| QA-014 | 저장 실패 | 용량 초과·차단·손상 데이터에서 앱이 죽지 않고 실패 안내와 가능한 복구 제공 |
| QA-015 | EXP-001 | Schema/Component/Data/Asset 오류면 Download 차단, 해당 항목 수정 이동 |
| QA-016 | 재편집 | finalized/exported에서 editing 복귀 시 재확정 필요 |
| QA-017 | EXP-002 | 필수 파일·사용 Asset 포함, index.html 직접 실행, 별도 빌드 없음 |
| QA-018 | Export 일치 | Layout·색·타이포·위치·4종 Chart·샘플 데이터·Main Visual이 Preview와 일치 |
| QA-019 | Chart | Legend·색 Theme·데이터 수정 반영, Export에서도 동일 표시 |
| QA-020 | 보안 | 프론트·ZIP에 Key/Secret 없음, 입력 Script 실행 차단, 서버 Rate Limit 동작 |
| QA-021 | 실패 복구 | Generate/Edit/Validation/Export/Storage 오류마다 빈 화면 대신 복구 액션 |
| QA-022 | PC/브라우저 | 1280/1366/1440/1920px Chrome·Edge에서 주요 UI 겹침·접근 불가 없음 |
| QA-023 | 접근성 | Keyboard Focus, 입력 Label, 대비, alt, Modal Focus·복귀 확인 |
| QA-024 | 재생성 | 현재 작업 보호·확인·백업·이전 디자인 복귀 동작 |

### 22.2 테스트 매트릭스

- Dashboard Type 5종 × Style 4종의 20개 조합에서 생성·수정·Export 기본 흐름을 확인한다.
- Main Visual OFF/Banner/Hero/Image + Text 전부를 포함하고 Sidebar/Top, Density 3종, Color 4종, Chart 4종을 조합해 검증한다.
- Chrome/Edge 최신 안정 버전은 필수, Firefox/Safari macOS는 권장이다. 테스트 버전을 기록한다.
- 모바일·태블릿·반응형 테스트는 범위에서 제외한다. PC Canvas 내부 가로 스크롤은 설계된 동작이며 잘림과 구분한다.
- 긴 제목, 빈 Table, 잘못된 숫자·색상, 중복 ID, columnSpan 14, 미지원 Chart, Asset 누락, AI Timeout, 저장 용량 초과, ZIP 실패를 포함한다.
- ZIP은 실제 압축 해제 후 index.html을 직접 열어 검사한다. CDN 방식이면 인터넷 조건을 명시하고 리소스 로딩 실패를 별도로 확인한다.
- Preview와 Export 스크린샷에서 레이아웃·색·간격·글꼴·Chart·이미지의 인지 가능한 차이가 없어야 한다. 미세 렌더링 차이의 허용 범위는 QA 환경에서 정한다.

### 22.3 성능 목표

| 항목 | 초기 목표 |
|---|---|
| Home 초기 표시 | 3초 이내 |
| Editor 진입 | 3초 이내 |
| CMS 변경 반영 | 0.5초 이내 |
| Preview 전환 | 2초 이내 |
| ZIP 생성 | 5초 이내 |
| AI Generate | 30~60초 목표 |
| AI Edit | 10~30초 목표 |

측정 PC·네트워크·Schema 크기·Asset 용량을 정한 후 측정한다. AI 시간은 제공업체 응답에 영향을 받는 운영 목표이며 보장 시간으로 표시하지 않는다.

### 22.4 대표 E2E / Definition of Done

1. Home에서 대시보드 만들기를 누른다.
2. Analytics / Modern / Main Visual ON을 선택하고 AI로 생성한다.
3. Preview에서 대시보드와 샘플 데이터를 확인한다.
4. ‘메인 차트를 더 크게 만들어줘’로 AI 수정하고 다른 데이터 보존을 확인한다.
5. CMS에서 KPI 이름·값과 Main Visual 제목·이미지를 변경한다.
6. Preview 확인 후 Finalize 검증을 통과한다.
7. ZIP을 다운로드·압축 해제하고 Chrome/Edge에서 index.html을 직접 연다.
8. 최종 Preview와 동일한 PC 대시보드, Chart, 이미지, 샘플 데이터가 표시되는지 확인한다.

전체 필수 AC와 위 흐름이 통과해야 V1 완료로 인정한다. 반복적인 생성 깨짐, CMS 렌더 오류, AI 데이터 손실, 실행 불가능한 ZIP, 주요 브라우저의 심각한 오류, 비밀정보 노출, 빈번한 Schema 복구 실패는 출시 차단 사유다. 정량 오류율 기준은 Beta에서 확정한다.

## 23. V1 제외 기능

| 분류 | 제외 항목 |
|---|---|
| 기기 | Mobile, Tablet, Responsive 제작, Device Switch/Preview |
| 계정·저장 | 회원가입, 로그인, 프로필, Cloud Save, 서버 사용자 프로젝트 |
| 실제 데이터 | DB 연결, 사용자 API 연결, Excel 실시간 연결, 실시간 데이터, 사용자 서버 연결 |
| 조직 | 다중 사용자, 팀 협업, 사용자 권한 관리 |
| 사업화 | 결제, 구독 |
| 배포 | 생성 웹사이트 호스팅·배포, 도메인 연결 |
| Export | GitHub 자동 Push, Figma, React, Vue, Angular, Next.js, npm Build Project, Docker |
| 이미지·효과 | AI 이미지 생성, Video Hero, Slider/Carousel, Multiple Hero, 고급 Animation |
| 편집 | 자유 Pixel/Absolute 배치, HTML/CSS 직접 편집, 자유 Canvas, 복잡한 스프레드시트 편집 |
| Chart | Pie 별도 타입, Radar, Scatter, Heatmap, Gauge, Sankey 등 지원 4종 외 |
| 운영 CMS | 서비스 콘텐츠 운영 CMS, 다운로드된 결과물의 서버 CMS |

‘사용자 API 연결 제외’는 Builder Backend의 AI API 호출을 금지한다는 뜻이 아니다. ‘생성 웹사이트 배포 제외’도 Builder 서비스 자체 공개 운영을 제외한다는 뜻이 아니다. 고급 기능 중 Drag & Drop·Redo·Zoom 등은 제외 확정이 아니라 선택 후순위이며 필수 출시 기준이 아니다.

## 24. V2 확장

V2의 중심은 **회원 기반 AI Website Builder**다.

- 회원가입·로그인, 계정별 프로젝트 저장·복제·삭제·수정 및 관리.
- 일반 홈페이지 생성, Website Schema, 다중 페이지, 홈페이지 Component Library.
- 업종별 입력 기준과 템플릿: Corporate, Landing, Portfolio, Restaurant, Hospital, Education, E-Commerce UI 등.
- 생성·수정 이력 및 유료 요금제·사용량 관리.
- V1의 Schema, Renderer, Property Editor, AI Provider Adapter, Patch, Export 구조를 재사용한다.

실제 DB/API 연결, 배포, 도메인, 팀 협업, 고급 Chart, Offline Export, GitHub/Figma/프레임워크 Export는 후속 후보이며 V2 필수 약속이 아니다. 모바일·태블릿·반응형의 도입 여부도 별도 기획이 필요하다.

## 25. 용어 정의

| 용어 | 정의 |
|---|---|
| Builder 서비스 | 사용자가 생성·수정·다운로드하는 웹 도구 자체 |
| Dashboard | 서비스가 생성하는 PC용 샘플 데이터 화면 |
| Create | 제작 조건과 추가 요청 입력 화면 |
| Generate | 조건을 분석해 최초 Dashboard Schema 생성 |
| Dashboard Schema | 디자인·구조·샘플 데이터·상태를 표현하는 단일 기준 데이터 |
| Renderer | Schema를 실제 Dashboard UI로 출력하는 모듈 |
| Component Library | AI와 CMS가 사용할 수 있는 검증된 UI 부품 집합 |
| Blueprint | 유형별 정보 계층·조합 지침; 완성 템플릿과 구분 |
| Theme / Token | 색·글꼴·간격·Radius 등의 공통 디자인 값 |
| Density | 화면 정보 밀도와 간격 프리셋 |
| Main Visual | 대시보드 상단의 Banner/Hero/Image + Text 영역 |
| Preview | 편집 요소 없는 결과 확인 모드 |
| AI Edit | 현재 Schema를 자연어 요청에 따라 부분 수정 |
| Patch | 지정 대상과 허용 속성을 변경하는 구조화 작업 |
| Repair | 검증 실패 Schema를 복구하고 다시 검증하는 처리 |
| CMS Editor | 생성 대시보드의 디자인·샘플 데이터를 직접 편집하는 도구 |
| Canvas / Property Panel | 결과 표시·선택 영역 / 선택 요소 속성 편집 영역 |
| Snapshot / Undo | 정상 상태 사본 / 이전 정상 상태 복원 |
| Finalize | 현재 결과를 검증하고 다운로드 준비 상태로 확정 |
| Export | 확정 Schema를 정적 웹 소스와 리소스로 변환 |
| Local Storage | 현재 브라우저의 프로젝트 저장소; 계정·클라우드 저장 아님 |
| IndexedDB / Object URL | 이미지 Blob 영속 저장 후보 / 일시적 Blob 참조 URL |
| Acceptance Criteria | 기능을 완료로 인정하는 검증 가능한 조건 |
| P0 / P1 / P2 | 필수 출시 기능 / 권장 개선 / 후순위 개선 |

## 26. 변경 이력

### 26.1 문서 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| 1.0 | 2026-09-30 | 1~25단계 기획을 단일 Markdown으로 통합. 중복 제거, 최신 결정 우선 적용, 화면·기능·QA ID 연결, 미확정값 분리 |

과거 대화에서 예로 든 v0.1/v0.2/v0.3은 실제 발행 기록이 아니므로 문서 버전으로 소급 생성하지 않는다.

### 26.2 주요 결정 추적

| 대화 구간 | 반영된 결정 |
|---|---|
| 1단계 | 기준 선택형 AI 직접 생성, 무료·무가입, 샘플 데이터, 소스 다운로드 |
| 2단계 이후 | V1 CMS 직접 편집·Local Storage 추가 |
| PC 전용 명시 이후 | 초기 모바일·태블릿 Preview 제안 폐기 |
| SEbit 추가·순서 지정 | GNB 마지막, http://sebit.co.kr 새창 이동 |
| 6단계 이후 사용자 정정 | 복잡한 서비스 CMS 제외, 생성 Dashboard 편집과 최소 운영 기능 분리 |
| 7~8단계 | Preview → AI Edit → CMS Editor → Finalize → Download 흐름 |
| 9~12단계 | Schema 중심, Patch, 12열 Grid·Library, HTML/CSS/JS ZIP |
| 15단계 이후 Main Visual 추가 | 사용 선택, 상단 영역, 3개 유형 및 CMS/Export 반영 |
| 18~20단계 | Light 서비스 UI, 공통 토큰·컴포넌트, PC 화면 규격 |
| 21~24단계 | 상태 전이·실패 보호·재편집·아키텍처·개발 Phase·AC |
| 25단계 및 최종 요청 | V1/V2 경계, 최종 Component/Chart 범위, 단일 문서·파일명 확정 |

이후 범위·정책·Schema를 바꿀 때는 버전, 날짜, 변경 이유, 영향 화면·기능·QA ID를 기록한다. 본 문서를 디자인·구현·검수의 공통 기준으로 사용한다.
