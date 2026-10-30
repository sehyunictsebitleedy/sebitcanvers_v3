import { isAbsolute, resolve } from "node:path";
import { normalizeIp } from "./clientIp";

export function validateProduction(settings: { environment?: string; host: string; origin: string; allowedOrigins: string[]; proxies: string[]; usagePath: string; telemetryPath: string }) {
  if (settings.environment !== "production") return;
  const httpsOrigin = (value: string) => {
    try { const url = new URL(value); return url.protocol === "https:" && url.origin === value; }
    catch { return false; }
  };
  if (![settings.origin, ...settings.allowedOrigins].every(httpsOrigin)) throw new Error("Production requires exact HTTPS origins without paths");
  if (!["127.0.0.1", "::1"].includes(settings.host)) throw new Error("Single-server production backend must listen on loopback");
  if (!settings.proxies.length || settings.proxies.some(value => !["127.0.0.1", "::1"].includes(normalizeIp(value) ?? "")))
    throw new Error("Single-server production requires an explicit local trusted proxy");
  if (!isAbsolute(settings.usagePath) || !isAbsolute(settings.telemetryPath) || resolve(settings.usagePath) === resolve(settings.telemetryPath))
    throw new Error("Production requires separate absolute persistent database paths");
}
