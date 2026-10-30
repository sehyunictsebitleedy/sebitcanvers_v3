import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { recoverStoredProject } from "../src/dashboard/recoverStored";
import { schemaStorageKey, backupKey, recoveryStorageKey, loadProject, storageFailureMessage } from "../src/dashboard/storage";

function fixture() {
  const schema = createSample();
  const values = new Map([[schemaStorageKey + schema.project.id, "{broken"], [backupKey + schema.project.id, JSON.stringify(schema)]]);
  return { schema, values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
test("recovery preserves raw corruption, backup and project identity, then requires finalization", () => {
  const store = fixture();
  const result = recoverStoredProject(store, store.schema.project.id, "backup");
  assert.equal(result.project.id, store.schema.project.id);
  assert.equal(result.status, "editing");
  assert.deepEqual(result.sections, store.schema.sections);
  assert.equal(store.getItem(recoveryStorageKey + result.project.id), "{broken");
  assert.equal(store.getItem(backupKey + result.project.id), JSON.stringify(store.schema));
  assert.deepEqual(loadProject(store, result.project.id), result);
});
test("unsupported versions, valid current data and invalid backups are never overwritten", () => {
  for (const scenario of ["future", "valid", "bad-backup", "previous-original"]) {
    const store = fixture();
    if (scenario === "future") store.setItem(schemaStorageKey + store.schema.project.id, JSON.stringify({ ...store.schema, schemaVersion: "9.0" }));
    if (scenario === "valid") store.setItem(schemaStorageKey + store.schema.project.id, JSON.stringify(store.schema));
    if (scenario === "bad-backup") store.setItem(backupKey + store.schema.project.id, "bad");
    if (scenario === "previous-original") store.setItem(recoveryStorageKey + store.schema.project.id, "older raw data");
    const before = new Map(store.values);
    assert.throws(() => recoverStoredProject(store, store.schema.project.id, "backup"));
    assert.deepEqual(store.values, before);
  }
});
test("quota errors before preservation or during restore retain the damaged current data and backup", () => {
  for (const failOn of [1, 2]) {
    const store = fixture(); let calls = 0;
    assert.throws(() => recoverStoredProject({ getItem: store.getItem, setItem: (key, value) => {
      if (++calls === failOn) throw new DOMException("quota", "QuotaExceededError");
      store.setItem(key, value);
    } }, store.schema.project.id, "backup"));
    assert.equal(store.getItem(schemaStorageKey + store.schema.project.id), "{broken");
    assert.equal(store.getItem(backupKey + store.schema.project.id), JSON.stringify(store.schema));
  }
  assert.match(storageFailureMessage(new DOMException("quota", "QuotaExceededError")), /저장 공간/);
  assert.match(storageFailureMessage(new DOMException("blocked", "SecurityError")), /접근을 차단/);
});
