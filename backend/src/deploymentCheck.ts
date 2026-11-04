import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { readRuntimeSettings } from "./runtimeSettings";
import { validateProduction } from "./production";

type Check = { name: string; ok: boolean; message: string };
export function checkDeployment(env: NodeJS.ProcessEnv, root: string, nodeVersion = process.versions.node) {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, message: string) => checks.push({ name, ok, message });
  add("NODE_VERSION", Number(nodeVersion.split(".")[0]) >= 24, "Node.js 24 이상 필요");
  add("NODE_ENV", env.NODE_ENV === "production", "운영 점검은 NODE_ENV=production 필요");
  let settings: ReturnType<typeof readRuntimeSettings>;
  try { settings = readRuntimeSettings(env); }
  catch {
    add("NUMERIC_SETTINGS", false, "PORT 또는 AI 시간·횟수·동시성 설정 범위를 확인하세요.");
    return checks;
  }
  add("NUMERIC_SETTINGS", true, "서버와 같은 숫자 설정 검증 통과");
  try {
    validateProduction({ ...settings, environment: "production" });
    add("PRODUCTION_SETTINGS", true, "HTTPS origin·루프백·신뢰 프록시·절대 DB 경로 검증 통과");
  } catch {
    add("PRODUCTION_SETTINGS", false, "HTTPS origin·루프백 HOST·로컬 AI_TRUSTED_PROXIES·서로 다른 절대 DB 경로가 필요합니다.");
  }
  add("OPENAI_API_KEY", !!settings.key.trim(), "키 설정 여부만 검사하며 유효성·계정 권한은 확인하지 않음");
  add("OPENAI_MODEL", !!settings.model.trim(), "모델 설정 여부만 검사하며 실제 호출은 하지 않음");
  add("MAINTENANCE", !settings.maintenance, "AI_MAINTENANCE=true이면 AI 요청이 거부됨");
  const dist = resolve(root, "sebitcanvers_v3/frontend/dist");
  try {
    const index = resolve(dist, "index.html");
    accessSync(index, constants.R_OK);
    if (!statSync(index).isFile()) throw new Error();
    add("FRONTEND_BUILD", true, "dist/index.html 읽기 가능; 배포 파일 일치 여부는 별도 검수");
  } catch { add("FRONTEND_BUILD", false, "프론트엔드 빌드 후 dist/index.html을 확인하세요."); }
  const outside = (path: string, base: string) => {
    const rel = relative(base, path);
    return rel === ".." || rel.startsWith("..\\") || rel.startsWith("../") || isAbsolute(rel);
  };
  const canonical: string[] = [];
  for (const [name, path] of [["AI_USAGE_DB", settings.usagePath], ["AI_TELEMETRY_DB", settings.telemetryPath], ["CMS_DB", env.CMS_DB ?? "./data/cms.sqlite"]]) {
    try {
      if (!isAbsolute(path)) throw new Error();
      const parent = realpathSync(dirname(path));
      const resolved = existsSync(path) ? realpathSync(path) : resolve(parent, relative(dirname(path), path));
      if (!outside(resolved, realpathSync(root))) throw new Error();
      if (!statSync(parent).isDirectory()) throw new Error();
      accessSync(parent, constants.R_OK | constants.W_OK | constants.X_OK);
      if (existsSync(path)) {
        if (!statSync(path).isFile()) throw new Error();
        accessSync(path, constants.R_OK | constants.W_OK);
      }
      canonical.push(resolved);
      add(name, true, "릴리스 밖 DB 경로와 현재 실행 계정의 읽기/쓰기 접근 확인");
    } catch { add(name, false, "릴리스 밖 영속 디렉터리를 준비하고 DB/부모 디렉터리 권한·절대 경로를 확인하세요."); }
  }
  if (canonical.length === 3) add("SEPARATE_DATABASES", new Set(canonical).size === 3, "심볼릭 링크를 해석한 세 DB 경로도 달라야 함");
  return checks;
}
