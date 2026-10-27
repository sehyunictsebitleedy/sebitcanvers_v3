import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
export const schemaStorageKey = "sebit-dashboard-schema-v01:";
export const backupKey = "sebit-dashboard-backup-v1:";
export const draftsStorageKey = "sebit-canvers-drafts-v1";
export const initialSnapshotKey = "sebit-dashboard-initial-v1:";
export const deletedProjectKey = "sebit-dashboard-deleted-v1:";
export function assertProjectExists(storage: Pick<Storage, "getItem">, id: string) {
  if (storage.getItem(deletedProjectKey + id) !== null)
    throw new Error("삭제된 프로젝트는 다시 저장하거나 복원할 수 없습니다.");
}
export function loadInitialSnapshot(storage: Pick<Storage, "getItem">, id: string) {
  const raw = storage.getItem(initialSnapshotKey + id);
  if (raw === null) return null;
  const schema = dashboardSchema.parse(JSON.parse(raw));
  if (schema.project.id !== id) throw new Error("최초 생성본의 프로젝트가 일치하지 않습니다.");
  return schema;
}
export function saveInitialSnapshot(storage: Pick<Storage, "getItem" | "setItem">, input: unknown) {
  const schema = dashboardSchema.parse(input);
  assertProjectExists(storage, schema.project.id);
  // Capture only at creation. Never replace an existing or damaged original.
  if (storage.getItem(initialSnapshotKey + schema.project.id) !== null) return;
  storage.setItem(initialSnapshotKey + schema.project.id, JSON.stringify(schema));
}
export function loadBackup(storage: Pick<Storage, "getItem">, id: string) {
  const raw = storage.getItem(backupKey + id);
  if (!raw) return null;
  const schema = dashboardSchema.parse(JSON.parse(raw));
  if (schema.project.id !== id) throw new Error("백업 프로젝트가 일치하지 않습니다.");
  return schema;
}
export function replaceProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  current: DashboardSchema,
  replacement: DashboardSchema,
) {
  const previous = dashboardSchema.parse(current);
  assertProjectExists(storage, previous.project.id);
  const next = dashboardSchema.parse({
    ...replacement,
    project: { ...replacement.project, id: previous.project.id,
      createdAt: previous.project.createdAt, updatedAt: new Date().toISOString() },
  });
  // Back up first: a quota failure must never overwrite the current project.
  storage.setItem(backupKey + previous.project.id, JSON.stringify(previous));
  saveProject(storage, next);
  return next;
}
export function loadProject(
  storage: Pick<Storage, "getItem">,
  id: string,
): DashboardSchema | null {
  assertProjectExists(storage, id);
  const raw = storage.getItem(schemaStorageKey + id);
  if (!raw) return null;
  const schema = dashboardSchema.parse(JSON.parse(raw));
  if (schema.project.id !== id)
    throw new Error("프로젝트 ID가 일치하지 않습니다.");
  return schema;
}
export function saveProject(storage: Pick<Storage, "getItem" | "setItem">, input: unknown) {
  const schema = dashboardSchema.parse(input);
  assertProjectExists(storage, schema.project.id);
  storage.setItem(schemaStorageKey + schema.project.id, JSON.stringify(schema));
}
