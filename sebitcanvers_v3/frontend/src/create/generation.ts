import { dashboardSchema } from "../dashboard/schema";
import type { CreateOptions } from "./contracts";

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
    throw new Error(
      "생성 서버에 연결하지 못했습니다. 서버 실행 상태를 확인하거나 다시 시도해 주세요.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "생성 서버 응답이 올바르지 않습니다. 서버 연결을 확인해 주세요.",
    );
  }
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "생성에 실패했습니다. 다시 시도해 주세요.",
    );
  const parsed = dashboardSchema.safeParse(result.schema);
  if (!parsed.success)
    throw new Error("생성 결과를 검증하지 못했습니다. 입력 조건은 유지됩니다.");
  return parsed.data;
}
