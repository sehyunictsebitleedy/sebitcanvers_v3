import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";
import { generate, openAIProvider } from "./generate";

// Explicit paid QA command. Only validated synthetic output is saved locally.
try {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!key || !model) throw new Error();
  const folder = new URL("../test-results/live-schema/", import.meta.url);
  await mkdir(folder, { recursive: true });
  // Write manifest last so a partial run cannot be mistaken for a complete set.
  await writeFile(new URL("manifest.json", folder), JSON.stringify({ complete: false }));
  const startedAt = new Date().toISOString();
  for (const type of [0, 1, 3, 4]) {
    const options = defaultOptions(type);
    options.name = "로컬 화면 검수";
    const started = Date.now();
    const result = await generate(options, openAIProvider({ key, model }), AbortSignal.timeout(120000));
    await writeFile(new URL(`${type}.json`, folder), JSON.stringify(result.schema, null, 2));
    console.log(JSON.stringify({ type, ok: true, repaired: result.repaired, elapsedMs: Date.now() - started }));
  }
  await writeFile(new URL("manifest.json", folder), JSON.stringify({ complete: true, startedAt, types: [0, 1, 3, 4] }));
  console.log(`Validated synthetic fixtures saved: ${fileURLToPath(folder)}`);
} catch {
  console.error("AI 화면 검수 자료 생성 실패. 설정·연결·검증 결과를 확인하세요. 불완전한 자료는 브라우저 검수에 사용하지 않습니다.");
  process.exitCode = 1;
}
