import { test, expect } from "@playwright/test";

test("raw download, cancelled recovery, original recovery, version refusal and active-editor lock", async ({ page, context }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const url = page.url();
  const id = decodeURIComponent(url.split("#workspace/")[1]);
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await page.evaluate(id => localStorage.setItem("sebit-dashboard-schema-v01:" + id, "{broken"), id);
  await page.reload();
  await page.getByText("저장 문제 복구", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "저장 원문 내려받기" }).click();
  expect((await download).suggestedFilename()).toBe("project-recovery.json");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "최초 생성본으로 복구" }).click();
  expect(await page.evaluate(id => localStorage.getItem("sebit-dashboard-schema-v01:" + id), id)).toBe("{broken");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "최초 생성본으로 복구" }).click();
  await expect(page.getByText(/저장본을 복구했습니다/)).toBeVisible();
  expect(await page.evaluate(id => localStorage.getItem("sebit-dashboard-recovery-v1:" + id), id)).toBe("{broken");
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.locator(".workspace")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "최초 생성본으로 복구" }).click();
  await expect(page.getByText(/다른 탭에서 이 프로젝트를 열고 있습니다/)).toBeVisible();
  await other.close();
  await page.evaluate(id => {
    const key = "sebit-dashboard-schema-v01:" + id;
    const value = JSON.parse(localStorage.getItem(key)!); value.schemaVersion = "9.0";
    localStorage.setItem(key, JSON.stringify(value));
  }, id);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "최초 생성본으로 복구" }).click();
  await expect(page.getByText(/지원하지 않는 저장 버전입니다/)).toBeVisible();
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem("sebit-dashboard-schema-v01:" + id)!).schemaVersion, id)).toBe("9.0");
});
