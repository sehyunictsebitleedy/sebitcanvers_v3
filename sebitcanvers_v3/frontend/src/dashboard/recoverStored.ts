import { assertProjectExists, backupKey, initialSnapshotKey, parseStoredProject, recoveryStorageKey, schemaStorageKey, StoredDataError } from "./storage";
import { editSnapshot } from "./editing";

// Caller must hold the same exclusive project lock as the editor.
export function recoverStoredProject(storage: Pick<Storage, "getItem" | "setItem">, id: string, source: "backup" | "initial") {
  assertProjectExists(storage, id);
  const current = storage.getItem(schemaStorageKey + id);
  if (current !== null) {
    try { parseStoredProject(current, id); throw new Error("현재 저장본은 정상입니다. 작업 화면의 복원 기능을 이용해 주세요."); }
    catch (error) { if (!(error instanceof StoredDataError) || error.code === "version") throw error; }
  }
  const raw = storage.getItem((source === "backup" ? backupKey : initialSnapshotKey) + id);
  if (raw === null) throw new Error("선택한 복구용 저장본이 없습니다.");
  const next = editSnapshot(parseStoredProject(raw, id), {});
  if (current !== null) {
    const preserved = storage.getItem(recoveryStorageKey + id);
    if (preserved !== null && preserved !== current) throw new Error("이전에 보관한 손상 원본이 있습니다. 원본을 내려받아 별도로 보관한 뒤 확인해 주세요. 자동으로 덮어쓰지 않습니다.");
    // Preserve exact bytes first. Quota failure must never replace current data.
    storage.setItem(recoveryStorageKey + id, current);
  }
  storage.setItem(schemaStorageKey + id, JSON.stringify(next));
  return next;
}
