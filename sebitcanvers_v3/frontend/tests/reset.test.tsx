import test from "node:test";
import assert from "node:assert/strict";
import { createSample } from "../src/dashboard/samples";
import { editSnapshot } from "../src/dashboard/editing";
import { resetProject } from "../src/dashboard/reset";
import { initialSnapshotKey, loadInitialSnapshot, saveInitialSnapshot, loadBackup, loadProject, saveProject, replaceProject } from "../src/dashboard/storage";

function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}
test("reset cannot save a late image result after its editor releases ownership", async () => {
  const storage = memory();
  const original = createSample();
  original.mainVisual = { ...original.mainVisual, enabled: true, imageAssetId: "delayed-image" };
  saveInitialSnapshot(storage, original);
  saveProject(storage, original);
  const before = new Map(storage.values);
  let owns = true;
  await assert.rejects(resetProject(storage, original, async () => {
    owns = false;
    return new Blob(["image"], { type: "image/png" });
  }, () => owns), /편집 권한/);
  assert.deepEqual(storage.values, before);
});
test("reset retains the immutable creation snapshot through edits and regeneration, and backs up current work", async () => {
  const storage = memory();
  const original = createSample();
  saveInitialSnapshot(storage, original);
  const edited = editSnapshot(original, { header: { ...original.header, title: "Edited" } });
  saveInitialSnapshot(storage, edited);
  saveProject(storage, edited);
  const regenerated = replaceProject(storage, edited, createSample(3));
  const reset = await resetProject(storage, regenerated);
  assert.deepEqual(loadInitialSnapshot(storage, original.project.id), original);
  assert.deepEqual(reset.header, original.header);
  assert.deepEqual(reset.sections, original.sections);
  assert.equal(reset.status, "editing");
  assert.equal(reset.project.id, original.project.id);
  assert.equal(reset.project.createdAt, original.project.createdAt);
  assert.deepEqual(loadBackup(storage, original.project.id), regenerated);
  assert.deepEqual(loadProject(storage, original.project.id), reset);
});
test("missing, corrupt, mismatched originals and missing images never replace current work", async () => {
  for (const kind of ["missing", "corrupt", "mismatch", "image"]) {
    const storage = memory();
    const original = createSample();
    if (kind === "image") original.mainVisual = { ...original.mainVisual, enabled: true, imageAssetId: "lost-image" };
    if (kind !== "missing") saveInitialSnapshot(storage, original);
    if (kind === "corrupt") storage.setItem(initialSnapshotKey + original.project.id, "broken");
    if (kind === "mismatch") storage.setItem(initialSnapshotKey + original.project.id,
      JSON.stringify({ ...original, project: { ...original.project, id: "another-project" } }));
    saveProject(storage, original);
    const before = [...storage.values];
    await assert.rejects(resetProject(storage, original, async () => null));
    assert.deepEqual([...storage.values], before);
  }
});
test("backup or current-save quota failures keep current project and creation snapshot", async () => {
  for (const failOn of [1, 2]) {
    const storage = memory();
    const original = createSample();
    saveInitialSnapshot(storage, original);
    const current = editSnapshot(original, { header: { ...original.header, title: "Keep me" } });
    saveProject(storage, current);
    let writes = 0;
    await assert.rejects(resetProject({ getItem: storage.getItem, setItem: (key, value) => {
      if (++writes === failOn) throw new Error("quota");
      storage.setItem(key, value);
    } }, current));
    assert.deepEqual(loadProject(storage, original.project.id), current);
    assert.deepEqual(loadInitialSnapshot(storage, original.project.id), original);
  }
});
