import { dashboardSchema } from "../dashboard/schema";
import type { DashboardSchema } from "../dashboard/schema";
import { getAsset, saveImage } from "../create/assets";

export type Bundle = { schema: DashboardSchema; assets: Record<string, string> };
export type CmsState = { revision: number; draft: Bundle | null; published: Bundle | null; previous: Bundle | null };
export async function request<T>(path: string, body?: unknown, csrf?: string): Promise<T> {
  const response = await fetch(`/api/cms/${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json", ...(csrf ? { "X-CMS-CSRF": csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "요청을 완료하지 못했습니다.");
  return data as T;
}
export async function pack(schema: DashboardSchema): Promise<Bundle> {
  const assets: Record<string, string> = {};
  const ids = new Set([schema.mainVisual.imageAssetId, schema.settings.selections?.mainVisual.imageAssetId].filter((id): id is string => !!id));
  for (const id of ids) {
    const blob = await getAsset(id);
    if (!blob) throw new Error("이미지를 찾을 수 없습니다. 편집기에서 이미지를 다시 선택하세요.");
    assets[id] = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("이미지 읽기 실패")); reader.readAsDataURL(blob);
    });
  }
  return { schema: dashboardSchema.parse(schema), assets };
}
export async function hydrate(bundle: Bundle) {
  const schema = dashboardSchema.parse(bundle.schema);
  for (const [oldId, url] of Object.entries(bundle.assets)) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(url)) throw new Error("이미지 형식 오류");
    const blob = await (await fetch(url)).blob();
    const id = await saveImage(new File([blob], "cms-image", { type: blob.type }));
    if (schema.mainVisual.imageAssetId === oldId) schema.mainVisual.imageAssetId = id;
    if (schema.settings.selections?.mainVisual.imageAssetId === oldId) schema.settings.selections.mainVisual.imageAssetId = id;
  }
  return schema;
}
