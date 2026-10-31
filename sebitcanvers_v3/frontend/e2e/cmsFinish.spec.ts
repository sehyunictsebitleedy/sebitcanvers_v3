import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
});

test("height, field errors, tree visibility, persistence and undo", async ({ page }) => {
  const card = page.locator(".db-card.db-kpi").first();
  await card.locator(".db-select").click();
  const title = await page.getByLabel("제목", { exact: true }).inputValue();
  await expect(page.getByRole("group", { name: "레이아웃", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "스타일", exact: true })).toBeVisible();
  await page.getByLabel("높이", { exact: true }).selectOption("large");
  await page.getByLabel("너비", { exact: true }).selectOption("4");
  await page.getByLabel("값", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(page.getByLabel("값", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("값", { exact: true })).toBeFocused();
  await expect(page.getByRole("alert")).toContainText("숫자");
  await page.getByLabel("값", { exact: true }).fill("12");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(card).toHaveCSS("min-height", "400px");
  await page.reload();
  await expect(card).toHaveCSS("min-height", "400px");
  const tree = page.locator(".workspace-tree");
  await tree.getByRole("button", { name: `${title} 숨기기`, exact: true }).click();
  await expect(page.locator(".db-card").filter({ has: page.getByRole("heading", { name: title, exact: true }) })).toHaveCount(0);
  await expect(tree.getByRole("button", { name: `${title} 표시하기`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "실행 취소" }).click();
  await expect(card).toHaveCSS("min-height", "400px");
  await card.locator(".db-select").click();
  await page.getByLabel("높이", { exact: true }).selectOption("auto");
  await page.getByRole("button", { name: "입력 취소", exact: true }).click();
  await expect(page.getByLabel("높이", { exact: true })).toHaveValue("large");
});

test("global and data grid errors identify and focus the specific input", async ({ page }) => {
  await page.locator(".workspace-tree").getByRole("button", { name: "전체 설정", exact: true }).click();
  await page.getByLabel("강조색", { exact: true }).fill("bad");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(page.getByLabel("강조색", { exact: true })).toBeFocused();
  await expect(page.getByLabel("강조색", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "입력 취소", exact: true }).click();
  await expect(page.getByLabel("강조색", { exact: true })).not.toHaveAttribute("aria-invalid", "true");
  await page.locator(".db-card.db-chart").first().locator(".db-select").click();
  await page.getByRole("button", { name: "데이터 편집", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "데이터 편집기" });
  await dialog.getByLabel("차트 색상", { exact: true }).first().fill("bad");
  await dialog.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(dialog.getByLabel("차트 색상", { exact: true }).first()).toBeFocused();
  await expect(dialog.getByRole("alert")).toContainText("HEX");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("tree cannot hide the last visible data component", async ({ page }) => {
  const tree = page.locator(".workspace-tree");
  const hide = tree.getByRole("button", { name: / 숨기기$/ });
  while (await hide.count() > 1) await hide.first().click();
  await hide.first().click();
  await expect(page.getByText("마지막 표시 데이터는 숨길 수 없습니다. 현재 작업은 유지됩니다.")).toBeVisible();
  await expect(hide).toHaveCount(1);
  await expect(page.locator(".db-card")).toHaveCount(1);
});
