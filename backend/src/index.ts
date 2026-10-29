import { createApi } from "./server";
import { UsageStore } from "./usage";
import { TelemetryStore } from "./telemetry";
const integer = (name: string, fallback: number, max: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw new Error(`Invalid ${name}`);
  return value;
};
const port = integer("PORT", 3001, 65535);
createApi({
  key: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL ?? "",
  origin: process.env.APP_ORIGIN ?? "http://localhost:5173",
  allowedOrigins: (process.env.APP_ALLOWED_ORIGINS ?? '').split(',').map(value=>value.trim()).filter(Boolean),
  timeout: integer("AI_TIMEOUT_MS", 60000, 120000),
  rateLimit: integer("AI_RATE_LIMIT", 5, 100),
  concurrency: integer("AI_CONCURRENCY", 2, 10),
  maintenance: process.env.AI_MAINTENANCE === "true",
  telemetry: new TelemetryStore(process.env.AI_TELEMETRY_DB ?? "./data/ai-events.sqlite"),
  usage: new UsageStore(process.env.AI_USAGE_DB ?? "./data/ai-usage.sqlite", {
    generate: integer("AI_DAILY_GENERATE", 5, 10000),
    edit: integer("AI_DAILY_EDIT", 20, 10000),
    ipGenerate: integer("AI_DAILY_IP_GENERATE", 50, 100000),
    ipEdit: integer("AI_DAILY_IP_EDIT", 200, 100000),
  }),
}).listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.info(`Dashboard API listening on port ${port}`),
);
