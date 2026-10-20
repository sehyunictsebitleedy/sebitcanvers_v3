import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";
import { applyAiPatch } from "../../sebitcanvers_v3/frontend/src/dashboard/aiPatch";
import { generate, openAIProvider } from "./generate";
import { editDashboard } from "./edit";

if (existsSync(".env")) process.loadEnvFile(".env");
const key = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim();
if (!key || !model) {
  console.error(
    "실제 AI 검수 대기: backend/.env의 OPENAI_API_KEY와 OPENAI_MODEL을 설정해 주세요.",
  );
  process.exitCode = 1;
} else {
  const provider = openAIProvider({ key, model });
  try {
    for (const type of [0, 1, 3, 4]) {
      const options = defaultOptions(type);
      options.name = "AI 실호출 검수";
      options.additionalRequest =
        "프로젝트 운영 현황을 한국어 샘플 데이터로 구성해 주세요.";
      const result = await generate(
        options,
        provider,
        AbortSignal.timeout(120000),
      );
      console.info(
        JSON.stringify({
          test: "generate",
          type,
          ok: true,
          repaired: result.repaired,
        }),
      );
      if (type === 0) {
        const target = result.schema.sections.flatMap((s) => s.components)[0];
        const edited = await editDashboard(
          {
            schema: result.schema,
            baseRevision: randomUUID(),
            targetId: target.id,
            instruction:
              '선택한 컴포넌트 제목만 "AI 수정 검수 완료"로 변경해 주세요.',
          },
          provider,
          AbortSignal.timeout(120000),
        );
        const applied = applyAiPatch(
          result.schema,
          edited.patch,
          undefined,
          target.id,
        );
        if (
          applied.schema.sections
            .flatMap((s) => s.components)
            .find((c) => c.id === target.id)?.title !== "AI 수정 검수 완료"
        )
          throw new Error("요청한 제목 변경이 반영되지 않았습니다.");
        console.info(
          JSON.stringify({ test: "edit", ok: true, repaired: edited.repaired }),
        );
      }
    }
  } catch {
    console.error(
      "실제 AI 검수 실패: 서버 설정·모델 권한·요청 한도 또는 응답 형식을 확인해 주세요.",
    );
    process.exitCode = 1;
  }
}
