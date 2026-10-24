import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { dashboardSchema } from "../src/dashboard/schema";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { createExportFiles } from "../src/dashboard/export";
import { loadProject, saveProject } from "../src/dashboard/storage";

test("header date is optional for legacy projects and validates real calendar dates", () => {
  const original = createSample();
  assert.deepEqual(dashboardSchema.parse(original).header, original.header);
  for (const value of ["", "2026-02-29", "2026-04-31", "2026-13-01", "<script>", "2026-01-01T00:00:00Z"])
    assert.throws(() => dashboardSchema.parse({ ...original,
      header: { ...original.header, date: { visible: true, value } } }));
  assert.ok(dashboardSchema.safeParse({ ...original,
    header: { ...original.header, date: { visible: true, value: "2028-02-29" } } }).success);
});

test("AI date patch preserves content and saved/exported dates are deterministic", () => {
  const source = createSample();
  const result = applyAiPatch(source, { operations: [{ action: "headerChange",
    changes: { date: { visible: true, value: "2028-02-29" } } }] });
  assert.deepEqual(result.schema.sections, source.sections);
  assert.equal(result.schema.header.title, source.header.title);
  assert.equal(source.header.date, undefined);
  const values = new Map<string, string>();
  const storage = { setItem: (key: string, value: string) => { values.set(key, value); }, getItem: (key: string) => values.get(key) ?? null };
  saveProject(storage, result.schema);
  const restored = loadProject(storage, source.project.id)!;
  const files = createExportFiles({ ...restored, status: "finalized" }, "");
  assert.match(files["index.html"], /datetime="2028-02-29"/i);
  assert.ok(files["index.html"].includes("2028.02.29"));
  const hidden = applyAiPatch(restored, { operations: [{ action: "headerChange",
    changes: { date: { visible: false, value: "2028-02-29" } } }] }).schema;
  assert.ok(!createExportFiles({ ...hidden, status: "finalized" }, "")["index.html"].includes("<time"));
  assert.equal(hidden.header.date?.value, "2028-02-29");
});
