import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { createSample } from "../src/dashboard/samples";
import { loadProject } from "../src/dashboard/storage";

test("workspace applies KPI edits, rejects invalid input, undoes, previews and preserves unsaved state on storage failure", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { render, screen, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { Workspace } = await server.ssrLoadModule(
      "/src/dashboard/Workspace.tsx",
    );
    render(<Workspace initial={createSample()} onBack={() => {}} />);
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "우리 팀 매출" },
    });
    fireEvent.change(screen.getByLabelText("값"), {
      target: { value: "345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 적용" }));
    assert.ok(screen.getByText("345,678"));
    assert.equal(
      loadProject(localStorage, "sample-analytics")?.sections[0].components[0]
        .title,
      "우리 팀 매출",
    );
    fireEvent.change(screen.getByLabelText("값"), {
      target: { value: "not a number" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 적용" }));
    assert.ok(screen.getByRole("alert"));
    assert.ok(screen.getByText("345,678"));
    fireEvent.click(screen.getByRole("button", { name: "실행 취소" }));
    assert.ok(screen.getByText("128,430"));
    fireEvent.click(
      screen.getByRole("button", { name: "미리보기", exact: true }),
    );
    assert.equal(document.querySelectorAll(".db-select").length, 0);
    assert.equal(screen.queryByLabelText("제목"), null);
    fireEvent.click(screen.getByRole("button", { name: "편집으로 돌아가기" }));
    const original = dom.window.Storage.prototype.setItem;
    dom.window.Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    fireEvent.change(screen.getByLabelText("값"), {
      target: { value: "876543" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 적용" }));
    assert.ok(screen.getByText("876,543"));
    assert.ok(screen.getByText(/저장 실패:/));
    dom.window.Storage.prototype.setItem = original;
    fireEvent.click(screen.getByRole("button", { name: "다시 저장" }));
    assert.ok(screen.getByText("브라우저에 저장됨"));
    const saved = loadProject(localStorage, "sample-analytics")!;
    cleanup();
    render(<Workspace initial={saved} onBack={() => {}} />);
    assert.ok(screen.getByText("876,543"));
    cleanup();
    Object.assign(globalThis, { ResizeObserver: class { observe() {} disconnect() {} } });
    dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    localStorage.setItem('sebit-canvers-drafts-v1', JSON.stringify([
      { id: 'legacy-crm', name: '이전 CRM 작업', type: 2, date: '2026-09-30T00:00:00.000Z' },
      { id: 'legacy-project', name: '이전 프로젝트 작업', type: 3, date: '2026-09-30T00:00:00.000Z' },
      { id: 'legacy-monitor', name: '이전 모니터링 작업', type: 4, date: '2026-09-30T00:00:00.000Z' },
    ]));
    render(<App/>);
    assert.equal(document.querySelectorAll('.template-card').length, 4);
    assert.equal(screen.queryByText('이전 CRM 작업'), null);
    assert.ok(screen.getByText('이전 프로젝트 작업'));
    assert.ok(screen.getByText('이전 모니터링 작업'));
    fireEvent.click(screen.getAllByRole('button', { name: '대시보드 만들기' })[0]);
    assert.equal(screen.getAllByRole('radio').length, 4);
    assert.equal(screen.queryByRole('radio', { name: 'CRM' }), null);
    fireEvent.click(screen.getByRole('radio', { name: '모니터링' }));
    fireEvent.change(screen.getByLabelText('프로젝트 이름'), { target: { value: '통합 검증 프로젝트' } });
    fireEvent.click(screen.getByRole('button', { name: '샘플 편집 시작' }));
    await waitFor(() => assert.ok(screen.getByRole('heading', { name: '통합 검증 프로젝트' })));
    const savedList = JSON.parse(localStorage.getItem('sebit-canvers-drafts-v1')!);
    assert.ok(savedList.some((item: { id: string }) => item.id === 'legacy-crm'));
    assert.equal(loadProject(localStorage, savedList[0].id)?.project.type, 'monitoring');
    fireEvent.change(screen.getByLabelText('값'), { target: { value: '246810' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    fireEvent.click(screen.getByRole('button', { name: '홈', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: /통합 검증 프로젝트.*작업 열기/ }));
    await waitFor(() => assert.ok(screen.getByText('246,810')));
  } finally {
    cleanup();
    await server.close();
    dom.window.close();
  }
});
