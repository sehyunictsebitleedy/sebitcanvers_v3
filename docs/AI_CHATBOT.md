# AI 챗봇 (AI 상담)

작업 브랜치: `기능/AI생성-챗봇상담추가` (기준 `main`의 `d5f0091`, 최초 작성 기준 `7dca5a1`). 이전 1차 작업(기준 `24350b2`)은
로컬 `backup/chatbot-v1-20261103/`에 보관했으며 Git 추적에서 제외했습니다.

## 개요

모든 화면(홈·만들기·이용 안내·편집)의 우측 하단 **AI 챗봇 문의** 버튼으로 AI 상담 창을 엽니다.

- 서비스 소개·사용 방법·AI 생성/수정·다운로드·저장·사용 한도·개인정보·지원 범위를 안내합니다.
- **챗봇은 대시보드를 직접 바꾸지 않습니다.** 편집 화면에서 수정을 요청하면 `AI 수정 열기` 버튼을 보여 주고,
  누르면 기존 AI 수정 창(`/api/edit`)에 요청 문장을 채워서 엽니다. 사용자가 확인 후 `AI 수정 적용`을 눌러야 반영됩니다.
  검증·Undo·사용 한도·취소는 기존 AI 수정 흐름을 그대로 사용합니다.
- OpenAI 설정이 있으면 AI가 서비스 지식만을 근거로 답하고, 설정 전·점검·한도 초과·분당 제한·AI 오류일 때는
  같은 지식으로 만든 **기본 안내 답변**으로 대신 답합니다. 기본 안내는 사용 한도를 차감하지 않습니다.

## 화면

| 요소 | 동작 |
|---|---|
| AI 챗봇 문의 | 우측 하단 고정 버튼. 열리면 `상담 닫기`로 바뀌고 Esc·X로 닫으면 버튼으로 초점 복귀 |
| 질의 가이드 | 화면별 영역·예시. 예시를 누르면 입력창에만 채움(자동 전송 안 함) |
| 바로가기 | 화면별 자주 묻는 질문 4~6개. 누르면 바로 전송 |
| 이동 버튼 | 대시보드 만들기·사용방법/예시/최근 작업 보기·서비스 안내·이용약관·개인정보처리방침·SEbit 사이트·AI 수정 열기 |
| 처리 중 | 질문 취소 가능. 창을 닫아도 진행되며 버튼에 진행 표시 |
| 실패 | 연결·시간 초과 오류 안내와 `다시 질문` |

편집 화면에서는 작업을 벗어나지 않도록 홈 이동 버튼을 숨기고, 안내·정책 페이지는 새 창으로 엽니다.
AI 처리·확정 중에는 `AI 수정 열기`를 비활성화합니다. 툴바의 `AI 수정`은 기존처럼 빈 요청으로 엽니다.

| 화면 | 질의 가이드 | 바로가기 |
|---|---|---|
| 홈·안내 | 서비스 소개, 제작 방법, 다운로드·저장, 지원 범위·정책 | 서비스 소개, 사용 방법, 무료인가요?, ZIP 실행 방법, 작업 저장 위치, 모바일 지원 (안내 페이지는 AI 전송 내용·이용 조건·문의처 중심) |
| 만들기 | 제작 방법 우선 | 옵션 설명, AI 생성 vs 샘플, AI 사용 한도, 모바일 지원 |
| 편집 | 대시보드 수정, 편집 도움말, 지원 범위 | AI 수정 방법, 되돌리기, 확정·다운로드, AI 사용 한도 |

## API

`POST /api/chat` — 입력 `{ message(1~500자), page: home|create|editor|info, history(최대 6개) }`.
출력 `{ reply, actions[], editInstruction?, source: "ai"|"guide", notice?, requestId }`.

- 계약: `sebitcanvers_v3/frontend/src/chat/contracts.ts` (프론트·백엔드 공유, Zod strict).
- 이동 버튼은 고정 목록만 허용하고 화면별로 다시 거릅니다. 임의 URL·코드·HTML은 받지 않습니다.
- 출처 검사, JSON 전용, 16KB 제한, 알 수 없는 필드 거부(400/403/413/415).
- AI 응답 형식이 틀리면 1회 복구 요청 후에도 실패 시 기본 안내로 대체합니다.
- 상담 전용 지침(`chatInstructions`)과 근거 지식(`backend/src/chat/knowledge.ts`)을 사용합니다.
  지식은 README·이용 안내·구현 문서의 현재 동작만 담습니다. 기능·정책이 바뀌면 InfoPage와 함께 갱신하세요.
