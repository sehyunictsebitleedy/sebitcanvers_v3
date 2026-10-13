import { createApi } from "./server";
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
  timeout: integer("AI_TIMEOUT_MS", 60000, 120000),
  rateLimit: integer("AI_RATE_LIMIT", 5, 100),
  concurrency: integer("AI_CONCURRENCY", 2, 10),
  maintenance: process.env.AI_MAINTENANCE === "true",
}).listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.info(`Dashboard API listening on port ${port}`),
);
