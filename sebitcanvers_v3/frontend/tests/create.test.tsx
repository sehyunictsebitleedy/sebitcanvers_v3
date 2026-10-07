import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import JSZip from "jszip";
import { indexedDB } from "fake-indexeddb";
import {
  createDraftKey,
  defaultOptions,
  readCreateDraft,
  readyOptionsSchema,
  saveCreateDraft,
} from "../src/create/contracts";
import {
  buildDashboard,
  accents,
  stylePresets,
} from "../src/create/buildDashboard";
import { validateDashboard } from "../src/dashboard/schema";
import { DashboardRenderer } from "../src/dashboard/Renderer";
import { saveImage, getAsset } from "../src/create/assets";
import { createExportFiles, createExportZip } from "../src/dashboard/export";

const now = "2026-10-07T00:00:00.000Z";
const css = readFileSync(
  new URL("../src/dashboard/renderer.css", import.meta.url),
  "utf8",
);
test("all type/style/color/navigation/density combinations generate valid, distinct configured samples", () => {
  for (const type of [0, 1, 3, 4])
    for (const style of ["modern", "minimal", "corporate", "dark"] as const)
      for (const color of ["blue", "green", "purple", "neutral"] as const)
        for (const navigation of ["sidebar", "top"] as const)
          for (const density of ["compact", "standard", "spacious"] as const) {
            const options = {
              ...defaultOptions(type),
              style,
              color,
              navigation,
              density,
            };
            const schema = buildDashboard(options, "project-test", now);
            assert.ok(validateDashboard(schema).success);
            assert.equal(schema.theme.primary, accents[color]);
            assert.equal(schema.theme.radius, stylePresets[style].radius);
            assert.equal(schema.navigation.type, navigation);
            assert.equal(
              schema.layout.gap,
              { compact: 12, standard: 20, spacious: 32 }[density],
            );
            assert.deepEqual(schema.settings.selections, options);
          }
});
test("each component works alone and an empty selection cannot generate", () => {
  for (const type of [
    "kpi",
    "chart",
    "table",
    "progress",
    "notification",
  ] as const) {
    const schema = buildDashboard(
      { ...defaultOptions(), components: [type] },
      "component-test",
      now,
    );
    assert.ok(
      schema.sections
        .flatMap((section) => section.components)
        .every((component) => component.type === type),
    );
    assert.ok(
      !renderToStaticMarkup(<DashboardRenderer schema={schema} />).includes(
        "db-invalid",
      ),
    );
  }
  assert.throws(() =>
    buildDashboard({ ...defaultOptions(), components: [] }, "bad", now),
  );
  assert.throws(() => defaultOptions(2));
  assert.ok(
    !readyOptionsSchema.safeParse({ ...defaultOptions(), name: " " }).success,
  );
});
test("Main Visual variants, CTA validation, inactive fields and requests behave predictably", () => {
  for (const type of ["banner", "hero", "image-text"] as const) {
    const options = defaultOptions();
    options.mainVisual = {
      ...options.mainVisual,
      enabled: true,
      type,
      height: "large",
      alignment: "right",
      cta: {
        enabled: true,
        label: "프로젝트 보기",
        url: "https://example.com/projects",
      },
    };
    options.additionalRequest =
      "이 요청은 저장만 하고 샘플에는 자동 반영하지 않습니다.";
    const schema = buildDashboard(options, "visual-test", now);
    const html = renderToStaticMarkup(<DashboardRenderer schema={schema} />);
    assert.ok(html.includes("db-visual-large"));
    assert.ok(html.includes("text-align:right"));
    assert.ok(html.includes("https://example.com/projects"));
    assert.ok(!html.includes(options.additionalRequest));
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "file:///secret",
      "https://name:pass@example.com",
    ]) {
      options.mainVisual.cta.url = url;
      assert.ok(!readyOptionsSchema.safeParse(options).success);
    }
    options.mainVisual.enabled = false;
    const disabled = buildDashboard(options, "disabled-test", now);
    assert.ok(
      !renderToStaticMarkup(<DashboardRenderer schema={disabled} />).includes(
        "db-visual-copy",
      ),
    );
    assert.equal(
      disabled.settings.selections?.mainVisual.cta.url,
      "https://name:pass@example.com",
    );
  }
});
test("create drafts retain incomplete inputs and reject corrupt or unsupported data", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  const options = { ...defaultOptions(4), name: "", components: [] };
  saveCreateDraft(storage, options);
  assert.deepEqual(readCreateDraft(storage), options);
  store.set(createDraftKey, "{bad");
  assert.throws(() => readCreateDraft(storage));
  store.set(createDraftKey, JSON.stringify({ version: 999, options }));
  assert.throws(() => readCreateDraft(storage));
  assert.throws(() =>
    saveCreateDraft(
      {
        setItem() {
          throw new Error("quota");
        },
      },
      options,
    ),
  );
});
test("uploaded image persists in IndexedDB and is embedded as a real ZIP asset; invalid images fail", async () => {
  Object.assign(globalThis, { indexedDB });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS3sAAAAASUVORK5CYII=",
    "base64",
  );
  const id = await saveImage(
    new File([png], "pixel.png", { type: "image/png" }),
  );
  assert.equal((await getAsset(id))?.size, png.length);
  const options = defaultOptions();
  options.mainVisual.enabled = true;
  options.mainVisual.imageAssetId = id;
  const schema = buildDashboard(options, "asset-test", now);
  schema.status = "finalized";
  assert.throws(() => createExportFiles(schema, css), /누락/);
  const zip = await JSZip.loadAsync(await createExportZip(schema, css));
  assert.deepEqual(
    Buffer.from(await zip.file("assets/main-visual.png")!.async("uint8array")),
    png,
  );
  const html = await zip.file("index.html")!.async("string");
  assert.ok(html.includes('src="assets/main-visual.png"'));
  assert.ok(!html.includes("blob:"));
  schema.mainVisual.imageAssetId = "missing-asset";
  await assert.rejects(createExportZip(schema, css));
  await assert.rejects(
    saveImage(new File(["<svg/>"], "test.svg", { type: "image/svg+xml" })),
  );
  await assert.rejects(
    saveImage(new File(["not png"], "fake.png", { type: "image/png" })),
  );
  await assert.rejects(
    saveImage(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "huge.png", {
        type: "image/png",
      }),
    ),
  );
});
test("Create UI synchronizes summary, restores options, blocks empty components and preserves corrupt drafts", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/#create",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { render, screen, within, fireEvent, cleanup, waitFor } =
    await import("@testing-library/react");
  const server = await createServer({
    server: { middlewareMode: true, hmr: { port: 0 } },
    appType: "custom",
  });
  try {
    const { CreatePage } = await server.ssrLoadModule(
      "/src/create/CreatePage.tsx",
    );
    let result: unknown = null;
    render(
      <CreatePage
        onHome={() => {}}
        onStart={(schema: unknown) => {
          result = schema;
        }}
      />,
    );
    assert.equal(
      within(screen.getByRole("group", { name: "대시보드 유형" })).getAllByRole(
        "radio",
      ).length,
      4,
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "프로젝트", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "상단 메뉴", exact: true }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Corporate", exact: true }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "그린", exact: true }));
    fireEvent.click(
      screen.getByRole("radio", { name: "여유롭게", exact: true }),
    );
    fireEvent.change(screen.getByLabelText("추가 요청 선택"), {
      target: { value: "주간 프로젝트 현황" },
    });
    const summary = screen.getByRole("complementary", {
      name: "현재 선택 요약",
    });
    assert.ok(within(summary).getByText("프로젝트", { selector: "dd" }));
    assert.ok(within(summary).getByText("Corporate", { selector: "dd" }));
    assert.equal(readCreateDraft(localStorage)?.navigation, "top");
    cleanup();
    render(
      <CreatePage
        onHome={() => {}}
        onStart={(schema: unknown) => {
          result = schema;
        }}
      />,
    );
    assert.equal(
      (screen.getByRole("radio", { name: "Corporate" }) as HTMLInputElement)
        .checked,
      true,
    );
    for (const name of ["KPI 카드", "차트", "테이블"])
      fireEvent.click(screen.getByRole("checkbox", { name, exact: true }));
    fireEvent.click(
      screen.getByRole("button", { name: "샘플 미리보기 만들기" }),
    );
    assert.equal(result, null);
    assert.ok(screen.getAllByRole("alert").length);
    fireEvent.click(screen.getByRole("checkbox", { name: "진행률" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "사용하기" }));
    fireEvent.change(screen.getByLabelText("비주얼 제목"), {
      target: { value: "주간 운영현황" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "사용하기" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "사용하기" }));
    assert.equal(
      (screen.getByLabelText("비주얼 제목") as HTMLInputElement).value,
      "주간 운영현황",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "샘플 미리보기 만들기" }),
    );
    await waitFor(() => assert.ok(result));
    assert.ok(validateDashboard(result).success);
    cleanup();
    localStorage.setItem(createDraftKey, "{broken");
    render(<CreatePage onHome={() => {}} onStart={() => {}} />);
    fireEvent.change(screen.getByLabelText("프로젝트 이름"), {
      target: { value: "복구 작업" },
    });
    assert.equal(localStorage.getItem(createDraftKey), "{broken");
    fireEvent.click(
      screen.getByRole("button", { name: "기존 데이터 백업 후 저장" }),
    );
    assert.equal(localStorage.getItem(createDraftKey + "-recovery"), "{broken");
    assert.equal(readCreateDraft(localStorage)?.name, "복구 작업");
  } finally {
    cleanup();
    await server.close();
    dom.window.close();
  }
});
