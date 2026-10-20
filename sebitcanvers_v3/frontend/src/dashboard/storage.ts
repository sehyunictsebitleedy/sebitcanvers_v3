import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
export const schemaStorageKey = "sebit-dashboard-schema-v01:";
const backupKey = "sebit-dashboard-backup-v1:";
export function loadBackup(storage: Pick<Storage, "getItem">, id: string) {
  const raw = storage.getItem(backupKey + id);
  if (!raw) return null;
  const schema = dashboardSchema.parse(JSON.parse(raw));
  if (schema.project.id !== id) throw new Error("백업 프로젝트가 일치하지 않습니다.");
  return schema;
}
export function replaceProject(
  storage: Pick<Storage, "setItem">,
  current: DashboardSchema,
  replacement: DashboardSchema,
) {
  const previous = dashboardSchema.parse(current);
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
  const raw = storage.getItem(schemaStorageKey + id);
  if (!raw) return null;
  const schema = dashboardSchema.parse(JSON.parse(raw));
  if (schema.project.id !== id)
    throw new Error("프로젝트 ID가 일치하지 않습니다.");
  return schema;
}
export function saveProject(storage: Pick<Storage, "setItem">, input: unknown) {
  const schema = dashboardSchema.parse(input);
  storage.setItem(schemaStorageKey + schema.project.id, JSON.stringify(schema));
}
