import { test, expect } from "@playwright/test";

test("summary card can be added, undone, edited and restored after reload", async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByRole("button", { name: "요약 카드 추가" }).click();
  await expect(page.locator(".db-summary-content")).toHaveCount(1);
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect(page.locator(".db-summary-content")).toHaveCount(0);
  await page.getByRole("button", { name: "요약 카드 추가" }).click();
  await page.getByLabel("표시 값", { exact: true }).fill("이번 주 42건");
  await page.getByLabel("요약 설명", { exact: true }).fill("진행 중인 업무를 검토했습니다.");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(page.locator(".db-summary-content")).toContainText("이번 주 42건");
  await page.reload();
  await expect(page.locator(".db-summary-content")).toContainText("진행 중인 업무를 검토했습니다.");
  await page.setViewportSize({ width: 1280, height: 1000 });
  const card = page.locator(".db-summary-content");
  expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
});
