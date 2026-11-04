import { test, expect } from "@playwright/test";

test("home examples show distinct type layouts and retain the selected creation type", async ({ page }, info) => {
  await page.goto("/");
  const examples = [
    { name: "분석", first: "이번 달 방문", detail: "채널별 성과" },
    { name: "관리자", first: "팀 멤버 및 접근 권한", detail: "일별 접근 활동" },
    { name: "프로젝트", first: "예정", detail: "누적 완료 작업" },
    { name: "모니터링", first: "서비스 응답 시간", detail: "서비스 상태" },
  ];
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const [index, item] of examples.entries()) {
      await page.locator(".template-card").filter({ hasText: `${item.name} 대시보드` }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".db-card").first()).toContainText(item.first);
      await expect(dialog).toContainText(item.detail);
      if (item.name === "프로젝트") {
        const columns = dialog.locator(".db-section").first().locator(".db-table");
        await expect(columns).toHaveCount(3);
        const boxes = await columns.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
        expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(2);
      }
      await dialog.getByLabel("미리보기 조회 기간").selectOption("previous");
      await expect(dialog.locator(".db-card").first()).toContainText(item.first);
      if (width === 1440) await dialog.screenshot({path: info.outputPath(`example-${index}.png`)});
      await dialog.getByRole("button", {name:"닫기",exact:true}).click();
    }
  }
  await page.locator(".template-card").filter({hasText:"프로젝트 대시보드"}).click();
  await page.getByRole("button", {name:"이 유형으로 편집 시작"}).click();
  await expect(page).toHaveURL(/#create/);
  await expect(page.locator('input[name="dashboard-type"][value="3"]')).toBeChecked();
});
