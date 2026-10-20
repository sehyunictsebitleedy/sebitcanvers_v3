import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createSample } from "../src/dashboard/samples";
import { addActivity } from "../src/dashboard/editing";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { activityItemsSchema } from "../src/dashboard/schema";
import { createExportZip } from "../src/dashboard/export";

test("activity validates bounds, safe icons and preserves the source on invalid patches", () => {
  const original = createSample();
  const before = JSON.stringify(original);
  const added = addActivity(original, "activity-test");
  assert.equal(JSON.stringify(original), before);
  assert.equal(added.status, "editing");
  const item = { title: "검토", description: "", timestamp: "오늘", icon: "check" };
  assert.throws(() => activityItemsSchema.parse(Array(21).fill(item)));
  for (const invalid of [{ title: " " }, { timestamp: "" }, { description: "a".repeat(501) }, { icon: "<svg>" }]) {
    assert.throws(() => activityItemsSchema.parse([{ ...item, ...invalid }]));
  }
  const snapshot = JSON.stringify(added);
  assert.throws(() => applyAiPatch(added, { operations: [{
    action: "update", targetId: "activity-test", changes: { items: [{ ...item, icon: "script" }] },
  }] }));
  assert.equal(JSON.stringify(added), snapshot);
  assert.throws(() => addActivity(original, original.project.id));
});

test("activity AI edits and empty state render into the exported ZIP safely", async () => {
  const added = addActivity(createSample(), "activity-test");
  const items = [{ title: "<script>alert(1)</script>", description: "작업 완료\n다음 단계",
    timestamp: "오늘 09:00", icon: "check" }];
  const edited = applyAiPatch(added, { operations: [{
    action: "update", targetId: "activity-test", changes: { items },
  }] }).schema;
  const zip = await JSZip.loadAsync(await createExportZip({ ...edited, status: "finalized" }, ""));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("오늘 09:00"));
  const exported = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
  assert.deepEqual(exported.sections, edited.sections);
  const empty = applyAiPatch(edited, { operations: [{
    action: "update", targetId: "activity-test", changes: { items: [] },
  }] }).schema;
  const emptyZip = await JSZip.loadAsync(await createExportZip({ ...empty, status: "finalized" }, ""));
  assert.ok((await emptyZip.file("index.html")!.async("string")).includes("표시할 활동이 없습니다."));
});
