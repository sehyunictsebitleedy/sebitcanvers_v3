import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { applyAiPatch } from "../src/dashboard/aiPatch";

test("patch merges allowed properties, preserves identity, data and image reference, invalidates finalization", () => {
  const source = createSample();
  source.status = "finalized";
  source.mainVisual.imageAssetId = "local-image";
  source.mainVisual.cta = {
    enabled: true,
    label: "기존 버튼",
    url: "#dashboard-data",
  };
  const first = source.sections[0].components[0];
  const result = applyAiPatch(
    source,
    {
      operations: [
        {
          action: "update",
          targetId: first.id,
          changes: { title: "새 제목", layout: { columnSpan: 6 } },
        },
        { action: "themeChange", changes: { primary: "#123456" } },
        { action: "visualChange", changes: { cta: { label: "새 버튼" } } },
      ],
    },
    "2026-10-16T00:00:00.000Z",
  );
  assert.deepEqual(result.schema.sections[0].components[0], {
    ...first,
    title: "새 제목",
    layout: { columnSpan: 6 },
  });
  assert.deepEqual(result.schema.sections.slice(1), source.sections.slice(1));
  assert.equal(result.schema.project.id, source.project.id);
  assert.equal(result.schema.project.type, source.project.type);
  assert.equal(result.schema.mainVisual.imageAssetId, "local-image");
  assert.deepEqual(result.schema.mainVisual.cta, {
    enabled: true,
    label: "새 버튼",
    url: "#dashboard-data",
  });
  assert.equal(result.schema.status, "editing");
  assert.equal(source.status, "finalized");
  assert.equal(result.summary.length, 3);
});
test("add move remove patch validates as one transaction without modifying input", () => {
  const source = createSample();
  const section = source.sections[0];
  const added = { ...section.components[0], id: "new-kpi", title: "추가 지표" };
  const result = applyAiPatch(source, {
    operations: [
      { action: "add", sectionId: section.id, component: added },
      { action: "move", targetId: "new-kpi", sectionId: section.id, index: 0 },
      { action: "remove", targetId: section.components[0].id },
    ],
  });
  assert.equal(result.schema.sections[0].components[0].id, "new-kpi");
  assert.equal(
    result.schema.sections[0].components.length,
    section.components.length,
  );
  const before = JSON.stringify(source);
  assert.throws(() =>
    applyAiPatch(source, {
      operations: [
        {
          action: "update",
          targetId: section.components[0].id,
          changes: { title: "이 변경도 취소" },
        },
        { action: "remove", targetId: "missing" },
      ],
    }),
  );
  assert.equal(JSON.stringify(source), before);
});
test("patch rejects executable fields, identity changes, scope violations and invisible dashboards", () => {
  const source = createSample();
  const id = source.sections[0].components[0].id;
  for (const changes of [
    { id: "new-id" },
    { type: "table" },
    { onclick: "alert(1)" },
    { columns: [] },
    { layout: { columnSpan: 13 } },
    { value: Infinity },
  ]) {
    assert.throws(() =>
      applyAiPatch(source, {
        operations: [{ action: "update", targetId: id, changes }],
      }),
    );
  }
  assert.throws(() =>
    applyAiPatch(source, {
      operations: [
        { action: "visualChange", changes: { imageAssetId: "foreign-image" } },
      ],
    }),
  );
  assert.throws(() =>
    applyAiPatch(source, {
      operations: [
        {
          action: "visualChange",
          changes: { cta: { url: "javascript:alert(1)" } },
        },
      ],
    }),
  );
  assert.throws(() =>
    applyAiPatch(
      source,
      {
        operations: [
          { action: "themeChange", changes: { primary: "#123456" } },
        ],
      },
      undefined,
      id,
    ),
  );
  assert.throws(() =>
    applyAiPatch(source, {
      operations: source.sections.flatMap((s) =>
        s.components.map((c) => ({ action: "remove", targetId: c.id })),
      ),
    }),
  );
  assert.throws(
    () =>
      applyAiPatch(source, {
        operations: [{ action: "themeChange", changes: {} }],
      }),
    /변경 내용/,
  );
  assert.throws(() =>
    applyAiPatch(
      source,
      JSON.parse(
        '{"operations":[{"action":"update","targetId":"' +
          id +
          '","changes":{"__proto__":{"polluted":true}}}]}',
      ),
    ),
  );
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
