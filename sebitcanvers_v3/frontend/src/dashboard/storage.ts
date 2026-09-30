import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
export const schemaStorageKey = "sebit-dashboard-schema-v01:";
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
