# SEbit Canvers V3 - Design Guide

## 1. Design Direction

SEbit Canvers V3의 V1 디자인은 아래 방향을 기준으로 한다.

**Dark Premium SaaS + Enterprise Tool + Restrained Purple/Blue Accent**

단순한 AI 생성 서비스보다는 실제 기업 환경에서 사용할 수 있는 전문적인 웹 제작 도구의 인상을 우선한다.

### 핵심 키워드

- Professional
- Premium
- Enterprise
- AI-native
- Minimal
- Visual
- Tool-oriented

---

## 2. Reference Design

기준 시안:

`home_b.png`

해당 시안을 전체 서비스 디자인의 기본 방향으로 사용한다.

단, 시안을 그대로 복제하기보다 실제 서비스 기능과 UX에 맞춰 디자인을 지속적으로 개선한다.

---

## 3. Color Direction

### Base

- Dark Navy / Near Black Background
- Dark Surface
- Light Text
- Muted Gray Text
- Subtle Border

### Accent

Purple / Blue 계열을 사용한다.

단, Purple 색상이 화면 전체를 지배하지 않도록 한다.

Accent Color는 아래 영역 위주로 사용한다.

- Primary CTA
- Selected State
- Active Menu
- AI Status
- 핵심 Chart
- Focus State

일반 Card / Panel은 Neutral Dark 계열을 유지한다.

---

## 4. GNB

메뉴 순서는 아래와 같이 고정한다.

1. Logo
2. 사용방법
3. 대시보드 만들기
4. SEbit

`SEbit` 메뉴는 항상 가장 마지막에 배치한다.

SEbit URL:

`http://sebit.co.kr`

클릭 시 새창으로 이동한다.

개발 기준:

```html
target="_blank"
rel="noopener noreferrer"
```

---

## 5. PC Only

V1은 PC Dashboard 제작 서비스만 지원한다.

### Design 기준

- 기준 해상도: 1440px
- 최소 지원 Width: 1280px
- Desktop Only

V1에서 제외:

- Mobile
- Tablet
- Responsive Dashboard 제작
- Device Preview

---

## 6. Home

Home은 SaaS Landing Page 구조를 사용한다.

### Hero

핵심 목적:

사용자가 서비스의 역할을 즉시 이해할 수 있어야 한다.

권장 메시지 방향:

> AI로 만드는 나만의 대시보드

또는

> 원하는 기준을 선택하면 AI가 실제 사용할 수 있는 대시보드를 만들어드립니다.

### CTA

Primary:

`대시보드 만들기`

Secondary:

`예시 보기`

Primary / Secondary의 시각적 우선순위를 명확하게 구분한다.

### Dashboard Preview

Hero 영역에서 실제 생성 가능한 Dashboard 예시를 크게 노출한다.

단순 장식용 목업보다 실제 생성 결과와 유사한 UI를 사용한다.

---

## 7. Home Content Flow

Home의 주요 콘텐츠 흐름:

1. Hero
2. Dashboard Preview
3. 주요 기능
4. Dashboard 유형 예시
5. 제작 과정
6. 최근 작업
7. Footer

### 주요 기능

- AI 자동 생성
- AI 수정
- CMS Editor
- HTML / CSS / JS 다운로드

### 제작 과정

1. 조건 선택
2. AI 생성
3. 수정 및 편집
4. 다운로드

---

## 8. Create

Create 화면은 카드 선택형 UI를 사용한다.

### 입력 항목

- Dashboard Type
- Navigation
- Style
- Color
- Components
- Density
- Main Visual
- Additional Request

### Layout

좌측:
옵션 선택 영역

우측:
현재 선택 Summary

Summary Panel은 Sticky 방식 사용을 권장한다.

---

## 9. Selection Card

Create 화면에서 다음 항목은 Selection Card를 사용한다.

- Dashboard Type
- Navigation
- Style
- Main Visual

Card 구성:

- Preview Thumbnail
- Title
- Optional Description
- Selected State

Selected 상태:

- Accent Border
- Background Tint
- Check Icon

---

## 10. Main Visual

Dashboard 생성 옵션에 Main Visual을 포함한다.

### Main Visual

- OFF
- ON

ON 선택 시:

- Banner
- Hero
- Image + Text

지원 옵션:

- Height
- Title
- Description
- Background Image
- Overlay
- Alignment
- CTA

Main Visual을 사용하는 경우 AI는 Dashboard 상단에 전용 Visual 영역을 확보한다.

기본 구조:

```text
Main Visual

KPI KPI KPI KPI

Main Chart / Secondary Chart

Table / Activity
```

Dashboard 정보 영역과 Main Visual이 겹치지 않도록 한다.

---

## 11. Generating

단순 Spinner UI는 사용하지 않는다.

AI가 작업 중이라는 느낌을 제공한다.

예:

- 요청 분석
- Layout 구성
- Component 생성
- Sample Data 생성
- Style 적용
- Preview 준비

Skeleton Dashboard를 함께 노출할 수 있다.

---

## 12. Preview

