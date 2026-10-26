import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart } from "../src/dashboard/Renderer";
import { createSample } from "../src/dashboard/samples";
import { componentSchema } from "../src/dashboard/schema";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { createExportFiles } from "../src/dashboard/export";

test("all four charts default to visible legends and preserve SVG data when hidden", () => {
  for (const chartType of ["line", "bar", "area", "donut"] as const) {
    const chart = { id: "chart-test", title: "Chart", type: "chart" as const, visible: true,
      layout: { columnSpan: 6 }, chartType, labels: ["A", "B"],
      datasets: [{ name: "Series", data: [10, 20], color: "#336699" }] };
    assert.equal(componentSchema.safeParse(chart).success, true);
    assert.equal(componentSchema.safeParse({ ...chart, showLegend: "false" }).success, false);
    const shown = renderToStaticMarkup(<Chart component={chart} />);
    const hidden = renderToStaticMarkup(<Chart component={{ ...chart, showLegend: false }} />);
    assert.match(shown, /class="db-(legend|series)"/);
    assert.doesNotMatch(hidden, /class="db-(legend|series)"/);
    assert.equal(hidden.match(/<svg[\s\S]*?<\/svg>/)?.[0], shown.match(/<svg[\s\S]*?<\/svg>/)?.[0]);
  }
});

test("AI legend patches retain datasets and export the chosen visibility", () => {
  const source = createSample();
  const target = source.sections.flatMap(s => s.components).find(c => c.type === "chart")!;
  const result = applyAiPatch(source, { operations: [{ action: "update", targetId: target.id, changes: { showLegend: false } }] });
  const changed = result.schema.sections.flatMap(s => s.components).find(c => c.id === target.id)!;
  assert.deepEqual(changed, { ...target, showLegend: false });
  assert.ok(result.summary.some(line => line.includes("범례 표시")));
  const files = createExportFiles({ ...result.schema, status: "finalized" }, "");
  const saved = JSON.parse(files["data/dashboard.json"]);
  assert.equal(saved.sections.flatMap((s: { components: { id: string; showLegend?: boolean }[] }) => s.components).find((c: { id: string }) => c.id === target.id).showLegend, false);
  const before = createExportFiles({ ...source, status: "finalized" }, "")["index.html"];
  assert.equal((files["index.html"].match(/class="db-(legend|series)"/g) ?? []).length,
    (before.match(/class="db-(legend|series)"/g) ?? []).length - 1);
});
