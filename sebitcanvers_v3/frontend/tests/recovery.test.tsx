import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard } from "../src/create/buildDashboard";
import { defaultOptions } from "../src/create/contracts";
import { loadBackup, loadProject, replaceProject, saveProject } from "../src/dashboard/storage";

test("regeneration preserves project identity and durable previous design", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
  const first = buildDashboard(defaultOptions(), "original", "2026-01-01T00:00:00.000Z");
  const generated = buildDashboard({ ...defaultOptions(), name: "Replacement" }, "new", "2026-02-01T00:00:00.000Z");
  saveProject(storage, first);
  const next = replaceProject(storage, first, generated);
  assert.equal(next.project.id, first.project.id);
  assert.equal(next.project.createdAt, first.project.createdAt);
  assert.deepEqual(loadBackup(storage, first.project.id), first);
  assert.deepEqual(loadProject(storage, first.project.id), next);
  const restored = replaceProject(storage, next, loadBackup(storage, first.project.id)!);
  assert.deepEqual(restored.sections, first.sections);
  assert.equal(loadBackup(storage, first.project.id)?.project.name, "Replacement");
});

test("backup failure or replacement save failure preserves the current saved design", () => {
  for (const failOn of [1, 2]) {
    const values = new Map<string, string>();
    let writes = 0;
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (++writes === failOn) throw new Error("quota");
        values.set(key, value);
      } };
    const first = buildDashboard(defaultOptions(), "original", "2026-01-01T00:00:00.000Z");
    saveProject({ getItem: storage.getItem, setItem: (key, value) => { values.set(key, value); } }, first);
    assert.throws(() => replaceProject(storage, first, first), /quota/);
    assert.deepEqual(loadProject(storage, first.project.id), first);
  }
});
