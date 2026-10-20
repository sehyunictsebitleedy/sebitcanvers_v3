# 생성 API · CMS · Finalize 구현

> 2026-10-16 후속 구현: AI 수정 Patch·우측 패널·변경 요약·Undo를 연결했습니다.
> 최신 검수 상태와 사용법은 [AI 수정 문서](AI_EDIT_IMPLEMENTATION.md)를 참고하세요.

2026-10-13, 작업 브랜치 `feat/ai-generation-cms-finalize`.
최신 Create 브랜치의 `6edb415`에서 시작했습니다. CRM은 제외하며 분석·관리자·프로젝트·모니터링 4개 유형을 유지합니다.

## 실행

Node.js 22 이상을 사용합니다. 프론트엔드와 백엔드를 각각 실행합니다.
백엔드는 현재 프론트엔드의 Zod 계약과 샘플 빌더를 직접 공유하므로 두 패키지의 의존성을 모두 설치해야 합니다.

```powershell
cd sebitcanvers_v3/frontend
npm.cmd install
npm.cmd run dev
```

별도 터미널에서 저장소 루트를 기준으로 실행합니다.

```powershell
cd backend
npm.cmd install
Copy-Item .env.example .env
# .env의 OPENAI_API_KEY, OPENAI_MODEL, APP_ORIGIN을 로컬에서 설정
npm.cmd run dev
```

기존 `.env`가 있으면 복사로 덮어쓰지 않습니다. 키는 채팅, 프론트엔드 환경변수, Git에 넣지 않습니다.
`OPENAI_MODEL`에는 계정에서 사용할 수 있는 Responses API JSON mode 지원 모델명을 지정합니다.
`APP_ORIGIN`은 접속 주소와 일치해야 합니다. 기본값은 `http://localhost:5173`이며
127.0.0.1 또는 다른 포트를 사용할 때도 같은 값으로 설정합니다.
Vite가 `/api`를 `http://127.0.0.1:3001`로 프록시합니다. 배포 시에도 같은 출처의 `/api` 프록시가 필요합니다.

## AI 생성과 복구

- `POST /api/generate`: Create 옵션을 받아 `{ schema, repaired, requestId }`를 반환합니다.
- `GET /api/health`: 서버 설정 여부 `ready`를 반환합니다. 실제 제공업체 연결 성공을 의미하지 않습니다.
- OpenAI Responses API를 서버에서 호출합니다. `store: false`, JSON mode를 사용하고
  공통 Zod 계약으로 응답을 검증합니다. JSON mode 자체가 Schema 일치를 보장하지 않으므로 서버 검증을 생략하지 않습니다.
- 계약을 통과하지 못한 JSON은 오류 내용과 함께 최대 1회 Repair합니다. 최종 실패 시 정상 프로젝트를 덮어쓰지 않습니다.
- ID·프로젝트 정보·테마·밀도·Navigation 위치·선택한 Main Visual·이미지 참조는 사용자 선택을 유지합니다.
  AI는 제목·메뉴명·컴포넌트 구성과 샘플 데이터를 생성하며 선택한 컴포넌트 종류를 벗어날 수 없습니다.
- 추가 요청은 AI에 전달됩니다. 로컬 이미지는 전송하지 않고 참조 ID만 유지합니다.
- 설정 누락, 제한, 거절, 시간 초과, 최종 검증 실패는 오류 코드와 사용자 안내로 반환합니다.
- 기본 서버 제한: 요청 32KB, IP당 분당 5회, 동시 생성 2개, 전체 요청 시간 60초.
  환경변수로 제한 범위를 조절하며 `AI_MAINTENANCE=true`로 생성만 중지할 수 있습니다.
- 로그는 요청 ID·성공/실패·복구 여부·시간·오류 코드만 기록합니다. 키·프롬프트·응답 본문은 기록하지 않습니다.
- 제한기는 단일 프로세스 메모리 기준이며 재시작 시 초기화됩니다. 프록시 환경에서는 소켓 IP가 공유되므로
  공개 배포 전에 신뢰할 프록시와 공유 제한 저장소·제공업체 비용 한도를 설정해야 합니다.

