import { renderToStaticMarkup } from "react-dom/server";
import JSZip from "jszip";
import { DashboardRenderer } from "./Renderer";
import { dashboardSchema } from "./schema";
import { getAsset } from "../create/assets";

export function createExportFiles(
  input: unknown,
  css: string,
  assetUrls: Record<string, string> = {},
) {
  const schema = dashboardSchema.parse(input);
  if (!["finalized", "exported"].includes(schema.status))
    throw new Error("검증·확정 후 다운로드할 수 있습니다.");
  if (
    schema.mainVisual.enabled &&
    schema.mainVisual.imageAssetId &&
    !assetUrls[schema.mainVisual.imageAssetId]
  )
    throw new Error("메인 비주얼 이미지가 누락되었습니다.");
  const markup = renderToStaticMarkup(
    <DashboardRenderer schema={schema} assetUrls={assetUrls} />,
  );
  const title = schema.project.name.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
  return {
    "index.html": `<!doctype html>\n<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="css/style.css"></head><body>${markup}<footer class="export-footer"><span>샘플 데이터 기반 대시보드</span> <button type="button" id="print-dashboard">인쇄</button></footer><script src="js/dashboard.js" defer></script></body></html>`,
    "css/style.css": `body{margin:0;background:${schema.theme.background};min-width:1280px}.schema-dashboard{margin:0 auto}.export-footer{padding:20px;text-align:center;font:12px system-ui;color:${schema.theme.muted}}.export-footer button{margin-left:12px;padding:6px 12px;cursor:pointer}@media print{.export-footer{display:none}}\n${css}`,
    "js/dashboard.js": `'use strict';\ndocument.getElementById('print-dashboard').addEventListener('click', function () { window.print(); });\n`,
    "data/dashboard.json": JSON.stringify(schema, null, 2),
    "README.md": `# ${schema.project.name}\n\n1280px 이상 PC용 샘플 데이터 대시보드입니다.\n\n## 실행\n\n압축을 풀고 index.html을 브라우저에서 직접 여세요. npm, React, 로컬 서버, CDN 연결이 필요하지 않습니다.\n\n## 파일\n\n- index.html: 내용과 SVG 차트\n- css/style.css: 레이아웃과 스타일\n- js/dashboard.js: 인쇄 버튼\n- data/dashboard.json: 확정 Schema 보관용\n\n텍스트·표·차트는 index.html, 디자인은 css/style.css에서 수정합니다. JSON만 바꾸면 화면이 자동 갱신되는 구조는 아닙니다.\n\n차트는 동일 Renderer의 SVG이며 외부 차트 라이브러리·폰트를 사용하지 않습니다. 업로드한 이미지는 assets 폴더에 포함됩니다. 시스템 글꼴을 사용합니다. 실제 업무 데이터 연결 기능은 없습니다.\n\n## 라이선스\n\n직렬화에는 React(MIT), ZIP 작성에는 JSZip(MIT)을 사용하며 실행 파일에는 해당 런타임을 포함하지 않습니다. Renderer와 생성 결과의 이용 조건은 서비스 정책을 따릅니다.\n`,
  };
}
export async function createExportZip(input: unknown, css: string) {
  const schema = dashboardSchema.parse(input);
  const zip = new JSZip();
  const urls: Record<string, string> = {};
  if (schema.mainVisual.enabled && schema.mainVisual.imageAssetId) {
    const asset = await getAsset(schema.mainVisual.imageAssetId);
    if (
      !asset ||
      !["image/png", "image/jpeg", "image/webp"].includes(asset.type)
    )
      throw new Error(
        "메인 비주얼 이미지가 없습니다. Create에서 교체해 주세요.",
      );
    const path = `assets/main-visual.${asset.type === "image/jpeg" ? "jpg" : asset.type.split("/")[1]}`;
    urls[schema.mainVisual.imageAssetId] = path;
    zip.file(path, await asset.arrayBuffer());
  }
  const files = createExportFiles(schema, css, urls);
  Object.entries(files).forEach(([path, content]) => zip.file(path, content));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
export function exportFilename(name: string) {
  const safe =
    name
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}_-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dashboard";
  return `${safe}.zip`;
}
