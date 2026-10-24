import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

test("menu order, visibility and icons survive undo, reload and export", async ({ page }, info) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByRole("button", { name: "전체 설정", exact: true }).click();
  const labels = page.locator(".db-menu-label");
  const original = await labels.allTextContents();
  await page.getByLabel("메뉴 1 이름", { exact: true }).fill("숨긴 메뉴");
  await page.getByLabel("메뉴 1 표시", { exact: true }).uncheck();
  await page.getByLabel("메뉴 2 이름", { exact: true }).fill("업무 현황");
  await page.getByLabel("메뉴 2 아이콘", { exact: true }).selectOption("folder");
  await page.getByRole("button", { name: "메뉴 2 위로", exact: true }).click();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(labels.first()).toHaveText("업무 현황");
  await expect(page.locator(".db-nav-items > .active")).toHaveText("업무 현황");
  await expect(page.locator(".db-menu-icon")).toHaveCount(1);
  await expect(labels).toHaveCount(original.length - 1);
  await page.getByRole("button", { name: "실행 취소" }).click();
  expect(await labels.allTextContents()).toEqual(original);
  // Undo restored the original; reapply using the opposite move control.
  await page.getByLabel("메뉴 1 아래로", { exact: true }).click();
  await page.getByLabel("메뉴 1 아이콘", { exact: true }).selectOption("chart");
  await page.getByLabel("메뉴 2 표시", { exact: true }).uncheck();
  await page.getByLabel("메뉴 위치", { exact: true }).selectOption("top");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await page.reload();
  await expect(page.locator(".schema-dashboard")).toHaveClass(/db-nav-top/);
  await expect(labels.first()).toHaveText(original[1]);
  await expect(page.locator(".db-menu-icon")).toHaveCount(1);
  await page.getByRole("button", { name: "전체 설정", exact: true }).click();
  await expect(page.getByLabel("메뉴 2 표시", { exact: true })).not.toBeChecked();
  await page.getByLabel("메뉴 3 표시", { exact: true }).uncheck();
  await expect(page.getByLabel("메뉴 1 표시", { exact: true })).toBeDisabled();
  await page.getByLabel("메뉴 3 표시", { exact: true }).check();
  await page.getByLabel("메뉴 1 이름", { exact: true }).fill("긴메뉴".repeat(40));
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.locator(".schema-dashboard").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.locator(".db-nav").screenshot({ path: info.outputPath("navigation-top.png") });
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP 다운로드", exact: true }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await downloading).path())!));
  const html = await zip.file("index.html")!.async("string");
  expect(html).toContain("db-menu-icon");
  const saved = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
  expect(saved.navigation.items[0].icon).toBe("chart");
  expect(saved.navigation.items[1].visible).toBe(false);
});
