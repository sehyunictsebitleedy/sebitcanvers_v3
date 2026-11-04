import { createApi } from "./server";
import { UsageStore } from "./usage";
import { TelemetryStore } from "./telemetry";
import { validateProduction } from "./production";
import { readRuntimeSettings } from "./runtimeSettings";
import { CmsStore } from "./cms";
import { isAbsolute, resolve } from "node:path";
const settings = readRuntimeSettings();
validateProduction(settings);
const cmsPath = process.env.CMS_DB ?? "./data/cms.sqlite";
if (settings.environment === "production" && (!isAbsolute(cmsPath) || [settings.usagePath, settings.telemetryPath].some(path => resolve(path) === resolve(cmsPath)))) throw new Error("CMS_DB requires a separate absolute path");
createApi({
  cms: new CmsStore(cmsPath),
  key: settings.key,
  model: settings.model,
  origin: settings.origin,
  allowedOrigins: settings.allowedOrigins,
  trustedProxies: settings.proxies,
  timeout: settings.timeout,
  rateLimit: settings.rateLimit,
  concurrency: settings.concurrency,
  chatRateLimit: settings.chatRateLimit,
  maintenance: settings.maintenance,
  telemetry: new TelemetryStore(settings.telemetryPath),
  usage: new UsageStore(settings.usagePath, settings.limits),
}).listen(settings.port, settings.host, () =>
  console.info(`Dashboard API listening on port ${settings.port}`),
);
