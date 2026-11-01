import { DatabaseSync } from "node:sqlite";

// Aggregate only: never return request IDs, prompts, credentials or raw rows.
export function readTelemetryReport(path: string, hours = 24, now = Date.now()) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) throw new Error("Invalid report window");
  const db = new DatabaseSync(path, { readOnly: true, timeout: 1000 });
  const since = now - hours * 3600000;
  try {
    db.exec("BEGIN");
    const requests = db.prepare(`SELECT kind, COUNT(*) AS completed,
      SUM(ok) AS succeeded, SUM(CASE WHEN ok=0 THEN 1 ELSE 0 END) AS failed,
      ROUND(AVG(ms)) AS averageMs, MAX(ms) AS maximumMs,
      SUM(CASE WHEN attempt>1 THEN 1 ELSE 0 END) AS repairRequests
      FROM ai_events WHERE phase='request' AND at>=? AND at<=? GROUP BY kind ORDER BY kind`).all(since, now);
    const providers = db.prepare(`SELECT kind, COUNT(*) AS attempts,
      COUNT(total_tokens) AS attemptsWithKnownTotal,
      SUM(total_tokens) AS knownTotalTokens, SUM(input_tokens) AS knownInputTokens,
      SUM(output_tokens) AS knownOutputTokens
      FROM ai_events WHERE phase='provider' AND at>=? AND at<=? GROUP BY kind ORDER BY kind`).all(since, now);
    const failures = db.prepare(`SELECT kind, code, COUNT(*) AS count FROM ai_events
      WHERE phase='request' AND ok=0 AND at>=? AND at<=? GROUP BY kind,code ORDER BY kind,code`).all(since, now);
    return { from: new Date(since).toISOString(), to: new Date(now).toISOString(), requests, providers, failures };
  } finally { db.close(); }
}
