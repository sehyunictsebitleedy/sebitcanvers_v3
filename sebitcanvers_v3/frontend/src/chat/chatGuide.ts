import type { ChatAction, ChatPage } from "./contracts";

/**
 * AI 챗봇 질의 가이드·바로가기. 모든 예시는 AI 없이도 기본 안내로 답할 수 있어야 한다
 * (backend/tests/chat.test.ts에서 검사).
 */
export type GuideGroup = { title: string; description: string; examples: string[] };
export type Shortcut = { label: string; prompt: string };

const service: GuideGroup = {
  title: "서비스 소개",
  description: "무엇을 만들 수 있는지, 비용과 이용 조건을 안내합니다.",
  examples: ["어떤 대시보드를 만들 수 있나요?", "무료로 사용할 수 있나요?", "결과물을 상업적으로 사용해도 되나요?"],
};
const howTo: GuideGroup = {
  title: "제작 방법",
  description: "시작부터 다운로드까지의 순서와 만들기 옵션을 안내합니다.",
  examples: ["사용 방법 알려줘", "만들기 화면의 옵션을 알려줘", "AI 생성과 샘플 미리보기는 뭐가 달라요?"],
};
const output: GuideGroup = {
  title: "다운로드·저장",
  description: "확정·ZIP 실행 방법과 작업 저장·복원 방식을 안내합니다.",
  examples: ["다운로드한 ZIP은 어떻게 실행하나요?", "작업은 어디에 저장되나요?"],
};
const scope: GuideGroup = {
  title: "지원 범위·정책",
  description: "모바일, 실제 데이터, AI 사용 한도와 개인정보 처리를 안내합니다.",
  examples: ["모바일에서도 사용할 수 있나요?", "실제 DB 데이터를 연결할 수 있나요?", "AI 사용 한도는 몇 번인가요?", "입력한 내용은 어디로 전송되나요?"],
};
const editing: GuideGroup = {
  title: "대시보드 수정",
  description: "수정 요청을 보내면 AI 수정 창에 채워 드립니다. 확인 후 적용하세요.",
  examples: ["첫 번째 차트를 막대 차트로 바꿔줘", "첫 번째 KPI 제목을 이번 달 실적으로 바꿔줘", "AI 수정은 어떻게 하나요?"],
};
const editorHelp: GuideGroup = {
  title: "편집 도움말",
  description: "되돌리기, 확정·다운로드, 차트 지원 범위를 안내합니다.",
  examples: ["변경을 되돌리려면 어떻게 하나요?", "다운로드한 ZIP은 어떻게 실행하나요?", "지원하는 차트 종류가 궁금해요"],
};

export const chatGuide: Record<ChatPage, GuideGroup[]> = {
  home: [service, howTo, output, scope],
  info: [service, howTo, output, scope],
  create: [howTo, service, output, scope],
  editor: [editing, editorHelp, scope],
};

export const chatShortcuts: Record<ChatPage, Shortcut[]> = {
  home: [
    { label: "서비스 소개", prompt: "어떤 대시보드를 만들 수 있나요?" },
    { label: "사용 방법", prompt: "사용 방법 알려줘" },
    { label: "무료인가요?", prompt: "무료로 사용할 수 있나요?" },
    { label: "ZIP 실행 방법", prompt: "다운로드한 ZIP은 어떻게 실행하나요?" },
    { label: "작업 저장 위치", prompt: "작업은 어디에 저장되나요?" },
    { label: "모바일 지원", prompt: "모바일에서도 사용할 수 있나요?" },
  ],
  info: [
    { label: "사용 방법", prompt: "사용 방법 알려줘" },
    { label: "AI 전송 내용", prompt: "입력한 내용은 어디로 전송되나요?" },
    { label: "결과물 이용 조건", prompt: "결과물을 상업적으로 사용해도 되나요?" },
    { label: "문의처", prompt: "담당자에게 문의하고 싶어요" },
  ],
  create: [
    { label: "옵션 설명", prompt: "만들기 화면의 옵션을 알려줘" },
    { label: "AI 생성 vs 샘플", prompt: "AI 생성과 샘플 미리보기는 뭐가 달라요?" },
    { label: "AI 사용 한도", prompt: "AI 사용 한도는 몇 번인가요?" },
    { label: "모바일 지원", prompt: "모바일에서도 사용할 수 있나요?" },
  ],
  editor: [
    { label: "AI 수정 방법", prompt: "AI 수정은 어떻게 하나요?" },
    { label: "되돌리기", prompt: "변경을 되돌리려면 어떻게 하나요?" },
    { label: "확정·다운로드", prompt: "다운로드한 ZIP은 어떻게 실행하나요?" },
    { label: "AI 사용 한도", prompt: "AI 사용 한도는 몇 번인가요?" },
  ],
};

export const chatWelcome: Record<ChatPage, string> = {
  home: "안녕하세요! SEbit Canvers AI 상담입니다. 서비스 소개, 사용 방법, 다운로드·저장, 지원 범위를 물어보세요.",
  info: "이용 안내와 정책에 대해 궁금한 점을 물어보세요. 정책은 공개 전 검토본입니다.",
  create: "제작 조건 선택을 도와드릴게요. 옵션, AI 생성과 샘플 미리보기의 차이, 사용 한도를 물어보세요.",
  editor: "편집 중 궁금한 점을 물어보세요. \"차트를 막대로 바꿔줘\"처럼 수정을 요청하면 AI 수정 창에 채워 드립니다.",
};

export const actionLabels: Record<ChatAction, string> = {
  "open-create": "대시보드 만들기",
  "open-guide": "사용방법 보기",
  "open-examples": "예시 보기",
  "open-recent": "최근 작업 보기",
  "open-service-info": "서비스 안내",
  "open-terms": "이용약관",
  "open-privacy": "개인정보처리방침",
  "open-ai-edit": "AI 수정 열기",
  "open-sebit": "SEbit 사이트",
};

export const chatNotice =
  "AI 상담 답변은 참고용이며 대시보드를 직접 바꾸지 않습니다. 질문은 서버와 AI 제공업체(OpenAI)로 전달되니 개인정보·비밀번호·API 키·회사 기밀은 입력하지 마세요.";
