import { fileURLToPath } from "node:url";
import { checkDeployment } from "./deploymentCheck";

const root = fileURLToPath(new URL("../../", import.meta.url));
const checks = checkDeployment(process.env, root);
for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
console.log("읽기 전용 사전 점검입니다. AI 호출·DB 생성·설정 변경을 하지 않습니다. TLS/방화벽/백업 복원과 실제 운영 계정 검수는 별도입니다.");
process.exitCode = checks.every(check => check.ok) ? 0 : 1;
