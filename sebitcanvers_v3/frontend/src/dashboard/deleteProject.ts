import { backupKey, deletedProjectKey, draftsStorageKey, initialSnapshotKey, schemaStorageKey } from "./storage";

type ProjectStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Read the latest list, including unsupported legacy records, before changing it.
// Images are deliberately retained: other projects and open editors may share them.
export function deleteProject(storage: ProjectStorage, id: string) {
  if (!id) throw new Error("삭제할 프로젝트를 확인할 수 없습니다.");
  const keys = [deletedProjectKey + id, draftsStorageKey, schemaStorageKey + id, initialSnapshotKey + id, backupKey + id];
  const before = keys.map(key => [key, storage.getItem(key)] as const);
  let list: unknown;
  try {
    list = JSON.parse(before[1][1] ?? "[]");
  } catch {
    throw new Error("프로젝트 목록이 손상되어 삭제하지 않았습니다.");
  }
  if (!Array.isArray(list)) throw new Error("프로젝트 목록이 손상되어 삭제하지 않았습니다.");
  const next = list.filter(item => !item || typeof item !== "object" || item.id !== id);
  const changed: (readonly [string, string | null])[] = [];
  try {
    // Mark first to reject stale editors and late async results. Roll back last.
    storage.setItem(keys[0], "deleted");
    changed.push(before[0]);
    storage.setItem(draftsStorageKey, JSON.stringify(next));
    changed.push(before[1]);
    for (const entry of before.slice(2)) {
      storage.removeItem(entry[0]);
      changed.push(entry);
    }
  } catch {
    let recovered = true;
    for (const [key, value] of changed.reverse()) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        recovered = false;
      }
    }
    throw new Error(recovered
      ? "삭제하지 못했습니다. 기존 저장 데이터를 복원했습니다. 브라우저 저장 설정을 확인해 주세요."
      : "삭제 중 저장소 오류가 발생했고 일부 데이터를 복원하지 못했습니다. 다른 작업을 멈추고 브라우저 저장 설정을 확인해 주세요.");
  }
}
