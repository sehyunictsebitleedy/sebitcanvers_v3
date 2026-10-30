import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
export const schemaStorageKey = "sebit-dashboard-schema-v01:";
export const backupKey = "sebit-dashboard-backup-v1:";
export const draftsStorageKey = "sebit-canvers-drafts-v1";
export const initialSnapshotKey = "sebit-dashboard-initial-v1:";
export const deletedProjectKey = "sebit-dashboard-deleted-v1:";
export const recoveryStorageKey = "sebit-dashboard-recovery-v1:";
export class StoredDataError extends Error {
  readonly code: "version" | "corrupt";
  constructor(code: StoredDataError["code"]) {
    super(code === "version" ? "지원하지 않는 저장 버전입니다. 데이터를 보존했으며 최신 앱에서 다시 확인해 주세요." : "저장 데이터가 손상되었거나 프로젝트 정보가 일치하지 않습니다. 원본을 내려받거나 백업 복구를 이용해 주세요.");
    this.code = code;
  }
}
export function parseStoredProject(raw: string, id: string): DashboardSchema {
  let value;
  try { value = JSON.parse(raw); } catch { throw new StoredDataError("corrupt"); }
  if (value && typeof value.schemaVersion === "string" && value.schemaVersion !== "0.1") throw new StoredDataError("version");
  const parsed = dashboardSchema.safeParse(value);
  if (!parsed.success || parsed.data.project.id !== id) throw new StoredDataError("corrupt");
  return parsed.data;
}
export function storageFailureMessage(error: unknown) {
  if (error instanceof StoredDataError) return error.message;
  if (error instanceof Error && error.name === "QuotaExceededError") return "브라우저 저장 공간이 부족합니다. 현재 작업을 내보내고 불필요한 프로젝트를 정리한 뒤 다시 저장해 주세요.";
  if (error instanceof Error && error.name === "SecurityError") return "브라우저가 저장소 접근을 차단했습니다. 사이트 저장 권한을 확인해 주세요.";
  return "저장소 작업에 실패했습니다. 기존 데이터를 보존하고 브라우저 설정을 확인해 주세요.";
}
export function assertProjectExists(storage: Pick<Storage, "getItem">, id: string) {
  if (storage.getItem(deletedProjectKey + id) !== null)
    throw new Error("삭제된 프로젝트는 다시 저장하거나 복원할 수 없습니다.");
}
export function loadInitialSnapshot(storage: Pick<Storage, "getItem">, id: string) {
  const raw = storage.getItem(initialSnapshotKey + id);
  if (raw === null) return null;
  const schema = parseStoredProject(raw, id);
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
  if (raw === null) return null;
  const schema = parseStoredProject(raw, id);
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
  if (raw === null) return null;
  const schema = parseStoredProject(raw, id);
  if (schema.project.id !== id)
    throw new Error("프로젝트 ID가 일치하지 않습니다.");
  return schema;
}
export function saveProject(storage: Pick<Storage, "getItem" | "setItem">, input: unknown) {
  const schema = dashboardSchema.parse(input);
  assertProjectExists(storage, schema.project.id);
  storage.setItem(schemaStorageKey + schema.project.id, JSON.stringify(schema));
}
