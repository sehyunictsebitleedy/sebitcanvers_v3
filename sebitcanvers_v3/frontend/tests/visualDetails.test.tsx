import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard } from "../src/create/buildDashboard";
import { defaultOptions } from "../src/create/contracts";
import { createExportFiles } from "../src/dashboard/export";

test("project task presentation exports the original editable data with team initials and real counts", () => {
  const schema = buildDashboard(defaultOptions(3), "visual-project", "2026-11-04T00:00:00.000Z");
  const files = createExportFiles({...schema, status:"finalized"}, "");
  assert.match(files["index.html"], /db-task-list/);
  assert.match(files["index.html"], /db-avatar/);
  assert.match(files["index.html"], /요구사항 정리/);
  assert.deepEqual(JSON.parse(files["data/dashboard.json"]).sections, schema.sections);
  const table = schema.sections[0].components[0];
  assert.equal(table.type, "table");
  if (table.type !== "table") return;
  table.rows = [];
  const empty = createExportFiles({...schema, status:"finalized"}, "")["index.html"];
  assert.match(empty, /표시할 업무가 없습니다/);
});

test("status decorations require a status column and known value; unknown values remain literal", () => {
  const schema = buildDashboard(defaultOptions(1), "visual-admin", "2026-11-04T00:00:00.000Z");
  const table = schema.sections[0].components[0];
  assert.equal(table.type, "table");
  if (table.type !== "table") return;
  table.rows = [{team:"정상",role:"멤버",members:1,status:"검토 필요"}];
  let html = createExportFiles({...schema,status:"finalized"}, "")["index.html"];
  assert.doesNotMatch(html, /db-cell-success/);
  assert.match(html, /검토 필요/);
  table.rows[0].status = "정상";
  html = createExportFiles({...schema,status:"finalized"}, "")["index.html"];
  assert.match(html, /db-cell-success/);
  assert.match(html, /db-cell-role/);
  assert.match(html, /db-kpi-icon/);
});
