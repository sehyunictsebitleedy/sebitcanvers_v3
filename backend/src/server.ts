import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { ApiError, generate, openAIProvider } from "./generate";
import type { Provider } from "./generate";
import { editDashboard } from "./edit";
import { UsageStore, usageDay } from "./usage";
import { readyOptionsSchema } from "../../sebitcanvers_v3/frontend/src/create/contracts";
import { editRequestSchema } from "../../sebitcanvers_v3/frontend/src/dashboard/aiPatch";
import type { AiEvent, TelemetryStore, TokenUsage } from "./telemetry";
import { clientIpResolver } from "./clientIp";

export type Config = {
  key: string;
  model: string;
  origin: string;
  allowedOrigins?: string[];
  timeout: number;
  rateLimit: number;
  concurrency: number;
  maintenance: boolean;
  usage?: UsageStore;
  telemetry?: TelemetryStore;
  trustedProxies?: string[];
};
async function body(req: IncomingMessage, limit: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit)
      throw new ApiError(413, "TOO_LARGE", "요청 크기가 너무 큽니다.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "INVALID_JSON", "JSON 요청이 올바르지 않습니다.");
  }
}
export function createApi(config: Config, provider?: Provider) {
  const clientIp = clientIpResolver(config.trustedProxies);
  const clients = new Map<string, { count: number; until: number }>();
  let active = 0;
  return createServer(async (req, res) => {
    const requestId = randomUUID();
    const started = Date.now();
    const send = (status: number, payload: unknown) => {
      if (res.destroyed) return;
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(payload));
    };
    if (req.url === "/api/health" && req.method === "GET") {
      send(200, {
        ready: !!config.key && !!config.model && !config.maintenance,
      });
      return;
    }
    if (req.url === "/api/usage" && req.method === "GET") {
      if (req.headers.origin && ![config.origin, ...(config.allowedOrigins ?? [])].includes(req.headers.origin)) {
        send(403, { code: "ORIGIN", error: "허용되지 않은 접속 주소입니다." });
        return;
      }
      try {
        if (!config.usage) throw new Error("Usage store missing");
        const identity = config.usage.identity(req.headers.cookie);
        const usage = config.usage.snapshot(identity.id, clientIp(req));
        if (identity.cookie) res.setHeader("Set-Cookie", identity.cookie + (config.origin.startsWith("https:") ? "; Secure" : ""));
        send(200, usage);
      } catch (error) {
        if (error instanceof ApiError) send(error.status, { code: error.code, error: error.message });
        else send(503, { code: "USAGE_UNAVAILABLE", error: "사용량을 확인하지 못했습니다. 잠시 후 다시 확인해 주세요." });
      }
      return;
    }
    const isEdit = req.url === "/api/edit";
    if ((!isEdit && req.url !== "/api/generate") || req.method !== "POST") {
      send(404, { error: "요청 경로를 찾을 수 없습니다." });
      return;
    }
    let counted = false;
    let reservation: string | undefined;
    let attempts = 0;
    const record = (event: Omit<AiEvent, "requestId" | "kind">) => {
      try { config.telemetry?.record({ ...event, requestId, kind: isEdit ? "edit" : "generate" }); }
      catch { console.error(JSON.stringify({ requestId, event: "telemetry-write-failed" })); }
    };
    const controller = new AbortController();
    const cancel = () => {
      if (!res.writableEnded) controller.abort("cancelled");
    };
    res.on("close", cancel);
    const timeout = setTimeout(() => {
      controller.abort("timeout");
      if (!req.complete) {
        send(408, {
          error: "요청 시간이 초과되었습니다.",
          code: "REQUEST_TIMEOUT",
          requestId,
        });
        req.destroy();
      }
    }, config.timeout);
    try {
      if (req.headers.origin && ![config.origin, ...(config.allowedOrigins ?? [])].includes(req.headers.origin))
        throw new ApiError(403, "ORIGIN", "현재 접속 주소가 서버에 허용되지 않았습니다. APP_ORIGIN 또는 APP_ALLOWED_ORIGINS 설정을 확인한 뒤 서버를 재시작해 주세요.");
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw new ApiError(415, "CONTENT_TYPE", "JSON 요청만 지원합니다.");
      if (config.maintenance)
        throw new ApiError(503, "MAINTENANCE", "AI 서비스를 점검 중입니다.");
      if (!provider && (!config.key || !config.model))
        throw new ApiError(
          503,
          "NOT_CONFIGURED",
          "AI 서버 설정이 필요합니다. 샘플 미리보기와 직접 편집을 이용할 수 있습니다.",
        );
      const now = Date.now();
      for (const [key, value] of clients)
        if (value.until <= now) clients.delete(key);
      const ip = clientIp(req);
      const client = clients.get(ip) ?? { count: 0, until: now + 60000 };
      if (client.count >= config.rateLimit || active >= config.concurrency) {
        res.setHeader("Retry-After", "60");
        throw new ApiError(
          429,
          "RATE_LIMIT",
          "요청이 많습니다. 1분 후 다시 시도해 주세요.",
        );
      }
      client.count++;
      clients.set(ip, client);
      active++;
      counted = true;
      const input = await body(req, isEdit ? 512000 : 32000);
      (isEdit ? editRequestSchema : readyOptionsSchema).parse(input);
      controller.signal.throwIfAborted();
      if (config.usage) {
        const identity = config.usage.identity(req.headers.cookie);
        if (identity.cookie) res.setHeader("Set-Cookie", identity.cookie + (config.origin.startsWith("https:") ? "; Secure" : ""));
        try {
          reservation = config.usage.reserve(identity.id, ip, isEdit ? "edit" : "generate", config.timeout + 5000).id;
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new ApiError(503, "USAGE_UNAVAILABLE", "사용량 저장소를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      }
      let tokens: TokenUsage | null = null;
      const source = provider ?? openAIProvider(config, fetch, value => { tokens = value; });
      const observed: Provider = async (prompt, signal) => {
        const began = Date.now();
        const attempt = ++attempts;
        tokens = null;
        let ok = false;
        let code: string | null = null;
        try { const output = await source(prompt, signal); ok = true; return output; }
        catch (error) {
          code = signal.aborted ? signal.reason === "cancelled" ? "CANCELLED" : "TIMEOUT" : error instanceof ApiError ? error.code : "PROVIDER_FAILED";
          throw error;
        } finally { record({ phase: "provider", attempt, ok, code, ms: Date.now() - began, tokens }); }
      };
      const result = await (isEdit ? editDashboard : generate)(
        input,
        observed,
        controller.signal,
      );
      controller.signal.throwIfAborted();
      if (reservation) config.usage!.finish(reservation, true);
      send(200, { ...result, requestId });
      record({ phase: "request", attempt: attempts, ok: true, code: null, ms: Date.now() - started });
      console.info(
        JSON.stringify({
          requestId,
          event: isEdit ? "edit" : "generate",
          ok: true,
          repaired: result.repaired,
          ms: Date.now() - started,
        }),
      );
    } catch (error) {
      const failure = controller.signal.aborted
        ? new ApiError(
            504,
            controller.signal.reason === "cancelled" ? "CANCELLED" : "TIMEOUT",
            "생성 시간이 초과되거나 취소되었습니다. 다시 시도해 주세요.",
          )
        : error instanceof ApiError
          ? error
          : error instanceof ZodError
            ? new ApiError(400, "INVALID_OPTIONS", "선택 조건을 확인해 주세요.")
            : new ApiError(
                502,
                "GENERATION_FAILED",
                isEdit
                  ? "AI 수정에 실패했습니다. 기존 작업은 유지됩니다. 다시 시도해 주세요."
                  : "대시보드를 생성하지 못했습니다. 다시 시도해 주세요.",
              );
      if (failure.code === "DAILY_LIMIT") res.setHeader("Retry-After", String(Math.ceil((usageDay(Date.now()).resetAt - Date.now()) / 1000)));
      send(failure.status, {
        error: failure.message,
        code: failure.code,
        requestId,
        ...(failure.code === "DAILY_LIMIT" ? { resetAt: new Date(usageDay(Date.now()).resetAt).toISOString() } : {}),
      });
      record({ phase: "request", attempt: attempts, ok: false, code: failure.code, ms: Date.now() - started });
      console.info(
        JSON.stringify({
          requestId,
          event: isEdit ? "edit" : "generate",
          ok: false,
          code: failure.code,
          ms: Date.now() - started,
        }),
      );
    } finally {
      if (reservation) {
        try { config.usage!.finish(reservation, false); }
        catch { console.error(JSON.stringify({ requestId, event: "usage-release-failed" })); }
      }
      clearTimeout(timeout);
      res.off("close", cancel);
      if (counted) active--;
    }
  });
}
