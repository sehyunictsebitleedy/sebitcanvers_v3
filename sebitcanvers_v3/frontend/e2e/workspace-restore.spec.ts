import { test, expect } from "@playwright/test";

test("reload restores edited project; history restores the correct project", async ({ page }) => {
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("첫 번째 작업");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page).toHaveURL(/#workspace\/.+/);
  const firstUrl = page.url();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByLabel("제목", { exact: true }).fill("저장된 KPI");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await page.reload();
  await expect(page.locator(".workspace-project h1")).toHaveText("첫 번째 작업");
  await expect(page.getByLabel("제목", { exact: true })).toHaveValue("저장된 KPI");
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await page.reload();
  await expect(page.locator(".workspace")).toHaveCount(0);
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("두 번째 작업");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  const secondUrl = page.url();
  expect(secondUrl).not.toBe(firstUrl);
  await page.goto(firstUrl);
  await expect(page.locator(".workspace-project h1")).toHaveText("첫 번째 작업");
  await page.goBack();
  await expect(page.locator(".workspace-project h1")).toHaveText("두 번째 작업");
  await page.reload();
  await expect(page.locator(".workspace-project h1")).toHaveText("두 번째 작업");
});

test("missing or corrupt project falls back without overwriting storage", async ({ page }) => {
  await page.goto("/#workspace/missing");
  await expect(page.getByText(/열려 있던 프로젝트를 복원할 수 없습니다/)).toBeVisible();
  await page.evaluate(() => localStorage.setItem("sebit-dashboard-schema-v01:broken", "invalid-json"));
  await page.goto("/#workspace/broken");
  await page.reload();
  await expect(page.locator(".workspace")).toHaveCount(0);
  await expect(page.getByText(/열려 있던 프로젝트를 복원할 수 없습니다/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sebit-dashboard-schema-v01:broken"))).toBe("invalid-json");
  await page.goto("/#workspace/%E0%A4%A");
  await expect(page.getByText(/열려 있던 프로젝트를 복원할 수 없습니다/)).toBeVisible();
});

test("reload preserves finalized status and opens preview", async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
  const saved = () => page.evaluate(() => {
    const id = decodeURIComponent(location.hash.slice("#workspace/".length));
    return localStorage.getItem("sebit-dashboard-schema-v01:" + id);
  });
  const before = await saved();
  await page.reload();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  expect(await saved()).toBe(before);
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await expect.poll(async () => JSON.parse((await saved())!).status).toBe("editing");
});
