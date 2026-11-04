import { chatResponseSchema, sanitizeAnswer } from "./contracts";
import type { ChatPage, ChatResponse, ChatTurn } from "./contracts";

export type ChatClient = (
  input: { message: string; page: ChatPage; history: ChatTurn[] },
  signal: AbortSignal,
) => Promise<ChatResponse>;

/** 서버는 기본 안내로 대체 답변을 하므로 AI 대기(최대 60초)보다 조금 길게 기다린다. */
const timeoutMs = 70000;

/**
 * POST /api/chat. 응답 형식을 다시 검증하고 현재 화면에서 쓸 수 없는 버튼을 제거한다.
 * 실패 메시지는 사용자에게 그대로 보여 줄 수 있는 문장으로 던진다.
 */
export const fetchChat: ChatClient = async (input, signal) => {
  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch {
    if (signal.aborted) throw new Error("질문을 취소했습니다.");
    if (timeout.aborted) throw new Error("답변 시간이 초과되었습니다. 잠시 후 다시 질문해 주세요.");
    throw new Error("상담 서버에 연결하지 못했습니다. 백엔드 실행 상태를 확인한 뒤 다시 질문해 주세요.");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "";
    throw new Error(message || "상담 요청을 처리하지 못했습니다. 다시 질문해 주세요.");
  }
  const parsed = chatResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("상담 서버 응답이 올바르지 않습니다. 다시 질문해 주세요.");
  return { ...parsed.data, ...sanitizeAnswer(parsed.data, input.page) };
};
