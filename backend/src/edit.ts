import { z } from "zod";
import {
  aiPatchSchema,
  applyAiPatch,
  editRequestSchema,
} from "../../sebitcanvers_v3/frontend/src/dashboard/aiPatch";
import { ApiError } from "./generate";
import type { Provider } from "./generate";

export async function editDashboard(
  input: unknown,
  provider: Provider,
  signal: AbortSignal,
) {
  const request = editRequestSchema.parse(input);
  if (
    request.targetId &&
    !request.schema.sections.some((s) =>
      s.components.some((c) => c.id === request.targetId),
    )
  )
    throw new ApiError(
      400,
      "INVALID_TARGET",
      "선택한 수정 대상을 찾을 수 없습니다.",
    );
  const prompt = JSON.stringify({
    task: 'Return a minimal JSON patch matching the contract. Never return a full dashboard. Preserve unrelated content and existing user data. For unsupported requests return {"unsupported":"short Korean explanation"}. Never add scripts, real data connections, mobile layouts, credentials or images. Updates merge specified fields only; arrays replace atomically. Existing component IDs and types cannot change. move.index is the zero-based position AFTER removing the item. Empty sections are removed after the full transaction. If targetId is set, only update that component. Prefer existing theme style for vague requests.',
    contract: z.toJSONSchema(aiPatchSchema),
    schema: request.schema,
    instruction: request.instruction,
    targetId: request.targetId ?? null,
  });
  let repair = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    const raw = await provider(prompt + repair, signal);
    signal.throwIfAborted();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const unsupported = z
      .strictObject({ unsupported: z.string().min(1).max(300) })
      .safeParse(parsed);
    if (unsupported.success)
      throw new ApiError(
        422,
        "UNSUPPORTED_REQUEST",
        unsupported.data.unsupported,
      );
    try {
      const patch = aiPatchSchema.parse(parsed);
      const { summary } = applyAiPatch(
        request.schema,
        patch,
        new Date().toISOString(),
        request.targetId,
      );
      return {
        patch,
        summary,
        baseRevision: request.baseRevision,
        repaired: attempt > 0,
      };
    } catch (error) {
      repair =
        "\nRepair the patch once. Validation: " +
        (error instanceof Error
          ? error.message.slice(0, 6000)
          : "Invalid patch") +
        "\nPrevious JSON: " +
        raw.slice(0, 100000);
    }
  }
  throw new ApiError(
    422,
    "EDIT_VALIDATION_FAILED",
    "수정 결과 검증과 자동 복구에 실패했습니다. 기존 작업은 유지됩니다. 요청을 구체적으로 바꿔 주세요.",
  );
}