API 구현 참고: [OpenAI Structured Outputs / JSON mode 공식 문서](https://developers.openai.com/api/docs/guides/structured-outputs).

## 화면 흐름

`Create → AI 생성 및 결과 검증 → Preview → CMS 편집 → 최종 검증 → ZIP 다운로드`

AI 생성과 기본 샘플 미리보기는 별도 버튼입니다. 샘플 미리보기에는 추가 요청을 반영하지 않습니다.
Generating은 현재 처리 상태와 스켈레톤을 표시하며, 임의 진행률을 표시하지 않습니다.
취소하면 네트워크 요청을 중단하고 조건 화면으로 돌아갑니다. 실패하면 재시도 또는 조건 수정을 선택합니다.
페이지 새로고침 시 이전 Create 조건을 복원하며 중단된 AI 요청을 자동 재실행하지 않습니다.

## CMS 편집 범위

- 모든 데이터 컴포넌트의 Tree/Canvas 선택, 표시 여부, 제목, 열 너비를 편집합니다.
- Tree 섹션 펼치기/접기, 같은 섹션 내 위/아래 이동, 삭제와 1단계 Undo를 지원합니다.
  마지막 표시 가능한 데이터 항목의 숨김·삭제는 차단합니다.
- KPI: 값·단위·증감. 진행률: 값·최대값. 알림: 문구·상태.
- 차트: Line/Bar/Area/Donut 전환, 라벨·수치·데이터셋 이름·색상과 항목 추가/삭제.
- 표: 컬럼명·기존 자료형에 맞춘 셀 입력, 행 추가/삭제, 빈 데이터 표시.
- 차트/표는 데이터 입력 Modal에서 적용/취소 후 속성 패널의 변경 적용으로 저장합니다.
- 전체 설정: 프로젝트명, Header, 테마 색상, Navigation 위치·로고·메뉴명, 섹션명·표시 여부.
- Main Visual: 사용 여부·유형·높이·텍스트·이미지 업로드/제거·정렬·Overlay·CTA.
- 검증 후에만 Schema에 적용하며 입력 오류 시 마지막 정상 결과를 유지합니다.
- 저장 실패는 현재 메모리 작업을 유지하고 안내하며, 저장되지 않은 상태의 페이지 종료 시 경고합니다.

현재 0.1 Schema에 없는 Activity/Summary/독립 Button 등 추가 Library, 메뉴 숨김/순서,
아이콘·차트 Legend 옵션과 AI Edit/Patch는 이 단계의 범위가 아닙니다. 전체 V1 완료를 의미하지 않습니다.

## Finalize와 Export

Schema·필수값·차트/표 데이터·이미지 참조·내부 CTA 앵커를 검사한 후 실제 렌더링과 ZIP 생성을 수행합니다.
이미지는 브라우저에서 디코딩을 확인하며 업로드 단계에서도 손상된 파일을 거부합니다.
검사를 모두 통과해야 최종 Snapshot을 `finalized`로 저장하고 다운로드 버튼을 활성화합니다.
실패하면 오류와 수정하기 버튼을 표시하며 기존 Schema를 유지합니다.

다운로드는 검사한 Snapshot과 ZIP 바이트를 사용합니다. 파일 전달 후 `exported`로 저장합니다.
편집 복귀·변경·Undo 시 확정을 해제하고 재확정을 요구합니다. 최종 ZIP의 Schema는 검사한 `finalized` 상태입니다.
ZIP에는 HTML/CSS/JS/Schema/README와 사용한 이미지가 포함됩니다. 로컬 파일에서 JSON을 fetch하지 않습니다.

## 검수

```powershell
# frontend에서
npm.cmd test
npm.cmd run build
npm.cmd run lint
npx.cmd playwright install chromium
npm.cmd run test:e2e
# backend에서
npm.cmd run check
npm.cmd test
```

프론트엔드 20개 자동 테스트와 백엔드 5개 테스트로 검증합니다.
Playwright Chromium 5개 시나리오는 1280/1440/1920px Create, 입력 복원, AI 성공/실패/취소,
CMS 데이터 편집, 이미지 업로드·누락 복구, 확정 해제, 실제 ZIP 다운로드 및 `file://` 실행을 검사합니다.
스크린샷은 프론트엔드 `test-results/`에 생성되며 Git에서 제외합니다.
AI 성공 응답과 제공업체 오류는 테스트 대역으로 검증합니다. 실제 유료 API 호출은 키·모델 설정 후 별도 확인이 필요합니다.
