export function readRuntimeSettings(env: NodeJS.ProcessEnv = process.env) {
  const integer = (name: string, fallback: number, max: number) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
    return value;
  };
  return {
    environment: env.NODE_ENV,
    host: env.HOST ?? "127.0.0.1",
    port: integer("PORT", 3001, 65535),
    origin: env.APP_ORIGIN ?? "http://localhost:5173",
    allowedOrigins: (env.APP_ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean),
    proxies: (env.AI_TRUSTED_PROXIES ?? "").split(",").map(value => value.trim()).filter(Boolean),
    usagePath: env.AI_USAGE_DB ?? "./data/ai-usage.sqlite",
    telemetryPath: env.AI_TELEMETRY_DB ?? "./data/ai-events.sqlite",
    key: env.OPENAI_API_KEY ?? "",
    model: env.OPENAI_MODEL ?? "",
    timeout: integer("AI_TIMEOUT_MS", 60000, 120000),
    rateLimit: integer("AI_RATE_LIMIT", 5, 100),
    concurrency: integer("AI_CONCURRENCY", 2, 10),
    maintenance: env.AI_MAINTENANCE === "true",
    limits: {
      generate: integer("AI_DAILY_GENERATE", 3, 10000),
      edit: integer("AI_DAILY_EDIT", 10, 10000),
      ipGenerate: integer("AI_DAILY_IP_GENERATE", 50, 100000),
      ipEdit: integer("AI_DAILY_IP_EDIT", 200, 100000),
    },
  };
}
