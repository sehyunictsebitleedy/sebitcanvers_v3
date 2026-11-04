import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { CmsConflict, type CmsStore } from "./cms";
import { masterCookieName, masterToken } from "./masterSession";

export async function cmsRoute(req: IncomingMessage, res: ServerResponse, config: { cms?: CmsStore; origin: string; allowedOrigins?: string[] }, ip: () => string) {
  if (!req.url?.startsWith("/api/cms/")) return false;
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(JSON.stringify(data));
  };
  const cms = config.cms;
  if (!cms) { send(503, { error: "관리 기능을 사용할 수 없습니다." }); return true; }
  const cookie = (value: string, age: number, legacy = false) => `${masterCookieName(config.origin, legacy)}=${value}; Path=${legacy ? "/api/cms" : "/api"}; HttpOnly; SameSite=Strict; Max-Age=${age}${config.origin.startsWith("https:") ? "; Secure" : ""}`;
  const token = masterToken(req, config.origin, true);
  try {
    if (req.method === "GET" && req.url === "/api/cms/public") {
      const bundle = cms.state().published;
      if (!bundle) { send(404, { error: "아직 게시된 대시보드가 없습니다." }); return true; }
      // Creation instructions and unused assets are private administration data.
      bundle.schema.settings = { dataMode: "sample" };
      const id = bundle.schema.mainVisual.enabled ? bundle.schema.mainVisual.imageAssetId : null;
      send(200, { schema: bundle.schema, assets: id ? { [id]: bundle.assets[id] } : {} });
      return true;
    }
    if (req.headers.origin && ![config.origin, ...(config.allowedOrigins ?? [])].includes(req.headers.origin)) {
      send(403, { error: "허용되지 않은 요청입니다." }); return true;
    }
    if (req.method === "GET" && req.url === "/api/cms/session") {
      const session = cms.session(token);
      // Upgrade old CMS-only cookies; the server session keeps its original expiry.
      if (session && !masterToken(req, config.origin))
        res.setHeader("Set-Cookie", [cookie(token, 8*3600), cookie("", 0, true)]);
      send(200, { configured: cms.configured(), authenticated: !!session, csrf: session?.csrf ?? null }); return true;
    }
    const session = cms.session(token);
    if (req.method === "GET" && req.url === "/api/cms/state") {
      if (!session) send(401, { error: "마스터 로그인이 필요합니다." });
      else send(200, cms.state());
      return true;
    }
    if (req.method !== "POST") { send(405, { error: "지원하지 않는 요청입니다." }); return true; }
    if (!req.headers.origin || ![config.origin, ...(config.allowedOrigins ?? [])].includes(req.headers.origin)) {
      send(403, { error: "허용되지 않은 요청입니다." }); return true;
    }
    const login = req.url === "/api/cms/login";
    if (!login && (!session || req.headers["x-cms-csrf"] !== session.csrf)) {
      send(session ? 403 : 401, { error: "로그인 상태를 확인하고 다시 시도하세요." }); return true;
    }
    if (!String(req.headers["content-type"]).startsWith("application/json")) { send(415, { error: "JSON 요청이 필요합니다." }); return true; }
    let bytes = 0; const chunks: Buffer[] = [];
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > (login ? 4096 : 6*1024*1024)) { send(413, { error: "저장할 데이터가 너무 큽니다." }); return true; }
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (login) {
      if (!cms.configured()) { send(503, { error: "서버에서 마스터 계정을 먼저 설정하세요." }); return true; }
      const credentials = z.strictObject({ username: z.string().max(64), password: z.string().max(128) }).parse(input);
      const result = await cms.login(credentials.username, credentials.password, ip());
      if (result && "limited" in result) { res.setHeader("Retry-After", "900"); send(429, { error: "로그인 시도가 많습니다. 15분 후 다시 시도하세요." }); }
      else if (!result) send(401, { error: "아이디 또는 비밀번호를 확인하세요." });
      else { cms.logout(token); res.setHeader("Set-Cookie", [cookie(result.token, 8*3600), cookie("", 0, true)]); send(200, { csrf: result.csrf }); }
      return true;
    }
    if (req.url === "/api/cms/logout") { cms.logout(token); res.setHeader("Set-Cookie", [cookie("", 0), cookie("", 0, true)]); send(200, { ok: true }); return true; }
    const operation = req.url.slice("/api/cms/".length);
    if (!["save", "publish", "restore"].includes(operation)) { send(404, { error: "요청 경로를 찾을 수 없습니다." }); return true; }
    const payload = z.strictObject({ revision: z.number().int().min(0), bundle: z.unknown().optional() }).parse(input);
    send(200, cms.change(payload.revision, operation as "save" | "publish" | "restore", payload.bundle));
  } catch (error) {
    if (res.headersSent) return true;
    if (error instanceof CmsConflict) send(409, { error: "다른 탭에서 서버 내용이 변경되었습니다. 편집 내용을 보관한 뒤 서버 내용을 다시 불러오세요." });
    else if (error instanceof z.ZodError || error instanceof SyntaxError) send(400, { error: "입력 형식이 올바르지 않습니다." });
    else send(400, { error: "작업을 완료하지 못했습니다. 데이터·이미지·저장 상태를 확인하세요." });
  }
  return true;
}
