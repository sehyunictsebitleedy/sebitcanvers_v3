import type { ChatAction, ChatAnswer, ChatPage } from "../../../sebitcanvers_v3/frontend/src/chat/contracts";

/**
 * AI 상담 지식. README·이용 안내(InfoPage)·구현 문서에 적힌 현재 동작만 담는다.
 * 1) AI 상담 Prompt의 근거 자료, 2) AI를 쓸 수 없을 때의 기본 안내 답변에 함께 사용한다.
 * 기능·정책이 바뀌면 이 파일과 InfoPage를 함께 갱신한다.
 */
export type KnowledgeEntry = {
  id: string;
  title: string;
  /** 기본 안내 모드의 질문 매칭. 구체적인 항목을 앞에 둔다. */
  pattern: RegExp;
  answer: string;
  actions: ChatAction[];
};

export const knowledge: KnowledgeEntry[] = [
  {
    id: "master-cms",
    title: "마스터 CMS와 게시",
    pattern: /마스터|관리자\s*(로그인|계정|화면)|서버\s*(저장|초안)|게시|퍼블리시/,
    answer: "마스터 한 명이 /admin에서 로그인해 대시보드 하나를 관리합니다. 기존 시안을 가져오고 편집한 뒤 '서버 초안 저장'으로 저장하고, 미리보기 확인 후 게시하세요. 방문자는 /dashboard에서 게시본만 볼 수 있으며 직전 게시본 복원을 지원합니다. 초안 저장만으로 공개 화면은 바뀌지 않습니다. 마스터 편집은 브라우저 자동 저장이 아니므로 서버 저장 버튼을 눌러야 합니다. ZIP에는 관리자 기능이 포함되지 않습니다. 비밀번호는 상담창에 입력하지 마세요.",
    actions: ["open-service-info"],
  },
  {
    id: "mobile",
    title: "모바일·반응형 지원",
    pattern: /모바일|태블릿|반응형|휴대폰|스마트폰|아이패드/,
    answer: "V1은 PC 전용입니다. 1280px 이상 PC 화면(기준 1440px)에 맞춰 만들며, 모바일·태블릿·반응형 제작과 기기별 미리보기는 지원하지 않습니다.",
    actions: ["open-service-info"],
  },
  {
    id: "real-data",
    title: "실제 데이터 연결",
    pattern: /실제\s*데이터|데이터베이스|\bDB\b|API\s*(연결|연동)|엑셀|실시간|우리\s*(회사\s*)?데이터|연동/i,
    answer: "샘플 데이터로 대시보드 디자인과 정적 소스를 만드는 도구입니다. 실제 DB·API·엑셀 연결과 실시간 데이터는 지원하지 않습니다. 다운로드한 HTML에서 샘플 수치를 직접 바꿔 활용할 수 있습니다.",
    actions: ["open-service-info"],
  },
  {
    id: "privacy",
    title: "개인정보와 AI 전송",
    pattern: /개인정보|보안|비밀번호|API\s*Key|키\s*노출|수집|쿠키|OpenAI|학습|전송/i,
    answer: "회원가입이 없어 이름·이메일·전화번호 입력란은 없습니다. 다만 AI 생성·수정·상담 시 입력 내용이 서버와 OpenAI API로 전달되고, 사용 한도 관리를 위해 sebit_ai 쿠키와 변환된 IP를 사용합니다. 개인정보·비밀번호·API 키·회사 기밀은 입력하지 마세요. 자세한 내용은 개인정보처리방침(공개 전 검토본)을 확인해 주세요.",
    actions: ["open-privacy"],
  },
  {
    id: "limits",
    title: "AI 사용 한도",
    pattern: /한도|횟수|몇\s*번|제한|남은|초기화\s*시간|자정/,
    answer: "AI 생성과 AI 수정은 별도의 일일 한도가 있으며(기본 생성 3회, 수정 10회) 생성·수정 화면에서 남은 횟수를 확인할 수 있습니다. 검증에 성공한 요청만 차감하고, 진행 중인 요청은 임시 반영됩니다. 한국시간 자정에 초기화됩니다.",
    actions: ["open-service-info"],
  },
  {
    id: "price",
    title: "비용·회원가입",
    pattern: /무료|가격|요금|유료|결제|비용|돈|가입|회원|로그인|계정/,
    answer: "일반 대시보드 제작은 회원가입·로그인 없이 무료로 제공합니다. 미리보기·직접 편집·다운로드는 횟수 제한이 없고, AI 생성·수정·상담에는 별도 일일 한도가 적용됩니다. 서버 초안 저장과 게시 관리는 별도의 단일 마스터 로그인이 필요합니다.",
    actions: ["open-create", "open-service-info"],
  },
  {
    id: "license",
    title: "결과물 이용 조건",
    pattern: /상업|저작권|라이선스|재배포|판매|회사에서\s*써|사용해도|이용\s*조건/,
    answer: "생성 결과물의 수정·재배포·상업적 이용을 허용합니다. 사용자 업로드 이미지와 외부 라이브러리·아이콘의 권리와 라이선스는 별도로 지켜야 합니다. AI가 만든 수치·문구·링크는 사용 전에 정확성과 권리 침해 여부를 검토해 주세요.",
    actions: ["open-terms", "open-service-info"],
  },
  {
    id: "undo",
    title: "되돌리기·초기화",
    pattern: /되돌|실행\s*취소|undo|이전\s*디자인|원래대로|초기화|재생성/i,
    answer: "편집 화면 상단의 '실행 취소'로 직전 AI/CMS 변경 1단계를 되돌릴 수 있습니다. 일반 프로젝트는 '재생성', '이전 디자인 복원', '최초 생성 상태로 초기화'를 지원합니다. 마스터 편집에서는 이 기능들을 제공하지 않으며, 관리 화면에서 직전 게시본을 복원할 수 있습니다. 게시본 복원은 편집 중인 초안을 바꾸지 않습니다.",
    actions: [],
  },
  {
    id: "download",
    title: "확정과 ZIP 다운로드",
    pattern: /다운로드|다운|zip|압축|실행|index\.html|내려\s*받|소스|파일\s*구성|결과물|확정/i,
    answer: "편집 화면의 '확정 및 다운로드'를 누르면 구조·필수값·차트/표 데이터·이미지를 검증한 뒤 ZIP을 만듭니다. 압축을 풀고 index.html을 PC 브라우저에서 바로 열면 되며 npm 설치나 빌드는 필요 없습니다. 내용은 HTML, 디자인은 CSS에서 수정하세요. JSON은 기록용이라 JSON만 바꿔도 화면이 바뀌지 않습니다. 확정 후 다시 편집하면 재확정해야 합니다.",
    actions: ["open-service-info"],
  },
  {
    id: "storage",
    title: "작업 저장과 복원",
    pattern: /저장|최근\s*작업|복원|불러|이어서|사라|날아|백업|삭제|지우/,
    answer: "일반 프로젝트와 제작 조건은 현재 브라우저의 Local Storage에, 이미지는 IndexedDB에 자동 저장됩니다. 같은 브라우저에서 홈의 '최근 작업'으로 다시 엽니다. 일반 프로젝트의 기기 간 자동 동기화는 없습니다. 별도로 마스터 관리에서 가져온 시안은 '서버 초안 저장'으로 이미지와 함께 서버에 저장하고 게시할 수 있습니다. 필요한 결과는 ZIP으로 내려받아 두세요.",
    actions: ["open-recent", "open-service-info"],
  },
  {
    id: "ai-edit",
    title: "AI 수정 사용법",
    pattern: /AI\s*수정|수정\s*방법|편집\s*방법|어떻게\s*(바꾸|수정|편집)|무엇을\s*(바꿀|수정)|직접\s*편집|CMS/i,
    answer: "편집 화면에서 'AI 수정'을 열고 \"첫 번째 차트를 막대 차트로 바꾸고 너비를 12열로 넓혀줘\"처럼 요청하면, 서버와 브라우저에서 검증한 변경만 한 번에 적용하고 변경 요약을 보여 줍니다. 제목·샘플 데이터·색상·간격·컴포넌트 추가/삭제/이동을 지원하며, 이미지 변경과 세부 값은 왼쪽 컴포넌트 목록과 오른쪽 속성 패널(CMS)에서 직접 편집합니다.",
    actions: ["open-create"],
  },
  {
    id: "create",
    title: "만들기 화면과 옵션",
    pattern: /옵션|조건|스타일|색상\s*선택|밀도|메인\s*비주얼|main\s*visual|추가\s*요청|샘플\s*미리보기|AI\s*생성|만들기\s*화면/i,
    answer: "'대시보드 만들기'에서 유형(분석·관리자·프로젝트·모니터링), 내비게이션(사이드바·상단), 스타일(Modern·Minimal·Corporate·Dark), 색상, 구성요소(KPI·차트·표·진행률·알림), 밀도, 메인 비주얼, 추가 요청(최대 500자)을 고릅니다. 기본값만으로도 만들 수 있습니다. 'AI 대시보드 생성'은 추가 요청을 반영해 AI가 내용을 구성하고, '샘플 미리보기 만들기'는 AI 없이 선택 조건대로 바로 만듭니다.",
    actions: ["open-create"],
  },
  {
    id: "chart",
    title: "지원 차트",
    pattern: /차트\s*(종류|지원|어떤)|어떤\s*차트|그래프\s*종류|파이|레이더/,
    answer: "선(Line)·막대(Bar)·영역(Area)·도넛(Donut) 4종을 지원합니다. 파이·레이더·히트맵 등 다른 차트는 지원하지 않습니다.",
    actions: ["open-examples"],
  },
  {
    id: "types",
    title: "만들 수 있는 대시보드",
    pattern: /유형|종류|템플릿|어떤\s*대시보드|무엇을\s*만들|뭘\s*만들|만들\s*수\s*있|무슨\s*서비스|어떤\s*서비스|소개/,
    answer: "분석·관리자·프로젝트·모니터링 4가지 유형의 PC용 대시보드를 샘플 데이터로 만드는 도구입니다. AI가 초안을 만들고, AI 수정과 CMS 편집으로 다듬은 뒤 HTML/CSS/JavaScript ZIP으로 내려받습니다. 홈의 '예시 보기'에서 유형별 결과를 미리 볼 수 있습니다.",
    actions: ["open-examples", "open-create"],
  },
  {
    id: "how",
    title: "사용 순서",
    pattern: /사용\s*방법|사용법|이용\s*방법|어떻게\s*(시작|만들|사용|이용)|순서|과정|시작하|처음/,
    answer: "① '대시보드 만들기'에서 제작 조건을 고릅니다. ② AI 생성 또는 샘플 미리보기로 초안을 만듭니다. ③ AI 수정이나 CMS 편집으로 다듬습니다. ④ '확정 및 다운로드'로 검증 후 ZIP을 받습니다.",
    actions: ["open-create", "open-guide"],
  },
  {
    id: "contact",
    title: "문의처",
    pattern: /상담원|사람|담당자|문의처|연락|전화|이메일|메일|회사|운영사|SEbit|세빛|세현/i,
    answer: "운영사는 세현아이씨티입니다. 문의: asset.manager@sehyunict.com / 070-4047-8955. 자세한 정보는 SEbit 사이트와 이용약관의 운영자 정보를 확인해 주세요.",
    actions: ["open-sebit", "open-terms"],
  },
  {
    id: "greeting",
    title: "인사",
    pattern: /^(안녕|하이|헬로|반가|hello|hi\b)/i,
    answer: "안녕하세요! SEbit Canvers AI 상담입니다. 서비스 소개, 사용 방법, AI 생성·수정, 다운로드·저장, 지원 범위를 물어보세요.",
    actions: ["open-guide"],
  },
];

