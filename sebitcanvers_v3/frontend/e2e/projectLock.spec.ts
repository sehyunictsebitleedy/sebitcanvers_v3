import { test, expect } from "@playwright/test";

test("one editor per project, retry loads latest, closing releases and different projects remain independent", async ({ page, context }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const url = page.url();
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByText(/다른 탭에서 이 프로젝트를 열고 있습니다/)).toBeVisible();
  await expect(other.getByRole("button", { name: "AI 수정", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByLabel("제목", { exact: true }).fill("잠금 소유 탭의 최신 제목");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  const read = () => page.evaluate(() => localStorage.getItem("sebit-dashboard-schema-v01:" + decodeURIComponent(location.hash.slice("#workspace/".length))));
  const saved = await read();
  await other.getByRole("button", { name: "다시 열기", exact: true }).click();
  await expect(other.getByText(/다른 탭의 편집 종료를 기다리고 있습니다/)).toBeVisible();
  expect(await read()).toBe(saved);
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await expect(other.getByLabel("제목", { exact: true })).toHaveValue("잠금 소유 탭의 최신 제목");
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  await expect(other.getByLabel("제목", { exact: true })).toBeEnabled();
  await other.close();
  await page.goto(url);
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("잠금 소유 탭의 최신 제목");
  await page.reload();
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("잠금 소유 탭의 최신 제목");
});

test("unsupported locking does not mount the saving editor or change a stored project", async ({ page, context }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const url = page.url();
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  const unsupported = await context.newPage();
  await unsupported.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
  await unsupported.goto(url);
  await expect(unsupported.getByText(/안전한 동시 편집 방지를 지원하지 않습니다/)).toBeVisible();
  await expect(unsupported.locator(".workspace")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
});
