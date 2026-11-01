import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
});

test("data dialog restores focus on Escape, cancel and apply without committing cancelled edits", async ({ page }) => {
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.locator(".db-card.db-chart").first().locator(".db-select").click();
  const opener = page.getByRole("button", { name: "데이터 편집", exact: true });
  const dialog = page.getByRole("dialog", { name: "데이터 편집기" });
  for (const action of ["escape", "cancel", "apply"]) {
    await opener.focus();
    await page.keyboard.press("Enter");
    const label = dialog.getByLabel("라벨 1", { exact: true });
    const before = await label.inputValue();
    await label.fill("키보드 검수");
    if (action === "escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: action === "cancel" ? "데이터 취소" : "데이터 적용", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(label).toHaveValue(action === "apply" ? "키보드 검수" : before);
    await page.keyboard.press("Escape");
  }
});

test("finalize dialog restores keyboard focus after close and Escape", async ({ page }) => {
  const opener = page.getByRole("button", { name: "확정 및 다운로드", exact: true });
  for (const action of ["close", "escape"]) {
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
    if (action === "escape") await page.keyboard.press("Escape");
    else await page.getByRole("dialog").getByRole("button", { name: "닫기", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});
