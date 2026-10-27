import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { createSample } from "../src/dashboard/samples";
import { deleteProject } from "../src/dashboard/deleteProject";
import { backupKey, deletedProjectKey, initialSnapshotKey, schemaStorageKey, saveProject, saveInitialSnapshot, replaceProject, loadProject } from "../src/dashboard/storage";
import { createDraftKey, defaultOptions, saveCreateDraft } from "../src/create/contracts";
import { cleanupImages, collectImageReferences } from "../src/create/cleanupImages";
import { getAsset } from "../src/create/assets";

function memory() {
  const values = new Map<string, string>();
  return { values, get length() { return values.size; }, key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
test("deletion markers block stale saves, originals, regeneration and direct restore", () => {
  const storage = memory();
  const schema = createSample();
  saveProject(storage, schema);
  deleteProject(storage, schema.project.id);
  const before = new Map(storage.values);
  assert.throws(() => saveProject(storage, schema), /삭제된 프로젝트/);
  assert.throws(() => saveInitialSnapshot(storage, schema), /삭제된 프로젝트/);
  assert.throws(() => replaceProject(storage, schema, createSample()), /삭제된 프로젝트/);
  assert.throws(() => loadProject(storage, schema.project.id), /삭제된 프로젝트/);
  assert.deepEqual(storage.values, before);
  assert.ok(storage.getItem(deletedProjectKey + schema.project.id));
});
test("image references include hidden visuals, other projects, original, backup and both create drafts", () => {
  const storage = memory();
  for (const [i, prefix] of [schemaStorageKey, initialSnapshotKey, backupKey].entries()) {
    const schema = createSample();
    schema.project.id = `project-${i}`;
    schema.mainVisual = { ...schema.mainVisual, enabled: false, imageAssetId: `image-${i}` };
    storage.setItem(prefix + schema.project.id, JSON.stringify(schema));
  }
  for (const key of [createDraftKey, `${createDraftKey}-recovery`]) {
    const options = defaultOptions();
    options.mainVisual.imageAssetId = key;
    saveCreateDraft({ setItem: (_, value) => storage.setItem(key, value) }, options);
  }
  assert.deepEqual(collectImageReferences(storage), new Set(["image-0", "image-1", "image-2", createDraftKey, `${createDraftKey}-recovery`]));
});
test("unknown references abort cleanup for corrupt schemas, create recovery and unresolved project lists", () => {
  for (const [key, raw] of [[schemaStorageKey + "bad", "{}"], [`${createDraftKey}-recovery`, "broken"], [createDraftKey, ""], ["sebit-dashboard-schema-v02:future", "{}"], ["sebit-canvers-drafts-v1", '[{"id":"missing"}]']]) {
    const storage = memory();
    storage.setItem(key, raw);
    assert.throws(() => collectImageReferences(storage), /참조를 확인하지 못해/);
  }
});
test("IDB cleanup removes only unreferenced images and leaves images intact on invalid storage", async () => {
  Object.defineProperty(globalThis, "indexedDB", { value: indexedDB, configurable: true });
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("sebit-assets-v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("images", "readwrite");
      for (const id of ["shared", "unused"]) tx.objectStore("images").put(new Blob([id]), id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => reject(tx.error);
    };
  });
  const storage = memory();
  storage.setItem(createDraftKey, "broken");
  await assert.rejects(cleanupImages(storage));
  assert.ok(await getAsset("unused"));
  storage.removeItem(createDraftKey);
  const schema = createSample();
  schema.mainVisual.imageAssetId = "shared";
  saveProject(storage, schema);
  assert.equal(await cleanupImages(storage), 1);
  assert.ok(await getAsset("shared"));
  assert.equal(await getAsset("unused"), null);
});
