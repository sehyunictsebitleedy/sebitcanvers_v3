import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createSample } from "../src/dashboard/samples";
import { addStatusBadge } from "../src/dashboard/editing";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { componentSchema } from "../src/dashboard/schema";
import { createExportZip } from "../src/dashboard/export";

test("status badge validates states and text while preserving existing data", () => {
  const original = createSample();
  const before = JSON.stringify(original);
  const added = addStatusBadge(original, "badge-test");
  assert.equal(JSON.stringify(original), before);
  assert.equal(added.status, "editing");
  const badge = added.sections.flatMap(s => s.components).find(c => c.id === "badge-test")!;
  for (const status of ["info", "success", "warning", "error"])
    assert.equal(componentSchema.parse({ ...badge, status }).type, "statusBadge");
  for (const invalid of [{ label: " " }, { label: "x".repeat(121) }, { status: "unknown" }])
    assert.throws(() => componentSchema.parse({ ...badge, ...invalid }));
  const updated = applyAiPatch(added, { operations: [{ action: "update", targetId: badge.id,
    changes: { label: "검토 필요", status: "warning" } }] }).schema;
  assert.deepEqual(updated.sections[0].components[0], original.sections[0].components[0]);
  assert.equal(updated.sections.flatMap(s => s.components).find(c => c.id === badge.id)?.type, "statusBadge");
  assert.throws(() => addStatusBadge(original, original.project.id));
  assert.throws(() => applyAiPatch(added, { operations: [{ action: "update", targetId: badge.id,
    changes: { url: "https://example.com" } }] }));
});

test("status badge is safely exported with both state text and label", async () => {
  const added = addStatusBadge(createSample(), "badge-test");
  const edited = applyAiPatch(added, { operations: [{ action: "update", targetId: "badge-test",
    changes: { label: "<script>alert(1)</script>", status: "error" } }] }).schema;
  const zip = await JSZip.loadAsync(await createExportZip({ ...edited, status: "finalized" }, ""));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes("db-status-badge-error"));
  assert.ok(html.includes("오류"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  const exported = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
  assert.deepEqual(exported.sections, edited.sections);
});
