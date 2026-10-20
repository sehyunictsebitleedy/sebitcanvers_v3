import { test, expect } from "@playwright/test";

test("regenerate, cancel, replace and restore a durable design", async ({ page }) => {
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("원본 프로젝트");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  const readCurrent = () => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith("sebit-dashboard-schema-v01:"))!;
    return JSON.parse(localStorage.getItem(key)!);
  });
  const original = await readCurrent();
  await page.getByRole("button", { name: "재생성", exact: true }).click();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue("원본 프로젝트");
  await page.getByRole("button", { name: "기존 디자인으로 돌아가기" }).click();
  expect(await readCurrent()).toEqual(original);
  await page.getByRole("button", { name: "재생성", exact: true }).click();
  await page.route("**/api/generate", route => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: "Generation unavailable" }),
  }));
  page.once("dialog", dialog => dialog.accept());
  await page.locator('.create-submit button[type="button"]').click();
  await expect(page.getByText("생성을 완료하지 못했어요")).toBeVisible();
  expect(await readCurrent()).toEqual(original);
  await page.getByRole("button", { name: "조건 수정하기" }).click();
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("새 디자인");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  expect(await readCurrent()).toEqual(original);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-project h1")).toHaveText("새 디자인");
  expect((await readCurrent()).project.id).toBe(original.project.id);
  // Reopen the project to ensure restore does not depend on component state.
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await page.reload();
  await page.getByText("새 디자인", { exact: true }).click();
  await expect(page.getByRole("button", { name: "이전 디자인 복원" })).toBeEnabled();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "이전 디자인 복원" }).click();
  await expect(page.locator(".workspace-project h1")).toHaveText("원본 프로젝트");
  expect((await readCurrent()).sections).toEqual(original.sections);
});
