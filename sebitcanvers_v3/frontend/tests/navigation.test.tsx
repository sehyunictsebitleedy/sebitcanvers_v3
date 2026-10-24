import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSample } from "../src/dashboard/samples";
import { dashboardSchema } from "../src/dashboard/schema";
import { applyAiPatch } from "../src/dashboard/aiPatch";
import { DashboardRenderer } from "../src/dashboard/Renderer";
import { createExportZip } from "../src/dashboard/export";
import JSZip from "jszip";

test("legacy menus stay unchanged and invalid or fully hidden menu patches are rejected atomically", () => {
  const original = createSample();
  const before = JSON.stringify(original);
  assert.deepEqual(dashboardSchema.parse(original).navigation, original.navigation);
  for (const patch of [{ icon: "script" }, { visible: "false" }]) {
    assert.throws(() => dashboardSchema.parse({ ...original, navigation: { ...original.navigation,
      items: original.navigation.items.map(item => ({ ...item, ...patch })) } }));
  }
  assert.throws(() => applyAiPatch(original, { operations: [{ action: "navigationChange",
    changes: { items: original.navigation.items.map(item => ({ ...item, visible: false })) } }] }));
  assert.equal(JSON.stringify(original), before);
});

test("menu patch preserves identity, renders only visible menus and exports inline icons", async () => {
  const original = createSample();
  const items = original.navigation.items.map((item, i) => ({ ...item,
    label: i === 0 ? "HIDDEN-MENU" : `menu-${i}`, visible: i !== 0, icon: "folder" }));
  items.reverse();
  items[0].label = "<script>alert(1)</script>";
  const edited = applyAiPatch(original, { operations: [{ action: "navigationChange", changes: { items, type: "top" } }] }).schema;
  assert.deepEqual(edited.sections, original.sections);
  assert.deepEqual(edited.navigation.items.map(item => item.id), items.map(item => item.id));
  for (const type of ["sidebar", "top"] as const) {
    const html = renderToStaticMarkup(<DashboardRenderer schema={{ ...edited, navigation: { ...edited.navigation, type } }} />);
    assert.ok(!html.includes("HIDDEN-MENU"));
    assert.ok(html.includes("db-menu-icon"));
    assert.ok(html.includes('class="active"'));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>alert(1)</script>"));
  }
  const zip = await JSZip.loadAsync(await createExportZip({ ...edited, status: "finalized" }, ""));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes("db-menu-icon"));
  assert.ok(!html.includes("HIDDEN-MENU"));
  const saved = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
  assert.deepEqual(saved.navigation, edited.navigation);
});
