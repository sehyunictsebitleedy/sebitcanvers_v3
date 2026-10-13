import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard } from "../src/create/buildDashboard";
import { defaultOptions } from "../src/create/contracts";
import {
  arrangeComponent,
  editSnapshot,
  replaceComponent,
} from "../src/dashboard/editing";
import { validateFinalization } from "../src/dashboard/finalize";

const sample = () =>
  buildDashboard(
    {
      ...defaultOptions(),
      components: ["kpi", "chart", "table", "progress", "notification"],
    },
    "test-editor",
    new Date().toISOString(),
  );
test("CMS edits every data type, validates constraints and invalidates finalization", () => {
  const source = sample();
  source.status = "finalized";
  for (const component of source.sections.flatMap((s) => s.components)) {
    const result = replaceComponent(source, {
      ...component,
      title: "수정한 제목",
    });
    assert.equal(result.status, "editing");
    assert.equal(
      result.sections
        .flatMap((s) => s.components)
        .find((c) => c.id === component.id)?.title,
      "수정한 제목",
    );
  }
  assert.equal(source.status, "finalized");
  const progress = source.sections
    .flatMap((s) => s.components)
    .find((c) => c.type === "progress")!;
  assert.throws(() =>
    replaceComponent(source, {
      ...progress,
      type: "progress",
      value: 101,
      max: 100,
    }),
  );
  assert.throws(() =>
    editSnapshot(source, { theme: { ...source.theme, primary: "red" } }),
  );
  assert.throws(() =>
    editSnapshot(source, {
      mainVisual: {
        ...source.mainVisual,
        cta: { enabled: true, label: "실행", url: "javascript:alert(1)" },
      },
    }),
  );
});
test("tree reorder and deletion preserve identity, last visible component cannot be hidden or deleted", () => {
  const source = sample();
  const first = source.sections[0].components[0];
  const moved = arrangeComponent(source, first.id, "down");
  assert.equal(moved.sections[0].components[1].id, first.id);
  const one = buildDashboard(
    { ...defaultOptions(), components: ["progress"] },
    "one",
    new Date().toISOString(),
  );
  const item = one.sections[0].components[0];
  assert.throws(() => arrangeComponent(one, item.id, "delete"));
  assert.throws(() => replaceComponent(one, { ...item, visible: false }));
});
test("Finalize reports missing assets and unknown internal anchors without mutating status", async () => {
  const source = sample();
  source.mainVisual.enabled = true;
  source.mainVisual.imageAssetId = "missing";
  const result = await validateFinalization(source, async () => undefined);
  assert.equal(result.issues[0].target, "visual");
  assert.equal(source.status, "generated");
  source.mainVisual.imageAssetId = null;
  source.mainVisual.cta = { enabled: true, label: "이동", url: "#unknown" };
  assert.equal((await validateFinalization(source)).issues.length, 1);
  source.mainVisual.cta.url = "#dashboard-data";
  assert.equal((await validateFinalization(source)).issues.length, 0);
});
