# AI(OpenAI) API 키 설정 가이드

저장소를 pull 받은 뒤 AI 생성·AI 수정·AI 챗봇을 실제 AI로 사용하기 위한 설정 방법입니다.

> **이 문서와 저장소에는 API 키 값을 적지 않습니다.**
> 키는 각 PC의 `backend/.env` 파일에만 저장하며, 이 파일은 `.gitignore`로 커밋에서 제외됩니다.
> 키를 커밋·채팅·공용 채널·문서·스크린샷에 남기지 마세요. 노출되면 누구나 사용해 충전 금액이 소진될 수 있습니다.

키가 없어도 실행은 됩니다. 이 경우 샘플 미리보기와 CMS 편집은 그대로 쓸 수 있고,
AI 챗봇은 기본 안내로 답하며 AI 생성·수정은 "AI 서버 설정이 필요합니다"로 안내됩니다.

## 1. 준비물

| 항목 | 내용 |
|---|---|
| Node.js | **24 이상** (백엔드 사용량 저장소가 Node 내장 SQLite를 사용) |
| API 키 | OpenAI API 키 (`sk-`로 시작). 아래 2절 참고 |
| 모델 | `gpt-6-luna` (현재 프로젝트 설정값, GPT-6 Luna) |

```cmd
node -v
```

## 2. API 키 받기

둘 중 하나를 사용합니다.

1. **프로젝트 담당자에게 받기** — 비밀번호 관리자나 1:1 메시지처럼 안전한 경로로만 전달받습니다.
   가능하면 같은 OpenAI 조직에서 **사용자별 키**를 발급받는 것을 권장합니다. 문제가 생기면 해당 키만 폐기할 수 있습니다.
2. **본인 OpenAI 계정으로 발급** — https://platform.openai.com
   1. 가입 후 **Settings → Billing → Add credit**으로 선불 크레딧을 충전합니다. ChatGPT 구독과 API 결제는 별개입니다.
   2. **Settings → API keys → Create new secret key**로 키를 만들고 바로 복사합니다. 창을 닫으면 다시 볼 수 없습니다.
   3. 비용 관리를 위해 Billing의 자동 충전(Auto recharge) 설정을 확인하고, **Settings → Usage**에서 사용량을 확인합니다.

## 3. 설치

저장소 루트(`sebitcanvers_v3`) 기준입니다. 프론트엔드와 백엔드를 **각각 한 번씩** 설치합니다.
백엔드는 프론트엔드의 계약 코드를 함께 사용하므로 두 곳 모두 설치해야 합니다.

```cmd
cd sebitcanvers_v3\frontend
npm.cmd install

cd ..\..\backend
npm.cmd install
```

## 4. `.env` 만들기

```cmd
cd backend
copy .env.example .env
notepad .env
```

기존 `.env`가 있으면 복사하지 말고 해당 줄만 수정합니다. 메모장에서 아래 두 줄을 채우고 저장합니다.
따옴표·공백 없이 입력합니다.

```
OPENAI_API_KEY=여기에_발급받은_키
OPENAI_MODEL=gpt-6-luna
```

나머지 값은 기본값을 그대로 사용합니다. 주요 항목:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `APP_ORIGIN` | `http://localhost:5173` | 브라우저 접속 주소와 정확히 같아야 함 |
| `APP_ALLOWED_ORIGINS` | 127.0.0.1:5173 등 | 추가로 허용할 접속 주소(쉼표 구분) |
| `AI_DAILY_GENERATE` / `AI_DAILY_EDIT` / `AI_DAILY_CHAT` | 3 / 10 / 50 | 사용자(브라우저)별 하루 AI 생성·수정·상담 횟수, 한국시간 자정 초기화 |
| `AI_MAINTENANCE` | `false` | `true`면 AI 호출 중단(점검 모드) |

## 5. 실행

창 두 개에서 실행합니다.

```cmd
:: 창 1 — 백엔드 (http://127.0.0.1:3001)
cd backend
npm.cmd run dev

:: 창 2 — 프론트엔드 (http://localhost:5173)
cd sebitcanvers_v3\frontend
npm.cmd run dev
```

`.env`를 수정한 뒤에는 백엔드를 **Ctrl+C로 종료 후 다시 실행**해야 반영됩니다.

## 6. 동작 확인

1. 브라우저에서 `http://localhost:5173/api/health` → `{"ready":true}`면 키·모델이 입력된 상태입니다(실제 호출 성공 여부는 아님).
2. `http://localhost:5173`에서 우측 하단 **AI 챗봇 문의**로 질문 → "AI 서버 설정 전…" 문구가 없으면 AI 답변입니다.
3. 편집 화면의 **AI 수정**에서 "첫 번째 차트를 막대 차트로 바꿔줘" 적용 → 차트가 바뀌고 AI 수정 남은 횟수가 1회 줄면 정상입니다.
4. (선택) 실제 호출 점검: `backend`에서 `npm.cmd run test:live` — 유형별 생성 4회와 수정 1회를 실제로 호출하므로 소액의 요금이 발생합니다.

## 7. 문제 해결

| 증상 | 원인·해결 |
|---|---|
| `Cannot find package 'tsx'` | `backend`에서 `npm.cmd install`을 하지 않음 |
| `.env not found. Continuing without it.` | `backend` 폴더에 `.env`가 없음 → 4절 |
| `/api/health`가 `ready: false` | `.env`의 키·모델이 비어 있거나 백엔드를 재시작하지 않음 |
| "현재 접속 주소가 서버에 허용되지 않았습니다" | `127.0.0.1`로 접속함 → `localhost:5173`으로 접속하거나 `APP_ALLOWED_ORIGINS`에 추가 후 재시작 |
| "AI 서비스에 연결하지 못했습니다" / 챗봇 "AI 답변을 받지 못해…" | 키 오류·크레딧 부족·모델 사용 권한 → Billing 잔액과 키·모델명 확인 |
| "오늘의 AI … 사용 한도에 도달" | 일일 한도 소진 → 한국시간 자정 이후 재시도 또는 `.env` 한도 조정 후 재시작 |

## 8. 키 교체·폐기

1. platform.openai.com → **Settings → API keys**에서 새 키를 만듭니다.
2. `backend\.env`의 `OPENAI_API_KEY=` 뒤만 새 키로 바꾸고 저장한 뒤 백엔드를 재시작합니다.
3. 기존 키는 **Revoke**로 폐기합니다. 충전된 크레딧은 계정에 남습니다.

키가 커밋·공유 채널 등에 노출되었다면 즉시 폐기하고 새 키를 발급하세요.
파일에서 지워도 Git 이력에는 남습니다.

## 참고 문서

- [AI 생성·CMS·Finalize](docs/GENERATION_CMS_FINALIZE.md) — 실행 절
- [AI 수정 구현](docs/AI_EDIT_IMPLEMENTATION.md) — 실제 AI 검수 재개
- [AI 챗봇](docs/AI_CHATBOT.md) — 상담 API·대체 답변·한도
- `backend/.env.example` — 전체 설정 항목
