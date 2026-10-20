import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { addSummary } from "../src/dashboard/editing";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { componentSchema } from "../src/dashboard/schema";
import { createExportZip } from "../src/dashboard/export";
import JSZip from "jszip";

test("summary supports atomic add/edit and safe ZIP export without mutating the source", async () => {
  const original = createSample();
  const source = JSON.stringify(original);
  const added = addSummary(original, "summary-test");
  const item = added.sections.flatMap(s => s.components).find(c => c.id === "summary-test")!;
  assert.equal(item.type, "summary");
  assert.equal(added.status, "editing");
  assert.equal(JSON.stringify(original), source);
  assert.throws(() => componentSchema.parse({ ...item, displayValue: " " }));
  assert.throws(() => componentSchema.parse({ ...item, description: "x".repeat(501) }));
  const patch = { operations: [{ action: "update", targetId: item.id,
    changes: { displayValue: "42건", description: "<script>alert(1)</script>" } }] };
  const result = applyAiPatch(added, patch);
  const updated = result.schema;
  const zip = await JSZip.loadAsync(await createExportZip({ ...updated, status: "finalized" }, ""));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes("42건"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  const exported = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
  assert.deepEqual(exported.sections, updated.sections);
  assert.throws(() => applyAiPatch(added, { operations: [{
    action: "update", targetId: original.sections[0].components[0].id,
    changes: { displayValue: "잘못된 타입 속성" },
  }] }));
});

test("summary addition rejects full sections and duplicate IDs", () => {
  const original = createSample();
  assert.throws(() => addSummary(original, original.project.id));
  const section = original.sections[0];
  original.sections = [{ ...section, components: Array.from({ length: 20 }, (_, i) => ({
    ...section.components[0], id: `full-${i}`,
  })) }];
  assert.throws(() => addSummary(original, "new-summary"), /여유 공간/);
});
