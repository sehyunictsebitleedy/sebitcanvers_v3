import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
import { getAsset } from "../create/assets";

export type FinalizeIssue = { target: string; message: string };
export async function validateFinalization(
  input: unknown,
  readAsset = getAsset,
): Promise<{ schema?: DashboardSchema; issues: FinalizeIssue[] }> {
  const parsed = dashboardSchema.safeParse(input);
  if (!parsed.success)
    return {
      issues: parsed.error.issues.map((issue) => ({
        target: String(issue.path[0] ?? "global"),
        message: `${issue.path.join(".")}: ${issue.message}`,
      })),
    };
  const schema = parsed.data;
  const issues: FinalizeIssue[] = [];
  if (schema.mainVisual.enabled) {
    if (
      schema.mainVisual.cta?.enabled &&
      schema.mainVisual.cta.url.startsWith("#") &&
      schema.mainVisual.cta.url !== "#dashboard-data"
    )
      issues.push({
        target: "visual",
        message:
          "메인 비주얼: 내부 버튼 주소는 #dashboard-data를 사용해 주세요.",
      });
    if (schema.mainVisual.imageAssetId) {
      try {
        const asset = await readAsset(schema.mainVisual.imageAssetId);
        if (
          !asset ||
          !["image/png", "image/jpeg", "image/webp"].includes(asset.type) ||
          !asset.size
        )
          issues.push({
            target: "visual",
            message:
              "메인 비주얼 이미지가 누락되거나 손상되었습니다. 교체해 주세요.",
          });
        else if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(asset);
          bitmap.close();
        }
      } catch {
        issues.push({
          target: "visual",
          message:
            "저장된 이미지를 읽을 수 없습니다. 이미지 저장소를 확인해 주세요.",
        });
      }
    }
  }
  return { schema, issues };
}
