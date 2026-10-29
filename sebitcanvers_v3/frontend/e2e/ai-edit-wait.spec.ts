import { test, expect } from "@playwright/test";

test("AI edit wait, cancel and retry preserve request and reject late results", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await page.getByLabel("수정 요청", { exact: true }).fill("제목 수정");
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  await page.route("**/api/edit", async route => {
    const number = ++calls;
    const body = route.request().postDataJSON();
    if (number === 1) await waiting;
    await route.fulfill({ json: { baseRevision: body.baseRevision, patch: { operations: [
      { action: "headerChange", changes: { title: number === 1 ? "취소한 제목" : "재시도 제목" } }
    ] } } }).catch(() => {});
  });
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await expect.poll(() => calls).toBe(1);
  await page.clock.fastForward(61000);
  await expect(page.getByRole("timer")).toContainText("61초");
  await expect(page.getByText(/예상보다 오래 걸리고 있습니다/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/수정을 취소했습니다/)).toBeVisible();
  await expect(page.getByLabel("수정 요청", { exact: true })).toHaveValue("제목 수정");
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  release();
  await expect(page.getByRole("region", { name: "AI 변경 요약" })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith("sebit-dashboard-schema-v01:"))!)!));
  expect(saved.header.title).toBe("재시도 제목");
});

test("edit client timeout, server timeout, network and malformed response preserve stored data", async ({ page }) => {
  await page.clock.install();
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  const read = () => page.evaluate(() => localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith("sebit-dashboard-schema-v01:"))!));
  const baseline = await read();
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await page.getByLabel("수정 요청", { exact: true }).fill("제목 수정");
  for (const mode of ["client", "server", "network", "invalid"]) {
    await page.route("**/api/edit", route => mode === "client" ? undefined : mode === "network" ? route.abort("failed") : route.fulfill(mode === "server"
      ? { status: 504, json: { code: "TIMEOUT" } }
      : { body: "not json", contentType: "text/plain" }));
    await page.getByRole("button", { name: "AI 수정 적용" }).click();
    if (mode === "client") await page.clock.fastForward(126000);
    await expect(page.getByRole("alert")).toContainText(mode === "network" ? "연결하지 못했습니다" : mode === "invalid" ? "응답이 올바르지 않습니다" : "시간이 초과");
    expect(await read()).toBe(baseline);
    await page.unroute("**/api/edit");
  }
});
