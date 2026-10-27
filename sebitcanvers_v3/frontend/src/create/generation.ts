import { dashboardSchema } from "../dashboard/schema";
import type { CreateOptions } from "./contracts";
export const generationTimeoutMs = 125000;
export class GenerationError extends Error {
  readonly kind: "connection" | "timeout" | "response" | "server";
  constructor(kind: GenerationError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function generateDashboard(
  options: CreateOptions,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new GenerationError("connection",
      "생성 서버에 연결하지 못했습니다. 서버 실행 상태를 확인하거나 다시 시도해 주세요.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    if (signal.aborted) throw signal.reason;
    throw new GenerationError("response",
      "생성 서버 응답이 올바르지 않습니다. 서버 연결을 확인해 주세요.",
    );
  }
  if (!response.ok) {
    if (result?.code === "TIMEOUT" || result?.code === "REQUEST_TIMEOUT" || response.status === 504)
      throw new GenerationError("timeout", "서버의 생성 대기 시간이 초과되었습니다. 선택 조건은 유지됩니다. 잠시 후 다시 시도해 주세요.");
    throw new GenerationError("server",
      typeof result?.error === "string"
        ? result.error
        : "생성에 실패했습니다. 다시 시도해 주세요.",
    );
  }
  const parsed = dashboardSchema.safeParse(result?.schema);
  if (!parsed.success)
    throw new GenerationError("response", "생성 결과를 검증하지 못했습니다. 입력 조건은 유지됩니다.");
  return parsed.data;
}
