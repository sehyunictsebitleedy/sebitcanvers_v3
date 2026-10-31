import { test, expect } from "@playwright/test";

test("footer routes, reload, history, skip link and Create draft stay intact", async ({ page }) => {
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("안내 이동 후 복원");
  await page.locator(".site-footer").getByRole("link", { name: "개인정보처리방침", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("개인정보처리방침");
  await expect(page.getByLabel("정책 검토 상태")).toContainText("공개 전 검토본");
  await expect(page).toHaveTitle(/개인정보처리방침/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("개인정보처리방침");
  await page.getByRole("link", { name: "본문으로 이동" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#info\/privacy$/);
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("navigation", { name: "이용 안내 메뉴" }).getByRole("link", { name: "이용약관", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("이용약관");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("개인정보처리방침");
  await page.getByRole("button", { name: "대시보드 만들기", exact: true }).click();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue("안내 이동 후 복원");
});

test("service guidance and licenses are available without AI requests at PC widths", async ({ page }) => {
  let aiCalls=0;
  page.on("request", request => { if (/\/api\/(generate|edit)$/.test(request.url())) aiCalls++; });
  await page.goto("/#info/service");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("서비스 안내");
  await page.getByText("라이선스 원문 보기", { exact: true }).click();
  await expect(page.locator(".license-text")).toContainText("Lucide");
  await expect(page.locator(".license-text")).toContainText("Cole Bemis");
  for (const width of [1280,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole("link", {name:"홈으로 돌아가기", exact:true}).click();
  await expect(page.locator(".hero-section")).toBeVisible();
  expect(aiCalls).toBe(0);
});
