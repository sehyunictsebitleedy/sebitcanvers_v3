import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type TokenUsage = { input: number | null; output: number | null; total: number | null; cached: number | null; reasoning: number | null };
export function tokenUsage(value: unknown): TokenUsage {
  const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
  const data = object(value);
  const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  return { input: count(data.input_tokens), output: count(data.output_tokens), total: count(data.total_tokens),
    cached: count(object(data.input_tokens_details).cached_tokens), reasoning: count(object(data.output_tokens_details).reasoning_tokens) };
}
export type AiEvent = { requestId: string; kind: "generate" | "edit"; phase: "provider" | "request"; attempt: number; ok: boolean; code: string | null; ms: number; tokens?: TokenUsage | null };
export class TelemetryStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 1000 });
    this.db.exec(`CREATE TABLE IF NOT EXISTS ai_events (
      id INTEGER PRIMARY KEY, at INTEGER NOT NULL, request_id TEXT NOT NULL,
      kind TEXT NOT NULL, phase TEXT NOT NULL, attempt INTEGER NOT NULL,
      ok INTEGER NOT NULL, code TEXT, ms INTEGER NOT NULL,
      input_tokens INTEGER, output_tokens INTEGER, total_tokens INTEGER,
      cached_tokens INTEGER, reasoning_tokens INTEGER
    ); CREATE INDEX IF NOT EXISTS ai_events_at ON ai_events(at);`);
  }
  record(event: AiEvent, now = Date.now()) {
    this.db.prepare("INSERT INTO ai_events (at,request_id,kind,phase,attempt,ok,code,ms,input_tokens,output_tokens,total_tokens,cached_tokens,reasoning_tokens) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(now, event.requestId, event.kind, event.phase, event.attempt, Number(event.ok), event.code, event.ms,
        event.tokens?.input ?? null, event.tokens?.output ?? null, event.tokens?.total ?? null, event.tokens?.cached ?? null, event.tokens?.reasoning ?? null);
    this.db.prepare("DELETE FROM ai_events WHERE at < ?").run(now - 30 * 86400000);
  }
  close() { this.db.close(); }
}
