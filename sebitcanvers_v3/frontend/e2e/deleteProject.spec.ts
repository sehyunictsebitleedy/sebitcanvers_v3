import { test, expect } from "@playwright/test";

test("project deletion confirms, cleans stored snapshots, preserves other projects and cannot restore the deleted URL", async ({ page }) => {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(page.locator(".workspace-preview")).toBeVisible();
  const projectUrl = page.url();
  const id = await page.evaluate(() => decodeURIComponent(location.hash.slice("#workspace/".length)));
  await page.evaluate(id => {
    localStorage.setItem("sebit-dashboard-backup-v1:" + id, localStorage.getItem("sebit-dashboard-schema-v01:" + id)!);
    const list = JSON.parse(localStorage.getItem("sebit-canvers-drafts-v1")!);
    list.push({ id: "another", name: "다른 프로젝트", type: 3, date: new Date().toISOString() });
    localStorage.setItem("sebit-canvers-drafts-v1", JSON.stringify(list));
  }, id);
  await page.getByRole("button", { name: "홈", exact: true }).click();
  await expect(page.locator(".draft-entry")).toHaveCount(2);
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator(".draft-delete").first().click();
  await expect(page.locator(".draft-entry")).toHaveCount(2);
  expect(await page.evaluate(id => localStorage.getItem("sebit-dashboard-schema-v01:" + id), id)).not.toBeNull();
  page.once("dialog", dialog => dialog.accept());
  await page.locator(".draft-delete").first().click();
  await expect(page.locator(".draft-entry")).toHaveCount(1);
  await expect(page.locator(".draft-card")).toContainText("다른 프로젝트");
  for (const prefix of ["sebit-dashboard-schema-v01:", "sebit-dashboard-initial-v1:", "sebit-dashboard-backup-v1:"]) {
    expect(await page.evaluate(({ prefix, id }) => localStorage.getItem(prefix + id), { prefix, id })).toBeNull();
  }
  await page.reload();
  await expect(page.locator(".draft-entry")).toHaveCount(1);
  await page.goto(projectUrl);
  await expect(page.getByText(/열려 있던 프로젝트를 복원할 수 없습니다/)).toBeVisible();
  await expect(page.locator(".workspace-preview")).toHaveCount(0);
  await page.screenshot({ path: "test-results/project-delete-home.png", fullPage: true });
});
