import test from "node:test";
import assert from "node:assert/strict";
import { deleteProject } from "../src/dashboard/deleteProject";
import { backupKey, draftsStorageKey, initialSnapshotKey, schemaStorageKey } from "../src/dashboard/storage";

function memory() {
  const values = new Map<string, string>([
    [draftsStorageKey, JSON.stringify([{ id: "target" }, { id: "legacy", type: 2 }, { id: "new-project" }])],
    [schemaStorageKey + "target", "damaged current"],
    [initialSnapshotKey + "target", "original"],
    [backupKey + "target", "backup"],
    [schemaStorageKey + "legacy", "keep"],
    ["sebit-create-options-v1", "keep options"],
  ]);
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
test("deletion removes only the requested records, including damaged schemas, and preserves latest/legacy list entries", () => {
  const storage = memory();
  deleteProject(storage, "target");
  assert.deepEqual(JSON.parse(storage.getItem(draftsStorageKey)!), [{ id: "legacy", type: 2 }, { id: "new-project" }]);
  for (const prefix of [schemaStorageKey, initialSnapshotKey, backupKey]) assert.equal(storage.getItem(prefix + "target"), null);
  assert.equal(storage.getItem(schemaStorageKey + "legacy"), "keep");
  assert.equal(storage.getItem("sebit-create-options-v1"), "keep options");
  const after = new Map(storage.values);
  deleteProject(storage, "target");
  assert.deepEqual(storage.values, after);
});
test("corrupt lists, blocked reads and quota failures do not remove stored projects", () => {
  for (const raw of ["invalid", "{}", "null"]) {
    const storage = memory();
    storage.setItem(draftsStorageKey, raw);
    const before = new Map(storage.values);
    assert.throws(() => deleteProject(storage, "target"));
    assert.deepEqual(storage.values, before);
  }
  for (const method of ["getItem", "setItem"] as const) {
    const storage = memory();
    const before = new Map(storage.values);
    assert.throws(() => deleteProject({ ...storage, [method]: () => { throw new Error("blocked"); } }, "target"));
    assert.deepEqual(storage.values, before);
  }
});
test("partial removal failures roll back exact raw records, and rollback failures are reported explicitly", () => {
  for (const failOn of [1, 2, 3]) {
    const storage = memory();
    const before = new Map(storage.values);
    let removes = 0;
    assert.throws(() => deleteProject({ ...storage, removeItem: key => {
      if (++removes === failOn) throw new Error("blocked");
      storage.removeItem(key);
    } }, "target"), /복원했습니다/);
    assert.deepEqual(storage.values, before);
  }
  const storage = memory();
  let writes = 0;
  assert.throws(() => deleteProject({ ...storage, setItem: (key, value) => {
    if (++writes > 1) throw new Error("blocked rollback");
    storage.setItem(key, value);
  }, removeItem: () => { throw new Error("blocked delete"); } }, "target"), /일부 데이터를 복원하지 못했습니다/);
});
