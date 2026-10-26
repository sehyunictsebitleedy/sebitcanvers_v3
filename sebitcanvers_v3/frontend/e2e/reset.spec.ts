import { test, expect } from "@playwright/test";

test("reset confirms, survives reload, restores original content and can recover pre-reset work", async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  const readCurrent = () => page.evaluate(() => JSON.parse(localStorage.getItem(
    "sebit-dashboard-schema-v01:" + decodeURIComponent(location.hash.slice("#workspace/".length)))!));
  const original = await readCurrent();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByLabel("제목", { exact: true }).fill("초기화 전 작업");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await page.reload();
  const edited = await readCurrent();
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "최초 생성 상태로 초기화", exact: true }).click();
  expect(await readCurrent()).toEqual(edited);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "최초 생성 상태로 초기화", exact: true }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const reset = await readCurrent();
  expect(reset.sections).toEqual(original.sections);
  expect(reset.project.id).toBe(original.project.id);
  expect(reset.status).toBe("editing");
  await page.reload();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "이전 디자인 복원", exact: true }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  expect((await readCurrent()).sections).toEqual(edited.sections);
  await page.evaluate(() => localStorage.removeItem("sebit-dashboard-initial-v1:" + decodeURIComponent(location.hash.slice("#workspace/".length))));
  await page.reload();
  await expect(page.getByRole("button", { name: "최초 생성 상태로 초기화", exact: true })).toBeDisabled();
  await expect(page.getByText("최초 생성본 없음 · 이 프로젝트는 초기화할 수 없습니다.")).toBeVisible();
  expect((await readCurrent()).sections).toEqual(edited.sections);
});
