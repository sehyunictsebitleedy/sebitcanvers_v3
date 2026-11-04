import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { CmsStore } from "./cms";

if (!process.stdin.isTTY) {
  console.error("터미널에서 직접 실행해 주세요."); process.exitCode = 1;
} else {
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stdout.write(chunk); done(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  const store = new CmsStore(process.env.CMS_DB ?? "./data/cms.sqlite");
  try {
    const askPassword = async (label: string) => {
      process.stdout.write(label); muted = true;
      try { return await prompt.question(""); }
      finally { muted = false; process.stdout.write("\n"); }
    };
    const password = await askPassword("마스터 비밀번호 (12~128자, 입력 숨김): ");
    const confirmation = await askPassword("비밀번호 확인: ");
    if (password !== confirmation) throw new Error("비밀번호가 일치하지 않습니다.");
    await store.setPassword(password, process.argv.includes("--reset"));
    console.log("master 계정 설정 완료. 기존 로그인 세션은 해제했습니다.");
  } catch (error) { console.error(error instanceof Error ? error.message : "계정 설정 실패"); process.exitCode = 1; }
  finally { prompt.close(); store.close(); }
}
