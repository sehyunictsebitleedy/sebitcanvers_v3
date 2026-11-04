import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { createSample } from "../src/dashboard/samples";
import { sanitizeAnswer } from "../src/chat/contracts";
import type { ChatResponse } from "../src/chat/contracts";

test("chat contract keeps only actions the current page can run", () => {
  assert.deepEqual(sanitizeAnswer({ reply: "x", actions: ["open-create", "open-ai-edit", "open-create"] }, "home").actions, ["open-create"]);
  const editor = sanitizeAnswer({ reply: "x", actions: ["open-create"], editInstruction: "제목 변경" }, "editor");
  assert.deepEqual(editor.actions, ["open-ai-edit"]);
  assert.equal(editor.editInstruction, "제목 변경");
  assert.equal(sanitizeAnswer({ reply: "x", actions: ["open-ai-edit"] }, "editor").actions.length, 0, "no edit button without an instruction");
});

test("AI chatbot: floating launcher, guide, shortcuts, actions, retry, cancel and AI edit hand-off", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    cancelAnimationFrame: () => {},
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const { render, fireEvent, cleanup, waitFor, within } = await import("@testing-library/react");
  // screen은 import 시점의 document에 묶이므로 현재 body로 조회한다.
  const page = () => within(document.body);
  const server = await createServer({
    cacheDir: "node_modules/.vite-test-chat",
    server: { middlewareMode: true, ws: { port: 24690 } },
    appType: "custom",
  });
  const asked: { message: string; page: string; history: unknown[] }[] = [];
  let mode: "ok" | "fail" | "hold" = "ok";
  const answer = (input: { message: string; page: string }): ChatResponse =>
    input.message.includes("막대")
      ? { reply: "AI 수정으로 적용할 수 있어요.", actions: ["open-ai-edit"], editInstruction: "첫 번째 차트를 막대 차트로 바꿔줘", source: "ai", requestId: "r1" }
      : { reply: "① '대시보드 만들기'에서 제작 조건을 고릅니다.", actions: ["open-create", "open-guide", "open-privacy"], source: "guide", notice: "AI 서버 설정 전이라 기본 안내로 답변했습니다.", requestId: "r2" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (url === "/api/chat") {
      const input = JSON.parse(String(init!.body));
      asked.push(input);
      if (mode === "fail") throw new TypeError("network");
      if (mode === "hold")
        // 응답하지 않고 대기한다. 화면의 '질문 취소'로만 끝난다.
        await new Promise<void>((_, reject) => {
          init!.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      return new Response(JSON.stringify(answer(input)), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
  }) as typeof fetch;
  try {
    const { ChatWidget } = await server.ssrLoadModule("/src/chat/ChatWidget.tsx");
    const actions: string[] = [];
    render(<ChatWidget page="home" onAction={(action: string) => actions.push(action)} />);

    // 우측 하단 버튼 → 상담 창
    const launcher = page().getByRole("button", { name: "AI 챗봇 문의" });
    assert.equal(launcher.getAttribute("aria-expanded"), "false");
    assert.equal(page().queryByRole("dialog", { name: "AI 상담" }), null);
    fireEvent.click(launcher);
    const chat = within(page().getByRole("dialog", { name: "AI 상담" }));
    const shortcut = (name: string) => within(chat.getByRole("group", { name: "바로가기" })).getByRole("button", { name });

    // 질의 가이드: 예시는 입력창에만 채운다.
    assert.ok(chat.getByRole("region", { name: "질의 가이드" }));
    fireEvent.click(chat.getByRole("button", { name: "모바일에서도 사용할 수 있나요?" }));
    assert.equal((chat.getByLabelText("AI 챗봇 질문") as HTMLTextAreaElement).value, "모바일에서도 사용할 수 있나요?");
    assert.equal(asked.length, 0);

    // 바로가기 → 답변 + 기본 안내 표시 + 이동 버튼
    fireEvent.click(shortcut("사용 방법"));
    await waitFor(() => assert.ok(chat.getByText(/제작 조건을 고릅니다/)));
    assert.deepEqual(asked[0], { message: "사용 방법 알려줘", page: "home", history: [] });
    assert.ok(chat.getByText("AI 서버 설정 전이라 기본 안내로 답변했습니다."));
    const privacy = chat.getByRole("link", { name: "개인정보처리방침" });
    assert.equal(privacy.getAttribute("href"), "#info/privacy");
    fireEvent.click(chat.getByRole("button", { name: "대시보드 만들기" }));
    assert.deepEqual(actions, ["open-create"]);
    assert.equal(page().queryByRole("dialog", { name: "AI 상담" }), null, "panel closes when an action runs");

    // 이전 대화를 함께 보낸다. 실패하면 다시 질문할 수 있다.
    fireEvent.click(page().getByRole("button", { name: "AI 챗봇 문의" }));
    mode = "fail";
    fireEvent.change(chat.getByLabelText("AI 챗봇 질문"), { target: { value: "무료인가요?" } });
    fireEvent.keyDown(chat.getByLabelText("AI 챗봇 질문"), { key: "Enter" });
    await waitFor(() => assert.ok(chat.getByText(/상담 서버에 연결하지 못했습니다/)));
    assert.equal(asked[1].history.length, 2);
    mode = "ok";
    fireEvent.click(chat.getByRole("button", { name: "다시 질문" }));
    await waitFor(() => assert.equal(asked.length, 3));

    // 처리 중 취소, 닫힌 상태의 진행 표시, Escape 닫기 후 초점 복원
    await waitFor(() => assert.equal(chat.queryByRole("status"), null));
    mode = "hold";
    fireEvent.click(shortcut("무료인가요?"));
    await waitFor(() => assert.ok(chat.getByText(/답변을 준비하고 있습니다/)));
    fireEvent.click(chat.getByRole("button", { name: "질문 취소" }));
    assert.ok(chat.getByText("질문을 취소했습니다."));
    mode = "ok";
    fireEvent.keyDown(chat.getByLabelText("AI 챗봇 질문"), { key: "Escape" });
    assert.equal(page().queryByRole("dialog", { name: "AI 상담" }), null);
    assert.equal(document.activeElement, page().getByRole("button", { name: "AI 챗봇 문의" }));
    cleanup();

    // 편집 화면: 수정 요청 → "AI 수정 열기" → 기존 AI 수정 창에 요청이 채워진다(자동 적용하지 않음).
    const { Workspace } = await server.ssrLoadModule("/src/dashboard/Workspace.tsx");
    render(<Workspace initial={createSample()} onBack={() => {}} />);
    fireEvent.click(page().getByRole("button", { name: "AI 챗봇 문의" }));
    const editorChat = within(page().getByRole("dialog", { name: "AI 상담" }));
    assert.ok(editorChat.getByText("대시보드 수정"));
    fireEvent.click(editorChat.getByRole("button", { name: "첫 번째 차트를 막대 차트로 바꿔줘" }));
    fireEvent.click(editorChat.getByRole("button", { name: "보내기" }));
    await waitFor(() => assert.ok(editorChat.getByRole("button", { name: "AI 수정 열기" })));
    assert.equal(asked.at(-1)!.page, "editor");
    assert.equal(editorChat.queryByRole("button", { name: "대시보드 만들기" }), null);
    const before = JSON.stringify(createSample().sections);
    fireEvent.click(editorChat.getByRole("button", { name: "AI 수정 열기" }));
    const instruction = await waitFor(() => page().getByLabelText("수정 요청") as HTMLTextAreaElement);
    assert.equal(instruction.value, "첫 번째 차트를 막대 차트로 바꿔줘");
    assert.equal(JSON.stringify(createSample().sections), before);
    assert.ok(page().getByRole("button", { name: "AI 수정 적용" }));
    assert.ok(!asked.some((item) => item.message === "/api/edit"), "chat never calls the edit API itself");

    // 툴바의 AI 수정은 빈 요청으로 연다.
    fireEvent.click(page().getByRole("button", { name: "닫기" }));
    fireEvent.click(page().getByRole("button", { name: "AI 수정" }));
    assert.equal((page().getByLabelText("수정 요청") as HTMLTextAreaElement).value, "");
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
    await server.close();
    dom.window.close();
  }
});
