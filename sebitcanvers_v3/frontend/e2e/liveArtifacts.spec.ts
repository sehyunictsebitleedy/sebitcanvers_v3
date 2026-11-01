import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";

// Opt-in replay of previously captured real AI output; no paid calls in Playwright.
test.skip(process.env.QA_LIVE_ARTIFACTS !== "1", "Run explicit capture first, then opt in to artifact verification.");
for (const [type, key] of [[0, "analytics"], [1, "admin"], [3, "project"], [4, "monitoring"]] as const) {
  test(`real AI ${key}: preview, persistence, ZIP and offline rendering`, async ({ page }, info) => {
    const base = new URL("../../../backend/test-results/live-schema/", import.meta.url);
    const manifest = JSON.parse(await readFile(new URL("manifest.json", base), "utf8"));
    expect(manifest.complete).toBe(true);
    expect(manifest.types).toEqual([0, 1, 3, 4]);
    const source = JSON.parse(await readFile(new URL(`${type}.json`, base), "utf8"));
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: {} }));
    await page.route("**/api/generate", route => route.fulfill({ json: { schema: source } }));
    await page.goto("/#create");
    const label = { 0: "분석", 1: "관리자", 3: "프로젝트", 4: "모니터링" }[type];
    await page.getByRole("group", { name: "대시보드 유형", exact: true }).getByRole("radio", { name: label, exact: true }).check();
    await page.getByLabel("프로젝트 이름", { exact: true }).fill("실제 AI 결과 검수");
    await page.locator(".create-submit button[type=button]").click();
    await expect(page.locator(".schema-dashboard")).toBeVisible();
    for (const width of [1280, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const svg of await page.locator(".db-donut-layout > svg").all()) {
        expect(await svg.evaluate(node => {
          const r = node.getBoundingClientRect(), c = node.closest(".db-card")!.getBoundingClientRect();
          return r.left >= c.left - 1 && r.right <= c.right + 1;
        })).toBe(true);
      }
      await page.screenshot({ path: info.outputPath(`preview-${width}.png`), fullPage: true });
    }
    await page.reload();
    await expect(page.locator(".schema-dashboard")).toBeVisible();
    await page.getByRole("button", { name: "확정 및 다운로드" }).click();
    await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "ZIP 다운로드", exact: true }).click();
    const zip = await JSZip.loadAsync(await readFile((await (await pending).path())!));
    const exported = JSON.parse(await zip.file("data/dashboard.json")!.async("string"));
    expect(exported.project.type).toBe(key);
    expect(exported.sections).toEqual(source.sections);
    expect(zip.file("THIRD_PARTY_NOTICES.txt")).not.toBeNull();
    const folder = info.outputPath("export");
    for (const [name, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const target = resolve(folder, name), rel = relative(folder, target);
      expect(rel.startsWith("..")).toBe(false); expect(isAbsolute(rel)).toBe(false);
      await mkdir(resolve(target, ".."), { recursive: true });
      await writeFile(target, await file.async("nodebuffer"));
    }
    await page.context().setOffline(true);
    await page.goto(pathToFileURL(resolve(folder, "index.html")).href);
    await expect(page.locator(".schema-dashboard")).toBeVisible();
    expect(await page.locator(".db-card").count()).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("offline-zip.png"), fullPage: true });
    expect(errors).toEqual([]);
  });
}
