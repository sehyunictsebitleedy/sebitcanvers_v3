import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { createSample } from "../src/dashboard/samples";
import { addButton, arrangeComponent } from "../src/dashboard/editing";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { buttonSchema, dashboardSchema } from "../src/dashboard/schema";
import { createExportZip } from "../src/dashboard/export";

test("button validates URLs, styles and prevents replacing all data with buttons", () => {
  const original = createSample();
  const before = JSON.stringify(original);
  const added = addButton(original, "button-test");
  const button = added.sections.flatMap(s => s.components).find(c => c.type === "button")!;
  assert.equal(JSON.stringify(original), before);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//example.com", "https://user:pass@example.com", "#missing"]) {
    assert.throws(() => buttonSchema.parse({ ...button, url }));
  }
  for (const variant of ["primary", "secondary", "ghost", "danger"])
    for (const size of ["small", "medium", "large"])
      assert.equal(buttonSchema.parse({ ...button, variant, size }).size, size);
  const onlyButton = { ...added, sections: [{ ...added.sections[0], components: [button] }] };
  assert.equal(dashboardSchema.safeParse(onlyButton).success, false);
  const lastData = { ...added, sections: [{ ...added.sections[0], components: [original.sections[0].components[0], button] }] };
  assert.throws(() => arrangeComponent(lastData, original.sections[0].components[0].id, "delete"));
  assert.throws(() => applyAiPatch(added, { operations: [{
    action: "update", targetId: "button-test", changes: { url: "javascript:alert(1)" },
  }] }));
});

test("button AI changes export as safe working links with an internal target", async () => {
  const added = addButton(createSample(), "button-test");
  const edited = applyAiPatch(added, { operations: [{
    action: "update", targetId: "button-test",
    changes: { label: "<script>alert(1)</script>", url: "https://example.com", variant: "secondary", size: "large" },
  }] }).schema;
  const zip = await JSZip.loadAsync(await createExportZip({ ...edited, status: "finalized" }, ""));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes('href="https://example.com"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes("db-action-secondary db-action-large"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  const internal = await JSZip.loadAsync(await createExportZip({ ...added, status: "finalized" }, ""));
  const innerHtml = await internal.file("index.html")!.async("string");
  assert.ok(innerHtml.includes('href="#dashboard-data"'));
  assert.ok(innerHtml.includes('id="dashboard-data"'));
});
