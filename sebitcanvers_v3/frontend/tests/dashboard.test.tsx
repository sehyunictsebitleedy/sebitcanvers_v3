import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import { createSample } from "../src/dashboard/samples";
import {
  dashboardSchema,
  updateKpi,
  validateDashboard,
} from "../src/dashboard/schema";
import { DashboardRenderer } from "../src/dashboard/Renderer";
import {
  createExportFiles,
  createExportZip,
  exportFilename,
} from "../src/dashboard/export";
import {
  loadProject,
  saveProject,
  schemaStorageKey,
} from "../src/dashboard/storage";

const css = readFileSync(
  new URL("../src/dashboard/renderer.css", import.meta.url),
  "utf8",
);
test("four sample variants validate with stable legacy type IDs", () => {
  for (const i of [0, 1, 3, 4]) {
    const sample = createSample(i);
    assert.ok(validateDashboard(sample).success);
    const html = renderToStaticMarkup(<DashboardRenderer schema={sample} />);
    assert.ok(html.includes(sample.header.title));
    assert.equal((html.match(/class="db-card db-kpi/g) ?? []).length, 4);
  }
  assert.equal(createSample(3).project.type, 'project');
  assert.equal(createSample(4).project.type, 'monitoring');
  assert.throws(() => createSample(2));
  const removed = createSample();
  assert.ok(!validateDashboard({ ...removed, project: { ...removed.project, type: 'crm' } }).success);
});
test("invalid layout, duplicate IDs and unknown executable fields are rejected", () => {
  const sample = createSample();
  sample.sections[0].components[0].layout.columnSpan = 14;
  assert.ok(!validateDashboard(sample).success);
  sample.sections[0].components[0].layout.columnSpan = 3;
  sample.sections[0].components[1].id = sample.sections[0].components[0].id;
  assert.ok(!validateDashboard(sample).success);
  assert.ok(
    !validateDashboard({ ...createSample(), script: "alert(1)" }).success,
  );
  assert.ok(
    !validateDashboard({ ...createSample(), schemaVersion: "future" }).success,
  );
});
test("chart label lengths, finite numbers and donut constraints are enforced", () => {
  const sample = createSample();
  const chart = sample.sections[1].components[0];
  assert.equal(chart.type, "chart");
  if (chart.type !== "chart") return;
  chart.datasets[0].data.pop();
  assert.ok(!validateDashboard(sample).success);
  chart.datasets[0].data.push(Infinity);
  assert.ok(!validateDashboard(sample).success);
  chart.datasets[0].data = chart.labels.map(() => 0);
  chart.chartType = "donut";
  assert.ok(!validateDashboard(sample).success);
  chart.datasets[0].data[0] = -1;
  assert.ok(!validateDashboard(sample).success);
});
test("table shape is validated, empty tables have an explicit empty state", () => {
  const sample = createSample();
  const table = sample.sections[2].components[0];
  if (table.type !== "table") throw new Error("fixture");
  table.rows[0].unknown = "extra";
  assert.ok(!validateDashboard(sample).success);
  table.rows = [];
  assert.ok(validateDashboard(sample).success);
  assert.ok(
    renderToStaticMarkup(<DashboardRenderer schema={sample} />).includes(
      "표시할 데이터가 없습니다.",
    ),
  );
  sample.sections.forEach((section) => {
    section.visible = false;
  });
  assert.ok(!validateDashboard(sample).success);
});
test("KPI changes are immutable, preserve unrelated data, invalidate finalization", () => {
  const source = createSample();
  source.status = "finalized";
  const before = structuredClone(source);
  const edited = updateKpi(source, "kpi-revenue", {
    title: "이번 달 매출",
    value: "245000",
    unit: "원",
  });
  assert.deepEqual(source, before);
  assert.equal(edited.status, "editing");
  assert.equal(edited.sections[0].components[0].title, "이번 달 매출");
  assert.deepEqual(edited.sections.slice(1), source.sections.slice(1));
  for (const value of ["", " ", "NaN", "Infinity", "1000000000001"])
    assert.throws(() =>
      updateKpi(source, "kpi-revenue", { title: "매출", value, unit: "" }),
    );
  assert.throws(() =>
    updateKpi(source, "missing", { title: "매출", value: "1", unit: "" }),
  );
});
test("all four chart variants render finite coordinates including negative and zero data", () => {
  for (const type of ["line", "bar", "area", "donut"] as const) {
    const sample = createSample();
    const chart = sample.sections[1].components[0];
    if (chart.type !== "chart") throw new Error("fixture");
    chart.chartType = type;
    chart.datasets[0].data = chart.labels.map((_, i) =>
      type === "donut" ? i : i - 3,
    );
    const html = renderToStaticMarkup(<DashboardRenderer schema={sample} />);
    assert.ok(!/NaN|Infinity/.test(html));
    assert.ok(html.includes("<svg"));
  }
});
test("navigation, Main Visual and invalid-schema fallback render deterministically", () => {
  const sample = createSample();
  sample.navigation.type = "top";
  sample.mainVisual.enabled = true;
  const html = renderToStaticMarkup(<DashboardRenderer schema={sample} />);
  assert.ok(html.includes("db-nav-top"));
  assert.ok(html.includes(sample.mainVisual.title));
  assert.ok(
    renderToStaticMarkup(<DashboardRenderer schema={{}} />).includes(
      'role="alert"',
    ),
  );
});
test("export requires finalization and safely serializes user-controlled text", () => {
  const sample = createSample();
  assert.throws(() => createExportFiles(sample, css));
  sample.status = "finalized";
  sample.project.name = "</title><script>alert(1)</script>";
  sample.header.title = "<img src=x onerror=alert(1)>";
  const files = createExportFiles(sample, css);
  assert.ok(files["index.html"].includes("&lt;img"));
  assert.ok(!files["index.html"].includes("<script>alert(1)</script>"));
  assert.ok(!files["index.html"].includes("<img src=x"));
  assert.ok(!files["index.html"].includes("db-select"));
  assert.ok(!files["js/dashboard.js"].includes("fetch("));
  assert.ok(!files["index.html"].includes("https://"));
  assert.ok(files["css/style.css"].endsWith(css));
  assert.ok(!exportFilename("../../bad:name").includes("/"));
});
test("ZIP contains executable static files and the exact edited snapshot", async () => {
  const edited = updateKpi(createSample(), "kpi-revenue", {
    title: "확정 매출",
    value: "456789",
    unit: "원",
  });
  const snapshot = dashboardSchema.parse({ ...edited, status: "finalized" });
  const zip = await JSZip.loadAsync(await createExportZip(snapshot, css));
  for (const path of [
    "index.html",
    "css/style.css",
    "js/dashboard.js",
    "data/dashboard.json",
    "README.md",
  ])
    assert.ok(zip.file(path));
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes("456,789"));
  assert.ok(html.includes("확정 매출"));
  assert.deepEqual(
    JSON.parse(await zip.file("data/dashboard.json")!.async("string")),
    snapshot,
  );
});
test("storage round trip validates loaded data and propagates quota errors", () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
  const sample = createSample();
  saveProject(storage, sample);
  assert.deepEqual(loadProject(storage, sample.project.id), sample);
  assert.equal(loadProject(storage, "unknown"), null);
  map.set(schemaStorageKey + sample.project.id, "{broken");
  assert.throws(() => loadProject(storage, sample.project.id));
  assert.throws(() =>
    saveProject(
      {
        setItem() {
          throw new Error("quota");
        },
      },
      sample,
    ),
  );
});
