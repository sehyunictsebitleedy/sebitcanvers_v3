import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const stored = (page: Page) =>
  page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("sebit-dashboard-schema-v01:"),
    )!;
    return JSON.parse(localStorage.getItem(key)!);
  });
async function sample(page: Page) {
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await expect(
    page.getByRole("button", { name: "AI 수정", exact: true }),
  ).toBeVisible();
}

test("AI edit preserves CMS data, summarizes changes, undoes and invalidates Finalize", async ({
  page,
}, info) => {
  await sample(page);
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByLabel("값", { exact: true }).fill("4321");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  const baseline = await stored(page);
  const id = baseline.sections[0].components[0].id;
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.route("**/api/edit", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.schema.sections[0].components[0].value).toBe(4321);
    expect(body.targetId).toBe(id);
    await route.fulfill({
      json: {
        baseRevision: body.baseRevision,
        patch: {
          operations: [
            {
              action: "update",
              targetId: id,
              changes: { title: "AI 운영 지표" },
            },
          ],
        },
        summary: ["do not trust this text"],
      },
    });
  });
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await page.getByLabel("수정 범위").selectOption("selected");
  await page
    .getByLabel("수정 요청", { exact: true })
    .fill("제목을 AI 운영 지표로 변경");
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await expect(
    page.getByRole("region", { name: "AI 변경 요약" }),
  ).toContainText("제목 변경");
  await expect(page.getByText("do not trust this text")).toHaveCount(0);
  const changed = await stored(page);
  expect(changed.status).toBe("editing");
  expect(changed.sections[0].components[0].value).toBe(4321);
  expect(changed.sections[0].components[0].title).toBe("AI 운영 지표");
  await page.screenshot({ path: info.outputPath("ai-edit-success.png") });
  await page.getByRole("button", { name: "최근 변경 실행 취소" }).click();
  expect((await stored(page)).sections).toEqual(baseline.sections);
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await expect(
    page.getByRole("region", { name: "AI 변경 요약" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByLabel("값", { exact: true }).fill("9876");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  expect((await stored(page)).sections[0].components[0].title).toBe(
    "AI 운영 지표",
  );
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  expect((await stored(page)).sections[0].components[0]).toMatchObject({
    title: "AI 운영 지표",
    value: 4321,
  });
});

test("failed, invalid and stale AI edit responses preserve the complete saved snapshot", async ({
  page,
}) => {
  await sample(page);
  const baseline = await stored(page);
  const targetId = baseline.sections[0].components[0].id;
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await page.getByLabel("수정 요청", { exact: true }).fill("수정 검수");
  for (const mode of ["failure", "invalid", "stale"]) {
    await page.route("**/api/edit", async (route) => {
      const request = route.request().postDataJSON();
      if (mode === "failure")
        await route.fulfill({
          status: 503,
          json: { error: "AI 서버 설정이 필요합니다." },
        });
      else
        await route.fulfill({
          json: {
            baseRevision: mode === "stale" ? "stale" : request.baseRevision,
            patch: {
              operations: [
                {
                  action: "update",
                  targetId,
                  changes: { title: "적용되면 안 됨" },
                },
                ...(mode === "invalid"
                  ? [
                      {
                        action: "themeChange",
                        changes: { primary: "invalid-color" },
                      },
                    ]
                  : []),
              ],
            },
          },
        });
    });
    await page.getByRole("button", { name: "AI 수정 적용" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect(await stored(page)).toEqual(baseline);
    await page.unroute("**/api/edit");
  }
});

test("pending edit locks conflicting actions and cancellation ignores late result", async ({
  page,
}) => {
  await sample(page);
  const baseline = await stored(page);
  let release: () => void = () => {};
  const waiting = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/edit", async (route) => {
    const body = route.request().postDataJSON();
    await waiting;
    await route
      .fulfill({
        json: {
          baseRevision: body.baseRevision,
          patch: {
            operations: [
              { action: "headerChange", changes: { title: "늦은 응답" } },
            ],
          },
        },
      })
      .catch(() => {});
  });
  await page.getByRole("button", { name: "AI 수정", exact: true }).click();
  await page.getByLabel("수정 요청", { exact: true }).fill("제목 수정");
  const sent = page.waitForRequest("**/api/edit");
  await page.getByRole("button", { name: "AI 수정 적용" }).click();
  await sent;
  await expect(
    page
      .locator(".workspace-actions")
      .getByRole("button", { name: "AI 수정", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("수정 요청", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "수정 취소", exact: true }).click();
  release();
  await expect(page.getByRole("alert")).toContainText("취소");
  expect(await stored(page)).toEqual(baseline);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "편집으로 돌아가기" }),
  ).toBeEnabled();
});
