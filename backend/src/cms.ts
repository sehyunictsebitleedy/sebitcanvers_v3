import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { dashboardSchema } from "../../sebitcanvers_v3/frontend/src/dashboard/schema";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const bundleSchema = z.strictObject({ schema: dashboardSchema, assets: z.record(z.string(), z.string().max(2800000)).refine(v => Object.keys(v).length <= 2) });
export type Bundle = z.infer<typeof bundleSchema>;
export function validateBundle(value: unknown): Bundle {
  const bundle = bundleSchema.parse(value);
  const ids = new Set([bundle.schema.mainVisual.imageAssetId, bundle.schema.settings.selections?.mainVisual.imageAssetId].filter((id): id is string => !!id));
  for (const id of ids) if (!Object.hasOwn(bundle.assets, id)) throw new Error("이미지가 누락되었습니다.");
  for (const [id, data] of Object.entries(bundle.assets)) {
    if (!ids.has(id)) throw new Error("사용하지 않는 이미지입니다.");
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!match) throw new Error("이미지 형식을 확인하세요.");
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 2 * 1024 * 1024 || bytes.toString("base64") !== match[2]) throw new Error("이미지 크기를 확인하세요.");
    const valid = match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.subarray(0,4).toString() === "RIFF" && bytes.subarray(8,12).toString() === "WEBP";
    if (!valid) throw new Error("이미지 내용이 올바르지 않습니다.");
  }
  return bundle;
}
export class CmsConflict extends Error {}
type State = { revision: number; draft: Bundle | null; published: Bundle | null; previous: Bundle | null };
export class CmsStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 1000 });
    this.db.exec(`CREATE TABLE IF NOT EXISTS cms_account (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, digest TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS cms_sessions (token TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cms_login_limits (ip TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cms_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, draft TEXT, published TEXT, previous TEXT);
      INSERT OR IGNORE INTO cms_state VALUES (1,0,NULL,NULL,NULL);`);
  }
  configured() { return !!this.db.prepare("SELECT id FROM cms_account WHERE id=1").get(); }
  async setPassword(password: string, reset = false) {
    if (password.length < 12 || password.length > 128) throw new Error("비밀번호는 12~128자로 설정하세요.");
    const salt = randomBytes(16).toString("hex");
    const digest = (await derive(password, salt, 64) as Buffer).toString("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.configured() && !reset) throw new Error("이미 계정이 있습니다. 변경하려면 --reset을 사용하세요.");
      this.db.prepare("INSERT OR REPLACE INTO cms_account VALUES (1,?,?)").run(salt, digest);
      this.db.exec("DELETE FROM cms_sessions; DELETE FROM cms_login_limits; COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  async login(username: string, password: string, ip: string, now = Date.now()) {
    this.db.prepare("DELETE FROM cms_login_limits WHERE until<=?").run(now);
    this.db.prepare("DELETE FROM cms_sessions WHERE expires<=?").run(now);
    const ipKey = hash(ip);
    const limit = this.db.prepare("SELECT count FROM cms_login_limits WHERE ip=?").get(ipKey);
    if (!limit && Number(this.db.prepare("SELECT COUNT(*) AS n FROM cms_login_limits").get()!.n) >= 10000) return { limited: true } as const;
    if (limit && Number(limit.count) >= 5) return { limited: true } as const;
    this.db.prepare("INSERT INTO cms_login_limits VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET count=count+1").run(ipKey, now + 15*60000);
    const account = this.db.prepare("SELECT salt,digest FROM cms_account WHERE id=1").get();
    const candidate = await derive(password, String(account?.salt ?? "unconfigured-cms"), 64) as Buffer;
    if (!account || username !== "master" || !timingSafeEqual(candidate, Buffer.from(String(account.digest), "hex"))) return null;
    if (this.db.prepare("SELECT digest FROM cms_account WHERE id=1").get()?.digest !== account.digest) return null;
    this.db.prepare("DELETE FROM cms_login_limits WHERE ip=?").run(ipKey);
    const token = randomBytes(32).toString("hex"), csrf = randomBytes(32).toString("hex");
    this.db.prepare("INSERT INTO cms_sessions VALUES (?,?,?)").run(hash(token), csrf, now + 8*3600000);
    return { token, csrf };
  }
  session(token: string, now = Date.now()) {
    return this.db.prepare("SELECT csrf FROM cms_sessions WHERE token=? AND expires>?").get(hash(token), now);
  }
  logout(token: string) { this.db.prepare("DELETE FROM cms_sessions WHERE token=?").run(hash(token)); }
  state(): State {
    const row = this.db.prepare("SELECT * FROM cms_state WHERE id=1").get()!;
    const parse = (value: unknown) => value === null ? null : validateBundle(JSON.parse(String(value)));
    return { revision: Number(row.revision), draft: parse(row.draft), published: parse(row.published), previous: parse(row.previous) };
  }
  change(revision: number, operation: "save" | "publish" | "restore", bundle?: unknown) {
    const validated = operation === "save" ? validateBundle(bundle) : undefined;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const state = this.state();
      if (state.revision !== revision) throw new CmsConflict("Revision conflict");
      if (operation === "save") state.draft = validated!;
      else if (operation === "publish") {
        if (!state.draft) throw new Error("No saved draft");
        state.previous = state.published; state.published = state.draft;
      } else {
        if (!state.previous) throw new Error("No previous publication");
        [state.published, state.previous] = [state.previous, state.published];
      }
      this.db.prepare("UPDATE cms_state SET revision=?,draft=?,published=?,previous=? WHERE id=1")
        .run(state.revision + 1, state.draft ? JSON.stringify(state.draft) : null, state.published ? JSON.stringify(state.published) : null, state.previous ? JSON.stringify(state.previous) : null);
      this.db.exec("COMMIT");
      return this.state();
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  close() { this.db.close(); }
}
