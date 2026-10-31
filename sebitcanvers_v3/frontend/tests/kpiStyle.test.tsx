import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { componentSchema } from "../src/dashboard/schema";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { createExportFiles } from "../src/dashboard/export";

test("KPI styling supports old records and only accepts safe colors and known icons", () => {
  const kpi = createSample().sections.flatMap(s => s.components).find(c => c.type === "kpi")!;
  assert.equal(componentSchema.safeParse(kpi).success, true);
  for (const icon of ["none", "chart", "users", "wallet", "target", "activity"])
    assert.equal(componentSchema.safeParse({ ...kpi, color: "#12Ab90", icon }).success, true);
  assert.equal(componentSchema.safeParse({ ...kpi, color: null }).success, true);
  for (const color of ["", "red", "#abc", "url(https://example.com/image)"])
    assert.equal(componentSchema.safeParse({ ...kpi, color }).success, false);
  assert.equal(componentSchema.safeParse({ ...kpi, icon: "<script>" }).success, false);
});

test("KPI AI styling preserves data, exports inline icons, and can revert to default", () => {
  const source = createSample();
  const target = source.sections.flatMap(s => s.components).find(c => c.type === "kpi")!;
  const result = applyAiPatch(source, { operations: [{ action: "update", targetId: target.id,
    changes: { color: "#12ab90", icon: "target" } }] });
  assert.deepEqual(result.schema.sections.flatMap(s => s.components).find(c => c.id === target.id),
    { ...target, color: "#12ab90", icon: "target" });
  assert.ok(result.summary[0].includes("KPI 색상, KPI 아이콘"));
  const files = createExportFiles({ ...result.schema, status: "finalized" }, "");
  assert.match(files["index.html"], /db-kpi-icon/);
  assert.match(files["index.html"], /color:#12ab90/);
  const saved = JSON.parse(files["data/dashboard.json"]);
  assert.deepEqual(saved.sections, result.schema.sections);
  const reset = applyAiPatch(result.schema, { operations: [{ action: "update", targetId: target.id,
    changes: { color: null, icon: "none" } }] });
  const html = createExportFiles({ ...reset.schema, status: "finalized" }, "")["index.html"];
  assert.doesNotMatch(html, /db-kpi-icon|color:#12ab90/);
  const chart = source.sections.flatMap(s => s.components).find(c => c.type === "chart")!;
  assert.throws(() => applyAiPatch(source, { operations: [{ action: "update", targetId: chart.id,
    changes: { color: "#12ab90", icon: "target" } }] }));
});
