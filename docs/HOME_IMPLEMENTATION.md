# Home 구현

## 실행 위치

현재 Vite 앱은 저장소 루트 기준 `sebitcanvers_v3/frontend/`에 있습니다.
루트의 빈 `frontend/` 폴더와 구분하세요. 기존 파일은 이동하지 않았습니다.

```powershell
cd sebitcanvers_v3/frontend
npm.cmd install
npm.cmd run dev
```

## 기준

- `design/DESIGN_GUIDE.md`
- `design/design_b.png`의 좌측 Home 시안
- 다크 테마, PC 최소 1280px, 기준 1440px
- GNB: Logo → 사용방법 → 대시보드 만들기 → SEbit
- SEbit 링크는 새 창으로 열며 `noopener noreferrer` 적용

## 구현 범위

- Hero 및 기간 선택이 가능한 샘플 대시보드
- 주요 기능 소개, 4개 유형 미리보기(분석·관리자·프로젝트·모니터링), 제작 과정, 최근 작업, Footer
- 사용방법 및 예시 보기 앵커 이동
- 네이티브 dialog 기반 예시 확대 및 프로젝트 시작 창 → 샘플 편집 화면
- 공통 Schema/Renderer를 사용하는 홈·유형별 미리보기
- 프로젝트 이름·유형 및 검증된 Schema를 localStorage에 저장하고 최근 작업에서 복원
- 저장 실패 안내, 키보드 포커스, Escape 닫기, 모션 감소 설정

최근 작업은 저장된 Schema를 편집 화면으로 복원합니다. 기존 이름·유형만 있는
초안은 해당 샘플로 시작합니다. 개수 제한에 따른 자동 삭제는 제거했으며
저장 실패 시 오류를 안내합니다.

KPI 편집·1단계 Undo·Preview·검증 후 ZIP 다운로드는 연결했습니다.
AI 생성·AI 수정·전체 CMS·서버 저장은 아직 미구현입니다.
자세한 범위는 [Dashboard 엔진 구현](DASHBOARD_ENGINE.md)을 참고하세요.

## 검증

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test
```

시각 QA 권장 해상도: 1280×800, 1440×900, 1920×1080.
실제 브라우저에서 확대 창, Escape 닫기, 기간 변경, 초안 저장 후 새로고침을 확인하세요.
