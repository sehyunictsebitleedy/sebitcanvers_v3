import { DatabaseSync } from "node:sqlite";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ApiError } from "./generate";

type Kind = "generate" | "edit";
export type UsageLimits = { generate: number; edit: number; ipGenerate: number; ipEdit: number };
const dayMs = 86400000;
export function usageDay(now: number) {
  const shifted = now + 9 * 3600000;
  return { day: new Date(shifted).toISOString().slice(0, 10), resetAt: Math.floor(shifted / dayMs) * dayMs + dayMs - 9 * 3600000 };
}
export class UsageStore {
  private db: DatabaseSync;
  private secret: string;
  constructor(path: string, readonly limits: UsageLimits) {
    for (const value of Object.values(limits)) if (!Number.isInteger(value) || value < 1) throw new Error("Invalid daily usage limit");
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 5000 });
    const version = this.db.prepare("PRAGMA user_version").get()!.user_version;
    if (version !== 0 && version !== 1) throw new Error("Unsupported usage database version");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS usage (
        id TEXT PRIMARY KEY, subject TEXT NOT NULL, ip TEXT NOT NULL,
        kind TEXT NOT NULL, day TEXT NOT NULL, state TEXT NOT NULL, expires INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS usage_subject ON usage(day, kind, subject);
      CREATE INDEX IF NOT EXISTS usage_ip ON usage(day, kind, ip);
      PRAGMA user_version=1;
    `);
    this.db.prepare("INSERT OR IGNORE INTO meta VALUES ('cookie-secret', ?)").run(randomBytes(32).toString("hex"));
    this.secret = String(this.db.prepare("SELECT value FROM meta WHERE key='cookie-secret'").get()!.value);
  }
  identity(cookie: string | undefined) {
    const value = cookie?.split(";").map(part => part.trim()).find(part => part.startsWith("sebit_ai="))?.slice(9);
    const [id, signature] = (value ?? "").split(".");
    const sign = (id: string) => createHmac("sha256", this.secret).update(id).digest("hex");
    if (id && /^[a-f0-9-]{36}$/.test(id) && signature && /^[a-f0-9]{64}$/.test(signature) && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id))))
      return { id, cookie: undefined };
    const next = randomUUID();
    return { id: next, cookie: `sebit_ai=${next}.${sign(next)}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=31536000` };
  }
  reserve(subject: string, ip: string, kind: Kind, ttl: number, now = Date.now()) {
    const { day, resetAt } = usageDay(now);
    const hash = (value: string) => createHmac("sha256", this.secret).update(value).digest("hex");
    const user = hash(subject);
    const address = hash(ip);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const count = (field: "subject" | "ip", value: string) => Number(this.db.prepare(`SELECT count(*) AS count FROM usage WHERE day=? AND kind=? AND ${field}=? AND (state='success' OR expires>?)`).get(day, kind, value, now)!.count);
      if (count("subject", user) >= this.limits[kind] || count("ip", address) >= this.limits[kind === "generate" ? "ipGenerate" : "ipEdit"]) {
        throw new ApiError(429, "DAILY_LIMIT", `오늘의 AI ${kind === "generate" ? "생성" : "수정"} 사용 한도에 도달했습니다. 다음 사용 가능 시각: ${new Date(resetAt + 9 * 3600000).toISOString().slice(0, 10)} 00:00 (한국시간). 진행 중인 요청도 한도에 포함됩니다.`);
      }
      const id = randomUUID();
      this.db.prepare("INSERT INTO usage VALUES (?, ?, ?, ?, ?, 'pending', ?)").run(id, user, address, kind, day, now + ttl);
      this.db.prepare("DELETE FROM usage WHERE day < ?").run(usageDay(now - 7 * dayMs).day);
      this.db.exec("COMMIT");
      return { id, resetAt };
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  finish(id: string, success: boolean, now = Date.now()) {
    if (!success) { this.db.prepare("DELETE FROM usage WHERE id=? AND state='pending'").run(id); return; }
    const result = this.db.prepare("UPDATE usage SET state='success' WHERE id=? AND state='pending' AND expires>?").run(id, now);
    if (result.changes !== 1) throw new Error("Usage reservation expired");
  }
  close() { this.db.close(); }
}