- 사용 한도: `chat` 종류를 추가했습니다(기본 50회/일, IP 보조 500회, 한국시간 자정 초기화). AI 답변 성공만 차감합니다.
  분당 제한은 생성·수정과 별도(`AI_CHAT_RATE_LIMIT`, 기본 10회)이며 동시 실행 제한을 공유하지 않습니다.
- 진단 기록은 기존 형식에 `kind: "chat"`으로 남기며 질문·답변 원문은 저장하지 않습니다. `/api/usage` 응답에 `chat` 항목이 추가됐습니다.

환경변수(`backend/.env.example`): `AI_DAILY_CHAT=50`, `AI_DAILY_IP_CHAT=500`, `AI_CHAT_RATE_LIMIT=10`.
OpenAI 키·모델·출처 설정은 기존 생성·수정과 같습니다.

## 주요 코드

| 경로 | 역할 |
|---|---|
| `sebitcanvers_v3/frontend/src/chat/ChatWidget.tsx`, `chat.css` | 플로팅 버튼과 상담 창 |
| `sebitcanvers_v3/frontend/src/chat/chatGuide.ts` | 화면별 질의 가이드·바로가기·안내 문구·버튼 라벨 |
| `sebitcanvers_v3/frontend/src/chat/chatClient.ts` | `/api/chat` 호출, 70초 대기, 응답 재검증 |
| `sebitcanvers_v3/frontend/src/chat/contracts.ts` | 요청·응답 계약, 화면별 허용 버튼 |
| `App.tsx`, `dashboard/Workspace.tsx`, `dashboard/AiEditDrawer.tsx` | 화면 연결, AI 수정 창 요청 미리 채우기(`initialInstruction`) |
| `backend/src/chat/chat.ts`, `knowledge.ts` | AI 상담 호출·검증, 서비스 지식과 기본 안내 |
| `backend/src/server.ts` | `/api/chat` 경로, 대체 답변 정책, 한도·진단 기록 |
| `backend/src/usage.ts`, `runtimeSettings.ts`, `telemetry.ts`, `generate.ts` | `chat` 한도·설정·기록 종류, 상담 지침 전달 옵션 |

## 검증

```powershell
# backend (Node.js 24+)
npm.cmd run check
npm.cmd test          # 기존 26개 + 상담 6개
# sebitcanvers_v3/frontend
npm.cmd test          # 기존 57개 + 챗봇 2개
npm.cmd run build
npm.cmd run lint
npm.cmd run test:e2e
```

- 상담 테스트: 모든 가이드 예시·바로가기의 기본 안내 응답, 편집 요청 인계, 키 없는 상태, AI 응답 검증·화면별 버튼 필터·1회 복구,
  한도·분당 제한·점검·오류 시 기본 안내 대체(외부 호출 없음), 출처·형식·길이·알 수 없는 필드 거부.
- 챗봇 화면 테스트: 열기/닫기·Esc 초점 복귀, 가이드 채우기, 바로가기 전송, 이동 버튼, 실패 후 다시 질문, 처리 중 취소,
  편집 화면에서 `AI 수정 열기` → 기존 AI 수정 창에 요청이 채워지고 자동 적용되지 않음.
- Chromium e2e 최종 59개 중 58개 통과(실패 1개는 변경 전에도 같은 환경에서 실패). 중간 실행에서 `storageCleanup` 다른 탭 삭제 시나리오가 간헐 실패했으나 반복 실행에서 재현되지 않았습니다. 실제 Chrome·Edge에서 `npm.cmd run test:e2e`로 재확인해 주세요.
- 실제 OpenAI 호출로 상담 품질을 검수하지는 않았습니다. 키를 설정한 뒤 화면별 질문으로 답변 정확도와 버튼 제안을 확인해 주세요.
