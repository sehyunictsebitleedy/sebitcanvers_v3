import { test, expect } from "@playwright/test";

const quota = (used: number, pending = 0, ipLimited = false) => ({ limit: 5, used, pending, remaining: Math.max(0, 5 - used - pending), ipLimited });
const snapshot = (used = 2, pending = 0, ipLimited = false) => ({ observedAt: "2026-10-29T12:00:00Z", resetAt: "2026-10-29T15:00:00Z", generate: quota(used, pending, ipLimited), edit: { limit: 20, used: 1, pending: 0, remaining: 19, ipLimited: false } });

test("generation and edit display separate usage and refresh after failures, success and cancellation", async ({ page }) => {
  let data = snapshot();
  await page.route("**/api/usage", route => route.fulfill({ json: data }));
  await page.goto("/#create");
  await expect(page.getByRole("region", { name: "AI 생성 사용량" })).toContainText("오늘 3회 남음 / 5회");
  await expect(page.getByRole("region", { name: "AI 생성 사용량" })).toContainText("2026. 10. 30. 00:00 (한국시간)");
  let release!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/generate", async route => {
    await waiting;
    await route.fulfill({ status: 502, json: { error: "테스트 실패" } }).catch(() => {});
  });
  data = snapshot(2, 1);
  await page.locator(".create-submit button[type=button]").click();
  await expect(page.getByRole("region", { name: "AI 생성 사용량" })).toContainText("오늘 2회 남음 / 5회 · 성공 2회 · 처리 중 1회");
  data = snapshot(2);
  release();
  await expect(page.getByRole("alert")).toContainText("테스트 실패");
  await expect(page.getByRole("region", { name: "AI 생성 사용량" })).toContainText("오늘 3회 남음");
  await page.getByRole("button", { name: "조건 수정하기" }).click();
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await expect(page.getByRole("region", { name: "AI 수정 사용량" })).toContainText("오늘 19회 남음 / 20회");
  await page.route("**/api/edit", route => {
    data = { ...data, edit: { limit: 20, used: 2, pending: 0, remaining: 18, ipLimited: false } };
    return route.fulfill({ json: { baseRevision: route.request().postDataJSON().baseRevision, patch: { operations: [{ action: "headerChange", changes: { title: "사용량 검수" } }] } } });
  });
  await page.getByLabel("수정 요청", { exact: true }).fill("제목 수정");
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await expect(page.getByRole("region", { name: "AI 변경 요약" })).toBeVisible();
  await expect(page.getByRole("region", { name: "AI 수정 사용량" })).toContainText("오늘 18회 남음");
  await page.unroute("**/api/edit");
  await page.route("**/api/edit", () => {});
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await page.getByRole("button", { name: "수정 취소", exact: true }).click();
  await expect(page.getByRole("region", { name: "AI 수정 사용량" })).toContainText("오늘 18회 남음");
});

test("quota exhausted, shared-IP restriction and unavailable usage remain distinct; samples stay usable", async ({ page }) => {
  let unavailable = false;
  let data = snapshot(5, 0, true);
  await page.route("**/api/usage", route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: data }));
  await page.goto("/#create");
  const panel = page.getByRole("region", { name: "AI 생성 사용량" });
  await expect(panel).toContainText("오늘 0회 남음");
  await expect(panel).toContainText("현재 네트워크의 일일 보조 한도");
  unavailable = true;
  await panel.getByRole("button", { name: "사용량 새로고침" }).click();
  await expect(panel).toContainText("사용량을 확인하지 못했습니다");
  await expect(panel).not.toContainText("0회 남음");
  unavailable = false;
  data = snapshot(0);
  await panel.getByRole("button", { name: "사용량 새로고침" }).click();
  await expect(panel).toContainText("오늘 5회 남음");
  await expect(page.getByRole("button", { name: "샘플 미리보기 만들기" })).toBeEnabled();
  await page.screenshot({ path: "test-results/usage-notice.png", fullPage: true });
});
