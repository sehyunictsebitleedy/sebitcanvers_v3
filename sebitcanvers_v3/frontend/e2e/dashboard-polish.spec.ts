import { test, expect } from "@playwright/test";

for (const [style, type] of [["modern", "0"], ["minimal", "1"], ["corporate", "3"], ["dark", "4"]]) {
  test(`refined ${style} dashboard: readable layout at desktop sizes`, async ({ page }, info) => {
    await page.goto("/#create");
    await page.locator(`input[name="style"][value="${style}"]`).check();
    await page.locator(`input[name="dashboard-type"][value="${type}"]`).check();
    if (style === "corporate") await page.locator('input[name="navigation"][value="top"]').check();
    if (style === "minimal") await page.locator('input[name="density"][value="compact"]').check();
    await page.getByLabel("프로젝트 이름", {exact:true}).fill({modern:"방문 및 유입 분석",minimal:"팀 운영 관리",corporate:"프로젝트 운영현황",dark:"서비스 모니터링"}[style]!);
    await page.getByRole("button", {name:"샘플 미리보기 만들기"}).click();
    const dashboard = page.locator(".workspace-preview .schema-dashboard");
    await expect(dashboard).toBeVisible();
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({width, height:1080});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const card of await dashboard.locator(".db-card").all()) {
        expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
      if (width === 1440) await dashboard.screenshot({path:info.outputPath(`${style}.png`)});
    }
  });
}