const editIntent = /(바꿔|바꾸|변경|수정해|크게|작게|넓혀|좁혀|늘려|줄여|추가해|넣어|삭제해|빼|없애|숨겨|보여|옮겨|이동|올려|내려|색|제목을)/;
const question = /(\?|까요|나요|인가요|있어|있나|알려|뭐|무엇|어떻게|왜)/;

export const guideFallback =
  "정확한 답을 찾지 못했어요. 서비스 소개, 사용 방법, AI 생성·수정, 다운로드·저장, 사용 한도, 개인정보, 지원 범위를 물어보시면 안내해 드릴게요.";

/** AI 없이 만드는 기본 안내 답변. 편집 화면의 수정 요청은 AI 수정 창으로 넘긴다. */
export function guideAnswer(message: string, page: ChatPage): ChatAnswer {
  const text = message.trim();
  const entry = knowledge.find((item) => item.pattern.test(text));
  if (entry?.id === "master-cms") return { reply: entry.answer, actions: entry.actions };
  if (page === "editor" && editIntent.test(text) && !question.test(text))
    return {
      reply: "대시보드 수정 요청으로 보여요. 'AI 수정 열기'를 누르면 이 요청을 AI 수정 창에 채워 둘게요. 내용을 확인한 뒤 'AI 수정 적용'을 눌러 주세요.",
      actions: ["open-ai-edit"],
      editInstruction: text.slice(0, 1000),
    };
  if (entry) return { reply: entry.answer, actions: entry.actions };
  return { reply: guideFallback, actions: ["open-guide", "open-service-info"] };
}

/** AI Prompt용 근거 자료. */
export function knowledgeText() {
  return knowledge.filter((item) => item.id !== "greeting").map((item) => `- ${item.title}: ${item.answer}`).join("\n");
}
