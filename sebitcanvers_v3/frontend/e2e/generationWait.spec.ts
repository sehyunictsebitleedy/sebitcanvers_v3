import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const sample = JSON.parse(readFileSync(new URL("../src/dashboard/sample.json", import.meta.url), "utf8"));

test("elapsed wait, cancellation, retained options and retry ignore late results", async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  let finishFirst!: () => void;
  const firstPending = new Promise<void>(resolve => { finishFirst = resolve; });
  await page.route("**/api/generate", async route => {
    requests++;
    if (requests === 1) await firstPending;
    await route.fulfill({ json: { schema: sample } }).catch(() => {});
  });
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("대기 검수");
  await page.locator(".create-submit button[type=button]").click();
  await expect.poll(() => requests).toBe(1);
  await page.clock.fastForward(61000);
  await expect(page.getByRole("timer")).toContainText("61초");
  await expect(page.getByText(/예상보다 오래 걸리고 있습니다/)).toBeVisible();
  await page.getByRole("button", { name: "생성 취소 · 조건으로 돌아가기" }).click();
  await expect(page.getByText(/생성을 취소했습니다/)).toBeVisible();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue("대기 검수");
  finishFirst();
  await expect(page.locator(".workspace-preview")).toHaveCount(0);
  await page.locator(".create-submit button[type=button]").click();
  await expect(page).toHaveURL(/#workspace\//);
  await expect(page.getByRole("button", { name: "홈", exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test("client timeout and server timeout have a distinct retryable state", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/generate", () => {});
  await page.goto("/#create");
  await page.locator(".create-submit button[type=button]").click();
  await page.clock.fastForward(126000);
  await expect(page.getByRole("heading", { name: "생성 대기 시간이 초과됐어요" })).toBeVisible();
  await page.unroute("**/api/generate");
  await page.route("**/api/generate", route => route.fulfill({ status: 504, json: { code: "TIMEOUT", error: "timeout" } }));
  await page.getByRole("button", { name: "다시 생성", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("서버의 생성 대기 시간");
  await page.getByRole("button", { name: "조건 수정하기" }).click();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toBeVisible();
});

test("connection failure and malformed response are distinguished", async ({ page }) => {
  await page.route("**/api/generate", route => route.abort("failed"));
  await page.goto("/#create");
  await page.locator(".create-submit button[type=button]").click();
  await expect(page.getByRole("heading", { name: "생성 서버에 연결하지 못했어요" })).toBeVisible();
  await page.unroute("**/api/generate");
  await page.route("**/api/generate", route => route.fulfill({ json: null }));
  await page.getByRole("button", { name: "다시 생성", exact: true }).click();
  await expect(page.getByRole("heading", { name: "생성 결과를 확인하지 못했어요" })).toBeVisible();
});
