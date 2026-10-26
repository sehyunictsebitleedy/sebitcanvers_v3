import { test, expect } from "@playwright/test";

test("legend visibility survives chart switching, reload and undo", async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  const card = page.locator(".db-card.db-chart").first();
  await card.locator(".db-select").click();
  await expect(page.getByLabel("범례 표시", { exact: true })).toBeChecked();
  await page.getByLabel("범례 표시", { exact: true }).uncheck();
  await page.getByRole("button", { name: "입력 취소", exact: true }).click();
  await expect(page.getByLabel("범례 표시", { exact: true })).toBeChecked();
  await page.getByLabel("범례 표시", { exact: true }).uncheck();
  for (const chartType of ["line", "bar", "area", "donut"]) {
    await page.getByLabel("차트 종류", { exact: true }).selectOption(chartType);
    await page.getByRole("button", { name: "변경 적용", exact: true }).click();
    await expect(card.locator(".db-legend, .db-series")).toHaveCount(0);
    await expect(card.locator("svg")).toBeVisible();
  }
  await page.reload();
  await expect(card.locator(".db-legend, .db-series")).toHaveCount(0);
  await card.locator(".db-select").click();
  await expect(page.getByLabel("범례 표시", { exact: true })).not.toBeChecked();
  await page.getByLabel("범례 표시", { exact: true }).check();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(card.locator(".db-legend")).toBeVisible();
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect(card.locator(".db-legend")).toHaveCount(0);
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
});
