import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApi } from "../src/server";
import type { Config } from "../src/server";
import type { Provider } from "../src/generate";
import { UsageStore } from "../src/usage";
import { TelemetryStore } from "../src/telemetry";
import { chatWithAi } from "../src/chat/chat";
import { guideAnswer, knowledge } from "../src/chat/knowledge";
import { chatShortcuts, chatGuide } from "../../sebitcanvers_v3/frontend/src/chat/chatGuide";
import { chatPages } from "../../sebitcanvers_v3/frontend/src/chat/contracts";

const origin = "http://localhost:5173";
const base: Config = { key: "test", model: "test", origin, timeout: 2000, rateLimit: 5, concurrency: 2, maintenance: false };

async function withApi(config: Partial<Config>, provider: Provider | undefined, run: (ask: (body: unknown, headers?: Record<string, string>) => Promise<Response>) => Promise<void>) {
  const server = createApi({ ...base, ...config }, provider);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/chat`;
  try {
    await run((body, headers = {}) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers }, body: JSON.stringify(body) }));
  } finally {
    server.close();
  }
}

test("guide answers cover every chat guide example and shortcut on every page", () => {
  for (const page of chatPages) {
    const prompts = [...chatShortcuts[page].map((item) => item.prompt), ...chatGuide[page].flatMap((group) => group.examples)];
    assert.ok(prompts.length > 0, page);
    for (const prompt of prompts) {
      const answer = guideAnswer(prompt, page);
      assert.ok(!answer.reply.startsWith("정확한 답을 찾지 못했어요"), `${page}: ${prompt}`);
    }
  }
  assert.equal(new Set(knowledge.map((entry) => entry.id)).size, knowledge.length);
});

test("editor edit requests are handed to AI edit with the original instruction", () => {
  const publish = guideAnswer("마스터 게시본을 복원해줘", "editor");
  assert.equal(publish.editInstruction, undefined);
  assert.match(publish.reply, /서버 초안 저장/);
  const edit = guideAnswer("매출 추이 차트를 막대 차트로 바꿔줘", "editor");
  assert.deepEqual(edit.actions, ["open-ai-edit"]);
  assert.equal(edit.editInstruction, "매출 추이 차트를 막대 차트로 바꿔줘");
  const question = guideAnswer("AI 수정은 어떻게 하나요?", "editor");
  assert.equal(question.editInstruction, undefined);
  assert.equal(guideAnswer("매출 추이 차트를 막대 차트로 바꿔줘", "home").editInstruction, undefined);
});

test("without AI settings the chat answers from the guide and never calls a provider", async () => {
  await withApi({ key: "", model: "" }, undefined, async (ask) => {
    const res = await ask({ message: "다운로드한 ZIP은 어떻게 실행하나요?", page: "home" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, "guide");
    assert.match(body.reply, /index\.html/);
    assert.match(body.notice, /AI 서버 설정 전/);
    assert.ok(body.requestId);
  });
});

test("AI answers are validated, page-filtered, repaired once and counted only on success", async () => {
  const usage = new UsageStore(":memory:", { generate: 5, edit: 20, ipGenerate: 50, ipEdit: 200, chat: 2, ipChat: 10 });
  const telemetry = new TelemetryStore(":memory:");
  let calls = 0;
  const provider: Provider = async (prompt) => {
    calls++;
    const data = JSON.parse(prompt.split("\nRepair")[0]);
    assert.ok(data.knowledge.includes("확정 및 다운로드"));
    if (data.question === "깨진 답") return calls % 2 === 1 ? "not json" : JSON.stringify({ reply: "복구된 답변", actions: [] });
    if (data.question === "편집") return JSON.stringify({ reply: "AI 수정으로 적용할 수 있어요.", actions: ["open-create", "open-ai-edit"], editInstruction: "제목을 바꿔줘" });
    return JSON.stringify({ reply: "AI 답변입니다.", actions: ["open-create", "open-ai-edit", "open-create"] });
  };
  try {
    await withApi({ usage, telemetry }, provider, async (ask) => {
      const first = await ask({ message: "무엇을 만들 수 있나요?", page: "home" });
      const cookie = { Cookie: first.headers.get("set-cookie")!.split(";")[0] };
      const home = await first.json();
      assert.equal(home.source, "ai");
      assert.deepEqual(home.actions, ["open-create"], "editor-only and duplicate actions are removed on home");
      assert.equal(home.editInstruction, undefined);

      const editor = await (await ask({ message: "편집", page: "editor" }, cookie)).json();
      assert.deepEqual(editor.actions, ["open-ai-edit"], "home navigation is removed in the editor");
      assert.equal(editor.editInstruction, "제목을 바꿔줘");

      // 일일 한도(2회) 도달 후에는 AI를 호출하지 않고 기본 안내로 답한다.
      const before = calls;
      const limited = await (await ask({ message: "무료인가요?", page: "home" }, cookie)).json();
      assert.equal(limited.source, "guide");
      assert.match(limited.notice, /AI 상담 한도/);
      assert.equal(calls, before);
    });
    const snapshot = usage.snapshot("x", "127.0.0.1");
    assert.equal(snapshot.chat.limit, 2);
    assert.equal(snapshot.generate.used + snapshot.edit.used, 0, "chat does not consume generate/edit quota");
  } finally {
    usage.close();
    telemetry.close();
  }

  calls = 0;
  const repaired = await chatWithAi({ message: "깨진 답", page: "home" }, provider, new AbortController().signal);
  assert.equal(repaired.reply, "복구된 답변");
  assert.equal(calls, 2);
});

test("provider failures, invalid answers, maintenance and minute limits fall back to the guide", async () => {
  let calls = 0;
  const broken: Provider = async () => {
    calls++;
    return JSON.stringify({ reply: "", actions: ["javascript:alert(1)"] });
  };
  await withApi({ chatRateLimit: 2 }, broken, async (ask) => {
    const first = await (await ask({ message: "모바일에서도 되나요?", page: "home" })).json();
    assert.equal(first.source, "guide");
    assert.match(first.reply, /PC 전용/);
    assert.match(first.notice, /AI 답변을 받지 못해/);
    assert.equal(calls, 2, "one repair attempt only");
    await ask({ message: "안녕", page: "home" });
    const limited = await (await ask({ message: "안녕", page: "home" })).json();
    assert.match(limited.notice, /질문이 많아/);
    assert.equal(calls, 4, "minute limit stops provider calls");
  });
  await withApi({ maintenance: true }, async () => { throw new Error("must not call"); }, async (ask) => {
    const body = await (await ask({ message: "사용 방법 알려줘", page: "info" })).json();
    assert.equal(body.source, "guide");
    assert.match(body.notice, /점검/);
  });
});

test("chat rejects other origins, non-JSON, oversized or unknown fields", async () => {
  await withApi({}, async () => { throw new Error("must not call"); }, async (ask) => {
    assert.equal((await ask({ message: "안녕", page: "home" }, { Origin: "http://evil.example" })).status, 403);
    assert.equal((await ask({ message: "", page: "home" })).status, 400);
    assert.equal((await ask({ message: "x".repeat(501), page: "home" })).status, 400);
    assert.equal((await ask({ message: "안녕", page: "admin" })).status, 400);
    assert.equal((await ask({ message: "안녕", page: "home", schema: {} })).status, 400);
    assert.equal((await ask({ message: "안녕", page: "home" }, { "Content-Type": "text/plain" })).status, 415);
  });
});
