import { test, expect } from "@playwright/test";
import { defaultOptions } from "../src/create/contracts";

test("deleting in one tab closes another editor and prevents restoring the deleted project", async ({ page, context }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const url = page.url();
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByText(/다른 탭에서 이 프로젝트를 열고 있습니다/)).toBeVisible();
  await page.getByRole("button", { name: "홈", exact: true }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator(".draft-delete").click();
  await expect(other.getByText(/다른 탭에서 이 프로젝트를 삭제했습니다/)).toBeVisible();
  await expect(other.locator(".workspace-preview")).toHaveCount(0);
  await other.goto(url);
  await expect(other.getByText(/열려 있던 프로젝트를 복원할 수 없습니다/)).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("sebit-dashboard-schema-v01:")).length)).toBe(0);
});

test("image cleanup blocks with another tab, then removes unused images and preserves draft references", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "사용하지 않는 이미지 정리" })).toBeVisible();
  const options = defaultOptions();
  options.mainVisual.imageAssetId = "shared";
  await page.evaluate(async options => {
    localStorage.setItem("sebit-create-options-v1", JSON.stringify({ version: 1, options }));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("sebit-assets-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("images");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("images", "readwrite");
        tx.objectStore("images").put(new Blob(["unused"]), "unused");
        tx.objectStore("images").put(new Blob(["shared"]), "shared");
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });
  }, options);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("button", { name: "사용하지 않는 이미지 정리" })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "사용하지 않는 이미지 정리" }).click();
  await expect(page.getByText(/다른 탭이 열려 있어 이미지를 정리하지 않았습니다/)).toBeVisible();
  await other.close();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "사용하지 않는 이미지 정리" }).click();
  await expect(page.getByText(/사용하지 않는 이미지 1개를 정리했습니다/)).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "사용하지 않는 이미지 정리" }).click();
  await expect(page.getByText(/사용하지 않는 이미지 0개를 정리했습니다/)).toBeVisible();
});
