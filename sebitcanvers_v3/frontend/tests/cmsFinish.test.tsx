import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { componentSchema } from "../src/dashboard/schema";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { createExportFiles } from "../src/dashboard/export";

test("height presets preserve legacy layouts and export minimum heights without clipping", () => {
  const source = createSample();
  const target = source.sections[0].components[0];
  assert.equal(componentSchema.safeParse(target).success, true);
  for (const [height, pixels] of [["small", 160], ["medium", 280], ["large", 400]] as const) {
    const result = applyAiPatch(source, { operations: [{ action: "update", targetId: target.id,
      changes: { layout: { ...target.layout, height } } }] });
    const files = createExportFiles({ ...result.schema, status: "finalized" }, "");
    assert.ok(files["index.html"].includes(`min-height:${pixels}px`));
    assert.equal(JSON.parse(files["data/dashboard.json"]).sections[0].components[0].layout.height, height);
    const resized = applyAiPatch(result.schema, { operations: [{ action: "update", targetId: target.id,
      changes: { layout: { columnSpan: 6 } } }] });
    assert.equal(resized.schema.sections[0].components[0].layout.height, height);
  }
  assert.equal(componentSchema.safeParse({ ...target, layout: { ...target.layout, height: "auto" } }).success, true);
  for (const height of [-100, 0, 300, "500px", "invalid"])
    assert.equal(componentSchema.safeParse({ ...target, layout: { ...target.layout, height } }).success, false);
});