Preview는 생성 결과 자체에 집중한다.

서비스 UI는 최소화한다.

상단 Toolbar만 유지한다.

### Actions

- AI 수정
- CMS Editor
- 새로 생성
- 확정

Preview에서는 편집용 Border / Property UI 등을 노출하지 않는다.

---

## 13. AI Edit

AI Edit는 일반적인 Chat UI보다 Design Assistant 형태를 우선한다.

권장 방식:

Right Drawer

구성:

- 수정 요청
- Processing
- 변경 내용 Summary
- Apply
- Undo

예:

```text
AI가 다음 항목을 수정했습니다.

- Main Chart 확대
- KPI 간격 조정
- Background Tone 변경
```

---

## 14. CMS Editor

CMS Editor는 서비스의 핵심 작업 화면이다.

### Layout

```text
Top Toolbar

Left Component Tree
Center Dashboard Canvas
Right Property Panel
```

기준 Width:

- Top Toolbar: 60px
- Left Panel: 약 240px
- Right Panel: 약 320px
- Center: Flexible

### Style

Figma / Framer 계열의 전문 Tool 느낌을 참고하되 V1에서는 훨씬 단순하게 구성한다.

Editor 자체보다 사용자가 편집하는 Dashboard가 더 강조되어야 한다.

---

## 15. Component Tree

Left Panel에서 현재 Dashboard 구조를 표시한다.

예:

```text
Dashboard

Navigation
Main Visual
Header

KPI
 ├ Revenue
 ├ Orders
 └ Users

Charts
 ├ Revenue
 └ Traffic

Table
 └ Recent Orders
```

지원:

- Select
- Show / Hide
- Sort
- Delete

---

## 16. Property Panel

선택된 Component 기준으로 우측 설정 항목이 변경된다.

공통 Section:

- Content
- Style
- Layout
- Data
- Visibility

### KPI

- Title
- Value
- Unit
- Change
- Color

### Chart

- Title
- Type
- Data
- Color
- Legend
- Size

### Main Visual

- Type
- Height
- Title
- Description
- Image
- Overlay
- Alignment
- CTA

---

## 17. App Layout

다음 화면은 일반 Website Layout이 아닌 Application Layout을 사용한다.

- Preview
- AI Edit
- CMS Editor

특징:

- Full Width
- Fixed Toolbar
- Independent Panel Scroll
- Workspace Background
- Canvas 중심

Footer는 사용하지 않는다.

---

## 18. Website Layout

다음 화면은 일반 Website Layout을 사용한다.

- Home
- Create
- Guide

특징:

- GNB
- Content Max Width
- Standard Page Scroll
- Footer

---

## 19. Typography

기본 한글 Font:

Pretendard 계열 권장

### Scale

- Hero: 42~52px
- Page Title: 28~32px
- Section: 20~24px
- Component: 16~18px
- Body: 14~16px
- Caption: 12~13px

Editor 영역은 비교적 Compact하게 유지한다.

---

## 20. Radius

권장 기준:

- Button: 8px
- Input: 8px
- Card: 10~12px
- Modal: 12~16px

과도하게 둥근 스타일은 사용하지 않는다.

Enterprise Tool 느낌을 유지한다.

---

## 21. Spacing

기본 8px System 사용.

권장:

- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48

Card Padding:

20~24px

Section Gap:

24~32px

---

## 22. Buttons

### Primary

핵심 행동:

- 대시보드 만들기
- AI로 생성
- 확정
- Download ZIP

### Secondary

- AI 수정
- CMS Editor
- Preview

### Ghost

- 뒤로가기
- 취소
- 닫기

### Danger

- 삭제
- 초기화

---

## 23. Icons

한 종류의 Icon Library만 사용한다.

권장:

Lucide Icons

Style:

- Line
- Clean
- Minimal

---

## 24. Motion

Motion은 제한적으로 사용한다.

사용 영역:

- Hover
- Drawer Open / Close
- Modal
- AI Loading
- Toast
- Selected State

Transition:

약 150~250ms

과도한 Animation은 사용하지 않는다.

---

## 25. Dashboard Design Principle

AI가 생성하는 Dashboard는 서비스 UI와 디자인 체계를 분리한다.

### Service UI

Dark Premium SaaS

### Generated Dashboard

사용자가 선택:

- Modern
- Minimal
- Corporate
- Dark

Main Visual 사용 여부 및 Color 역시 사용자가 선택한다.

---

## 26. UI Priority

UI 설계 시 우선순위:

1. 정보 가독성
2. 기능 이해
3. 편집 편의성
4. 디자인 완성도
5. Motion / Decoration

디자인을 위해 사용성을 희생하지 않는다.

---

## 27. Reference Principle

`home_b.png`는 디자인 방향을 잡기 위한 기준 시안이다.

구현 과정에서:

- 실제 기능
- 화면 정보량
- Editor UX
- Dashboard Renderer 결과

에 따라 세부 UI는 변경할 수 있다.

최종 디자인은 기능 구현 이후 실제 화면을 기준으로 한 번 더 다듬는다.
