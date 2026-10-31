import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

const types = ["분석", "관리자", "프로젝트", "모니터링"];
const keys = ["analytics", "admin", "project", "monitoring"];
const styles = ["Modern", "Minimal", "Corporate", "Dark"];
const widths = [1280, 1366, 1440, 1920];
for (const [typeIndex, type] of types.entries()) for (const [styleIndex, style] of styles.entries()) {
  const width = widths[(typeIndex + styleIndex) % widths.length];
  test(`${type} / ${style} / ${width}px production sample and ZIP`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // This suite validates built UI artifacts without invoking a paid provider.
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "QA offline" } }));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#create");
    await page.getByRole("group", { name: "대시보드 유형", exact: true }).getByRole("radio", { name: type, exact: true }).check();
    await page.getByRole("group", { name: "스타일", exact: true }).getByRole("radio", { name: style, exact: true }).check();
    await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
    await expect(page.locator(".schema-dashboard")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Canvas may scroll horizontally; chart graphics must still fit inside their cards.
    for (const svg of await page.locator(".db-donut-layout > svg").all()) {
      expect(await svg.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const card = node.closest(".db-card")!.getBoundingClientRect();
        return rect.left >= card.left - 1 && rect.right <= card.right + 1;
      })).toBe(true);
    }
    await page.screenshot({ path: info.outputPath("preview.png") });
    await page.getByRole("button", { name: "확정 및 다운로드" }).click();
    await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "ZIP 다운로드", exact: true }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await downloaded).path())!));
    const schema = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
    expect(schema.project.type).toBe(keys[typeIndex]);
    expect(schema.theme.preset).toBe(style.toLowerCase());
    expect(zip.file("THIRD_PARTY_NOTICES.txt")).not.toBeNull();
    expect(errors).toEqual([]);
  });
}
