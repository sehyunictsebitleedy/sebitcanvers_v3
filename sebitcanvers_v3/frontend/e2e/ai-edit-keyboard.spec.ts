import { test, expect } from "@playwright/test";

test("empty AI instruction focuses and describes the field; Escape returns to opener", async ({ page }) => {
  let edits = 0;
  await page.route("**/api/usage", route => route.fulfill({ status: 503, json: {} }));
  await page.route("**/api/edit", route => { edits++; return route.fulfill({ status: 503, json: {} }); });
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  const opener = page.getByRole("button", { name: "AI 수정", exact: true });
  await opener.focus();
  await page.keyboard.press("Enter");
  const input = page.getByLabel("수정 요청", { exact: true });
  await input.fill("   ");
  await page.getByRole("button", { name: "AI 수정 적용", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(/수정 요청을 입력해 주세요/);
  expect(edits).toBe(0);
  await input.fill("차트 제목을 바꿔줘");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(opener).toBeFocused();
});
