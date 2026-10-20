import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

test("Create four types, viewport layout and persisted inputs", async ({
  page,
}, info) => {
  await page.goto("/#create");
  const types = page.getByRole("group", { name: "대시보드 유형", exact: true });
  await expect(types.getByRole("radio")).toHaveCount(4);
  await expect(page.getByText(/CRM/)).toHaveCount(0);
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`create-${width}.png`),
      fullPage: true,
    });
  }
  await types.getByRole("radio", { name: "프로젝트", exact: true }).check();
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("검수 프로젝트");
  await page.reload();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue(
    "검수 프로젝트",
  );
  await expect(
    types.getByRole("radio", { name: "프로젝트", exact: true }),
  ).toBeChecked();
});

test("sample → CMS data → finalize → real ZIP and file URL rendering", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#create");
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  await page.getByLabel("제목", { exact: true }).fill("검수 KPI");
  await page.getByLabel("값", { exact: true }).fill("12345");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await expect(page.locator(".db-card").getByText("12,345")).toBeVisible();
  await page
    .locator(".workspace-tree details")
    .nth(1)
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("button", { name: "데이터 편집", exact: true }).click();
  await page.getByLabel("라벨 1", { exact: true }).fill("검수 월");
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await page.screenshot({ path: info.outputPath("cms.png") });
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
  await page.screenshot({ path: info.outputPath("finalize.png") });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP 다운로드", exact: true }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  const schema = JSON.parse(
    await zip.file("data/dashboard.json")!.async("string"),
  );
  expect(schema.sections[0].components[0].title).toBe("검수 KPI");
  expect(schema.status).toBe("finalized");
  const folder = info.outputPath("export");
  await mkdir(folder, { recursive: true });
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const target = resolve(folder, name);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, await file.async("nodebuffer"));
  }
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            Object.keys(localStorage).find((k) =>
              k.startsWith("sebit-dashboard-schema-v01:"),
            )!,
          )!,
        ).status,
    ),
  ).toBe("editing");
  await page.goto(pathToFileURL(resolve(folder, "index.html")).href);
  await expect(page.getByText("검수 KPI")).toBeVisible();
  await expect(page.locator(".db-select")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("AI failure preserves options and offers retry and cancel", async ({
  page,
}) => {
  await page.route("**/api/generate", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "AI 설정이 필요합니다." }),
    });
  });
  await page.goto("/#create");
  await page.getByLabel("프로젝트 이름", { exact: true }).fill("실패 복원");
  await page.getByRole("button", { name: "AI 대시보드 생성" }).click();
  await expect(page.getByRole("alert")).toContainText("AI 설정");
  await page.getByRole("button", { name: "조건 수정하기" }).click();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue(
    "실패 복원",
  );
  await page.unroute("**/api/generate");
  await page.route("**/api/generate", () => {});
  await page.getByRole("button", { name: "AI 대시보드 생성" }).click();
  await page
    .getByRole("button", { name: "생성 취소 · 조건으로 돌아가기" })
    .click();
  await expect(page.getByLabel("프로젝트 이름", { exact: true })).toHaveValue(
    "실패 복원",
  );
});

test("AI success passes additional request and enters persisted Preview", async ({
  page,
}) => {
  await page.route("**/api/generate", async (route) => {
    const options = route.request().postDataJSON();
    expect(options.additionalRequest).toBe("학교별 학습 현황");
    const schema = JSON.parse(
      await readFile(resolve("src/dashboard/sample.json"), "utf8"),
    );
    schema.project.id = "ai-success";
    schema.project.name = options.name;
    schema.settings.selections = options;
    schema.header.title = "학교별 학습 현황";
    await route.fulfill({ json: { schema, repaired: false } });
  });
  await page.goto("/#create");
  await page.getByLabel("추가 요청").fill("학교별 학습 현황");
  await page.getByRole("button", { name: "AI 대시보드 생성" }).click();
  await expect(page.locator(".db-heading h2")).toHaveText("학교별 학습 현황");
  await expect(page.locator(".workspace-properties")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("sebit-dashboard-schema-v01:ai-success")!,
        ).settings.selections.additionalRequest,
    ),
  ).toBe("학교별 학습 현황");
});

test("image upload, table/progress/notification edits and missing asset Finalize recovery", async ({
  page,
}, info) => {
  await page.goto("/#create");
  await page.getByRole("checkbox", { name: "진행률", exact: true }).check();
  await page.getByRole("checkbox", { name: "알림", exact: true }).check();
  await page.getByRole("checkbox", { name: "사용하기", exact: true }).check();
  const png = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#397ce8";
      ctx.fillRect(0, 0, 32, 32);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("button", { name: "샘플 미리보기 만들기" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "샘플 미리보기 만들기" }).click();
  await page.getByRole("button", { name: "편집으로 돌아가기" }).click();
  const tree = page.locator(".workspace-tree");
  await tree
    .getByRole("button", { name: "프로젝트 완료율", exact: true })
    .click();
  await page.getByLabel("진행 값", { exact: true }).fill("85");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await tree.getByRole("button", { name: "검토 요청", exact: true }).click();
  await page.getByLabel("알림 문구").fill("검수 완료 알림");
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await tree
    .getByRole("button", { name: "최근 프로젝트", exact: true })
    .click();
  await page.getByRole("button", { name: "데이터 편집", exact: true }).click();
  await page
    .getByRole("dialog", { name: "데이터 편집기" })
    .locator("tbody input")
    .first()
    .fill("수정한 프로젝트");
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await page.getByRole("button", { name: "변경 적용", exact: true }).click();
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByText("모든 검사를 통과했습니다.")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "ZIP 다운로드", exact: true }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(await readFile((await download.path())!));
  expect(zip.file("assets/main-visual.png")).not.toBeNull();
  const saved = JSON.parse(
    await zip.file("data/dashboard.json")!.async("string"),
  );
  const components = saved.sections.flatMap(
    (s: { components: unknown[] }) => s.components,
  );
  expect(
    components.find((c: { type: string }) => c.type === "progress").value,
  ).toBe(85);
  expect(
    components.find((c: { type: string }) => c.type === "notification").message,
  ).toBe("검수 완료 알림");
  expect(
    components.find((c: { type: string }) => c.type === "table").rows[0].name ??
      Object.values(
        components.find((c: { type: string }) => c.type === "table").rows[0],
      )[0],
  ).toBe("수정한 프로젝트");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("sebit-assets-v1", 1);
        r.onsuccess = () => {
          const db = r.result;
          const t = db.transaction("images", "readwrite");
          t.objectStore("images").clear();
          t.oncomplete = () => {
            db.close();
            resolve();
          };
          t.onerror = () => reject(t.error);
        };
      }),
  );
  await page.getByRole("button", { name: "확정 및 다운로드" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "이미지",
  );
  await expect(
    page.getByRole("button", { name: "ZIP 다운로드", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("finalize-missing-image.png"),
  });
  await page.getByRole("button", { name: "수정하기", exact: true }).click();
  await expect(page.getByLabel("비주얼 제목")).toBeVisible();
});
