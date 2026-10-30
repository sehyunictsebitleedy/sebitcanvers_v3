import type { DashboardSchema } from "./schema";
import { getAsset } from "../create/assets";
import { editSnapshot } from "./editing";
import { loadInitialSnapshot, replaceProject } from "./storage";

export async function resetProject(
  storage: Pick<Storage, "getItem" | "setItem">,
  current: DashboardSchema,
  readAsset = getAsset,
  canWrite = () => true,
) {
  const original = loadInitialSnapshot(storage, current.project.id);
  if (!original) throw new Error("최초 생성본이 없어 초기화할 수 없습니다.");
  if (original.mainVisual.enabled && original.mainVisual.imageAssetId) {
    const image = await readAsset(original.mainVisual.imageAssetId);
    if (!image || !image.size || !["image/png", "image/jpeg", "image/webp"].includes(image.type))
      throw new Error("최초 생성본의 이미지가 없거나 손상되어 초기화할 수 없습니다.");
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(image);
      bitmap.close();
    }
  }
  // Do not modify the current project unless validation and backup both succeed.
  if (!canWrite()) throw new Error("편집 권한이 해제되어 초기화 결과를 저장하지 않았습니다.");
  return replaceProject(storage, current, editSnapshot(original, {}));
}
