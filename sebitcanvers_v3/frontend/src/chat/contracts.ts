import { z } from "zod";

/**
 * AI 상담(챗봇) 계약. 프론트엔드와 backend/src/chat이 함께 사용한다.
 * 상담은 대시보드를 직접 바꾸지 않는다. 수정 요청은 기존 AI 수정 창(/api/edit)으로 넘긴다.
 */

/** 챗봇이 열린 화면. 화면마다 허용 이동 버튼과 안내가 다르다. */
export const chatPages = ["home", "create", "editor", "info"] as const;
export type ChatPage = (typeof chatPages)[number];

/** 답변에 붙는 이동 버튼. 화면이 아는 고정 동작만 허용한다(임의 URL·코드 금지). */
export const chatActions = [
  "open-create",
  "open-guide",
  "open-examples",
  "open-recent",
  "open-service-info",
  "open-terms",
  "open-privacy",
  "open-ai-edit",
  "open-sebit",
] as const;
export type ChatAction = (typeof chatActions)[number];

/** 편집 화면에서는 작업을 벗어나는 이동 대신 AI 수정·안내(새 창)만 허용한다. */
const pageActions: Record<ChatPage, readonly ChatAction[]> = {
  home: ["open-create", "open-guide", "open-examples", "open-recent", "open-service-info", "open-terms", "open-privacy", "open-sebit"],
  create: ["open-guide", "open-examples", "open-recent", "open-service-info", "open-terms", "open-privacy", "open-sebit"],
  info: ["open-create", "open-guide", "open-examples", "open-recent", "open-service-info", "open-terms", "open-privacy", "open-sebit"],
  editor: ["open-ai-edit", "open-service-info", "open-terms", "open-privacy", "open-sebit"],
};
export function allowedActions(page: ChatPage) {
  return pageActions[page];
}

export const chatMessageLimit = 500;

export const chatTurnSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(1000),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const chatRequestSchema = z.strictObject({
  message: z
    .string()
    .trim()
    .min(1, "질문을 입력해 주세요.")
    .max(chatMessageLimit, `질문은 ${chatMessageLimit}자 이내로 입력해 주세요.`),
  page: z.enum(chatPages),
  history: z.array(chatTurnSchema).max(6).default([]),
});
export type ChatRequest = z.input<typeof chatRequestSchema>;

/** AI(또는 기본 안내)가 만드는 답변 본문. AI 응답은 이 형식만 허용한다. */
export const chatAnswerSchema = z.strictObject({
  reply: z.string().trim().min(1).max(800),
  actions: z.array(z.enum(chatActions)).max(3).default([]),
  /** 편집 화면에서 AI 수정 창에 미리 채울 요청. */
  editInstruction: z.string().trim().min(1).max(1000).optional(),
});
export type ChatAnswer = z.infer<typeof chatAnswerSchema>;

export const chatResponseSchema = z.strictObject({
  reply: chatAnswerSchema.shape.reply,
  actions: z.array(z.enum(chatActions)).max(3),
  editInstruction: chatAnswerSchema.shape.editInstruction,
  /** ai: AI 답변, guide: 기본 안내(키 미설정·한도·오류 시 대체 답변) */
  source: z.enum(["ai", "guide"]),
  notice: z.string().max(200).optional(),
  requestId: z.string().max(80),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

/** 화면에서 실행할 수 없는 버튼과 근거 없는 수정 버튼을 제거한다(서버·브라우저 공통). */
export function sanitizeAnswer(answer: ChatAnswer, page: ChatPage): ChatAnswer {
  const allowed = allowedActions(page);
  const requested =
    page === "editor" && answer.editInstruction && !answer.actions.includes("open-ai-edit")
      ? ["open-ai-edit" as const, ...answer.actions]
      : answer.actions;
  const actions = [...new Set(requested)].slice(0, 3).filter(
    (action) => allowed.includes(action) && (action !== "open-ai-edit" || !!answer.editInstruction),
  );
  return {
    reply: answer.reply,
    actions,
    ...(actions.includes("open-ai-edit") && answer.editInstruction ? { editInstruction: answer.editInstruction } : {}),
  };
}
