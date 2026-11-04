import { test, expect } from "@playwright/test";
import { once } from "node:events";
import { CmsStore } from "../../../backend/src/cms";
import { createServer } from "node:http";
import { cmsRoute } from "../../../backend/src/cmsRoutes";
import { guideAnswer } from "../../../backend/src/chat/knowledge";
import { isMaster } from "../../../backend/src/masterSession";

test("master imports, edits, saves, publishes and restores; anonymous visitor sees only published content", async ({ page, context, browser }, info) => {
  const cms = new CmsStore(":memory:");
  await cms.setPassword("qa-master-password-123");
  const config = {cms, origin:"http://127.0.0.1:5174"};
  const server = createServer(async (req, res) => {
    if (req.url === "/api/usage") {
      const quota = {limit:3,used:3,pending:0,remaining:0,ipLimited:true};
      res.setHeader("Content-Type","application/json");
      res.end(JSON.stringify(isMaster(req,config) ? {exempt:true} : {observedAt:new Date().toISOString(),resetAt:new Date(Date.now()+3600000).toISOString(),generate:quota,edit:quota}));
      return;
    }
    if (!await cmsRoute(req, res, config, () => "127.0.0.1")) { res.writeHead(404); res.end(); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const visitor = await browser.newContext();
  for (const ctx of [context, visitor]) await ctx.route(/\/api\/(cms\/.*|usage)$/, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: api + url.pathname });
    await route.fulfill({ response });
  });
  const publicPage = await visitor.newPage();
  let editRequests = 0;
  await page.route("**/api/edit", async route => { editRequests++; await route.abort(); });
  await page.route("**/api/chat", async route => {
    const input = route.request().postDataJSON();
    await route.fulfill({ json: { ...guideAnswer(input.message, input.page), source: "guide", requestId: "cms-chat-qa" } });
  });
  try {
    await page.goto("/#create");
    await page.getByRole("button", {name:"AI 챗봇 문의",exact:true}).click();
    await page.getByLabel("AI 챗봇 질문").fill("마스터 게시 방법 알려줘");
    await page.getByRole("button", {name:"보내기",exact:true}).click();
    await expect(page.getByRole("log")).toContainText("서버 초안 저장");
    await page.getByRole("button", {name:"상담 창 닫기",exact:true}).click();
    await page.getByLabel("프로젝트 이름", {exact:true}).fill("마스터 검수 대시보드");
    await page.getByRole("button", {name:"샘플 미리보기 만들기"}).click();
    await expect(page.locator(".schema-dashboard")).toBeVisible();
    await page.goto("/admin");
    await page.getByLabel("비밀번호", {exact:true}).fill("qa-master-password-123");
    await page.getByRole("button", {name:"로그인",exact:true}).click();
    await expect(page.getByLabel("저장된 시안")).toBeVisible();
    const builder = await context.newPage();
    await builder.goto("http://127.0.0.1:5174/#create");
    await expect(builder.getByText("마스터 로그인 · AI 생성 일일 횟수 제한 없음",{exact:true})).toBeVisible();
    await builder.close();
    await page.getByLabel("저장된 시안").selectOption({label:"마스터 검수 대시보드"});
    await page.getByRole("button", {name:"서버 초안으로 가져오기"}).click();
    await expect(page.getByRole("alert")).toContainText("가져왔습니다");
    await publicPage.goto("http://127.0.0.1:5174/dashboard");
    await expect(publicPage.getByRole("status")).toContainText("아직 게시 전");
    page.on("dialog", dialog => dialog.accept());
    await page.getByRole("button", {name:"저장본 게시",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("게시했습니다");
    await publicPage.reload();
    await expect(publicPage.locator(".schema-dashboard")).toBeVisible();
    await page.getByRole("button", {name:"초안 편집",exact:true}).click();
    await page.getByRole("button", {name:"AI 챗봇 문의",exact:true}).click();
    await page.getByLabel("AI 챗봇 질문").fill("첫 번째 지표 제목을 새 지표로 바꿔줘");
    await page.getByRole("button", {name:"보내기",exact:true}).click();
    await page.getByRole("button", {name:"AI 수정 열기",exact:true}).click();
    await expect(page.getByLabel("수정 요청",{exact:true})).toHaveValue("첫 번째 지표 제목을 새 지표로 바꿔줘");
    expect(editRequests).toBe(0);
    await page.getByRole("dialog").getByRole("button", {name:"닫기",exact:true}).click();
    await expect(page.getByRole("button", {name:"AI 챗봇 문의",exact:true})).toBeVisible();
    await page.getByLabel("제목", {exact:true}).fill("관리자 변경 지표");
    await page.getByRole("button", {name:"변경 적용",exact:true}).click();
    await page.getByRole("button", {name:"서버 초안 저장",exact:true}).click();
    await expect(page.getByText(/서버 초안을 저장했습니다/)).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByText("관리자 변경 지표", {exact:true})).toHaveCount(0);
    await page.getByRole("button", {name:"관리 화면",exact:true}).click();
    await page.getByRole("button", {name:"저장본 미리보기",exact:true}).click();
    await expect(page.getByText("관리자 변경 지표",{exact:true})).toBeVisible();
    await page.getByRole("button", {name:"관리 화면으로",exact:true}).click();
    await page.getByRole("button", {name:"저장본 게시",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("게시했습니다");
    await publicPage.reload();
    await expect(publicPage.getByText("관리자 변경 지표",{exact:true})).toBeVisible();
    await expect(publicPage.locator(".db-select")).toHaveCount(0);
    await page.getByRole("button", {name:"이전 게시본 복원",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("복원했습니다");
    await publicPage.reload();
    await expect(publicPage.getByText("관리자 변경 지표",{exact:true})).toHaveCount(0);
    await page.screenshot({path:info.outputPath("master-admin.png"),fullPage:true});
    await page.getByRole("button", {name:"로그아웃",exact:true}).click();
    await expect(page.getByRole("button", {name:"로그인",exact:true})).toBeVisible();
    await page.goto("/#create");
    await expect(page.getByText(/AI 생성 오늘 0회 남음/)).toBeVisible();
    await expect(page.getByText(/마스터 로그인 ·/)).toHaveCount(0);
  } finally { await visitor.close(); server.close(); server.closeAllConnections(); cms.close(); }
});
