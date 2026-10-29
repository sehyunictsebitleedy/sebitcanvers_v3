import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";
import { addSummary, addActivity, addButton, addStatusBadge } from "../../sebitcanvers_v3/frontend/src/dashboard/editing";
import { applyAiPatch } from "../../sebitcanvers_v3/frontend/src/dashboard/aiPatch";
import { openAIProvider } from "./generate";
import { editDashboard } from "./edit";

// Explicit paid smoke test: synthetic data only, two cases, up to one repair each.
if (existsSync(".env")) process.loadEnvFile(".env");
const key = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim();
if (!key || !model) {
  console.error("Live edit check unavailable: backend/.env configuration missing.");
  process.exitCode = 1;
} else {
  const provider = openAIProvider({ key, model });
  let source = createSample();
  source = addSummary(source, "qa-summary");
  source = addActivity(source, "qa-activity");
  source = addButton(source, "qa-button");
  source = addStatusBadge(source, "qa-badge");
  const chart = source.sections.flatMap(section => section.components).find(component => component.type === "chart")!;
  for (const name of ["new-components", "selected-chart"]) {
    const started = Date.now();
    try {
      const expected = structuredClone(source);
      for (const component of expected.sections.flatMap(section => section.components)) {
        if (name === "selected-chart" && component.id === chart.id && component.type === "chart") component.showLegend = false;
        if (name !== "new-components") continue;
        if (component.id === "qa-summary" && component.type === "summary") component.description = "검수된 운영 요약";
        if (component.id === "qa-activity" && component.type === "activity") component.items[0].title = "검수 완료";
        if (component.id === "qa-button" && component.type === "button") component.label = "상세 현황 보기";
        if (component.id === "qa-badge" && component.type === "statusBadge") component.status = "warning";
      }
      const targetId = name === "selected-chart" ? chart.id : undefined;
      const result = await editDashboard({ schema: source, baseRevision: crypto.randomUUID(), targetId,
        instruction: name === "selected-chart"
          ? "선택한 차트의 showLegend만 false로 변경하세요. 데이터와 나머지 속성은 그대로 유지하세요."
          : 'qa-summary의 description만 "검수된 운영 요약", qa-activity의 첫 항목 title만 "검수 완료", qa-button의 label만 "상세 현황 보기", qa-badge의 status만 warning으로 변경하세요. 다른 모든 내용과 데이터는 그대로 유지하세요.'
      }, provider, AbortSignal.timeout(120000));
      const actual = applyAiPatch(source, result.patch, source.project.updatedAt, targetId).schema;
      assert.deepEqual(actual, expected);
      console.info(JSON.stringify({ test: name, ok: true, repaired: result.repaired, elapsedMs: Date.now() - started }));
    } catch (error) {
      console.error(JSON.stringify({ test: name, ok: false, category: error instanceof assert.AssertionError ? "data-preservation" : "request-or-validation", elapsedMs: Date.now() - started }));
      process.exitCode = 1;
      break;
    }
  }
}
