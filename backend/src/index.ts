import { createApi } from "./server";
import { UsageStore } from "./usage";
import { TelemetryStore } from "./telemetry";
import { validateProduction } from "./production";
import { readRuntimeSettings } from "./runtimeSettings";
const settings = readRuntimeSettings();
validateProduction(settings);
createApi({
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
