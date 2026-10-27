import { dashboardSchema } from "../dashboard/schema";
import { backupKey, deletedProjectKey, draftsStorageKey, initialSnapshotKey, schemaStorageKey } from "../dashboard/storage";
import { createDraftKey, readCreateDraft } from "./contracts";
import { removeUnusedAssets } from "./assets";

export function collectImageReferences(storage: Pick<Storage, "length" | "key" | "getItem">) {
  const references = new Set<string>();
  const collect = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "imageAssetId" && typeof child === "string") references.add(child);
      else collect(child);
    }
  };
  const prefixes = [schemaStorageKey, initialSnapshotKey, backupKey];
  try {
    const list: unknown = JSON.parse(storage.getItem(draftsStorageKey) ?? "[]");
    if (!Array.isArray(list)) throw new Error("Invalid list");
    for (const item of list) {
      if (!item || typeof item.id !== "string") throw new Error("Invalid project");
      if (storage.getItem(deletedProjectKey + item.id) === null && storage.getItem(schemaStorageKey + item.id) === null)
        throw new Error("Unresolved project");
    }
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      const prefix = prefixes.find(prefix => key.startsWith(prefix));
      if (prefix) {
        const schema = dashboardSchema.parse(JSON.parse(storage.getItem(key)!));
        if (schema.project.id !== key.slice(prefix.length)) throw new Error("Mismatched project");
        collect(schema);
      } else if (key === createDraftKey || key === `${createDraftKey}-recovery`) {
        const draft = readCreateDraft({ getItem: () => storage.getItem(key) });
        if (!draft) throw new Error("Invalid draft");
        collect(draft);
      } else if ((key.startsWith("sebit-dashboard-") && !key.startsWith(deletedProjectKey)) || key.startsWith("sebit-create-options-")) {
        throw new Error("Unknown storage version");
      }
    }
  } catch {
    throw new Error("저장 데이터의 이미지 참조를 확인하지 못해 정리하지 않았습니다. 손상되거나 복원되지 않은 프로젝트·생성 조건을 먼저 확인해 주세요.");
  }
  return references;
}

export async function cleanupImages(storage: Pick<Storage, "length" | "key" | "getItem">) {
  return removeUnusedAssets(collectImageReferences(storage));
}
