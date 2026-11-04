import { useEffect, useState } from "react";
import { Workspace } from "../dashboard/Workspace";
import { DashboardRenderer } from "../dashboard/Renderer";
import { dashboardSchema } from "../dashboard/schema";
import type { DashboardSchema } from "../dashboard/schema";
import { draftsStorageKey, loadProject } from "../dashboard/storage";
import { request, pack, hydrate } from "./client";
import type { Bundle, CmsState } from "./client";
import "../App.css";
import "./cms.css";

export function PublicDashboard() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request<Bundle>("public").then(value => {
      dashboardSchema.parse(value.schema);
      if (active) { setBundle(value); document.title = value.schema.header.title; }
    }).catch(() => { if (active) setError("게시된 대시보드를 불러오지 못했습니다. 아직 게시 전이거나 서버 연결을 확인해야 합니다."); });
    return () => { active = false; };
  }, []);
  return bundle ? <main className="cms-public"><DashboardRenderer schema={bundle.schema} assetUrls={bundle.assets} /></main> : <main className="cms-shell"><p role="status">{error || "게시된 대시보드를 불러오고 있습니다."}</p><a href="/">홈으로</a></main>;
}

export function AdminPage() {
  const [session, setSession] = useState<{ configured: boolean; authenticated: boolean; csrf: string | null } | null>(null);
  const [state, setState] = useState<CmsState | null>(null);
  const [editing, setEditing] = useState<DashboardSchema | null>(null);
  const [preview, setPreview] = useState<Bundle | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [localId, setLocalId] = useState("");
  const [local] = useState(() => {
    try {
      const rows: unknown = JSON.parse(localStorage.getItem(draftsStorageKey) ?? "[]");
      if (!Array.isArray(rows)) return [];
      return rows.flatMap(row => {
        if (typeof row?.id !== "string") return [];
        try { const schema = loadProject(localStorage, row.id); return schema ? [{ id: row.id, name: schema.project.name }] : []; } catch { return []; }
      });
    } catch { return []; }
  });
  useEffect(() => {
    document.title = "마스터 관리 | SEbit Canvers";
    let active = true;
    request<NonNullable<typeof session>>("session").then(async value => {
      if (!active) return; setSession(value);
      if (value.authenticated) { const data = await request<CmsState>("state"); if (active) setState(data); }
    }).catch(() => { if (active) setMessage("서버에 연결하지 못했습니다. 새로고침해 다시 시도하세요."); });
    return () => { active = false; };
  }, []);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMessage("");
    try { await work(); } catch (error) { setMessage(error instanceof Error ? error.message : "작업을 완료하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const save = async (schema: DashboardSchema) => {
    if (!state || !session?.csrf) throw new Error("다시 로그인하세요.");
    const next = await request<CmsState>("save", { revision: state.revision, bundle: await pack(schema) }, session.csrf);
    setState(next);
  };
  if (editing) return <Workspace initial={editing} managed={{ save }} onBack={() => setEditing(null)} />;
  if (preview) return <main><div className="cms-toolbar"><button className="button secondary" onClick={() => setPreview(null)}>관리 화면으로</button><span>서버에 저장된 초안 미리보기 · 공개 화면에는 아직 반영되지 않았습니다.</span></div><DashboardRenderer schema={preview.schema} assetUrls={preview.assets} /></main>;
  return <main className="cms-shell">
    <header className="cms-heading"><div><p>SEbit Canvers</p><h1>마스터 관리</h1></div><a href="/">제작 홈으로</a></header>
    <p>대시보드 1개를 운영합니다. 초안을 편집·저장하고 확인한 뒤 게시하세요.</p>
    {message && <p role="alert" className="cms-message">{message}</p>}
    {!session ? <p role="status">로그인 상태를 확인하고 있습니다.</p> : !session.configured ? <section className="cms-panel"><h2>마스터 계정 설정이 필요합니다</h2><p>서버 터미널에서 <code>npm.cmd --prefix backend run admin:setup</code>을 실행해 비밀번호를 설정한 뒤 새로고침하세요.</p><p>아이디는 master이며 회원가입은 제공하지 않습니다.</p></section> : !session.authenticated ? <form className="cms-panel cms-login" onSubmit={event => {
      event.preventDefault(); void run(async () => {
        const login = await request<{csrf: string}>("login", { username: "master", password });
        setPassword(""); setSession({ configured: true, authenticated: true, csrf: login.csrf }); setState(await request<CmsState>("state"));
      });
    }}><h2>마스터 로그인</h2><label>아이디<input value="master" autoComplete="username" readOnly /></label><label>비밀번호<input type="password" autoComplete="current-password" minLength={12} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="button primary" disabled={busy}>로그인</button></form> : <>
      <div className="cms-toolbar"><a className="button secondary" href="/dashboard" target="_blank" rel="noopener noreferrer">공개 화면 보기</a><button className="button secondary" disabled={busy} onClick={() => void run(async () => { setState(await request<CmsState>("state")); setMessage("최신 서버 내용을 불러왔습니다."); })}>서버 내용 새로고침</button><button className="button secondary" disabled={busy} onClick={() => void run(async () => { await request("logout", {}, session.csrf!); setState(null); setSession({ ...session, authenticated: false, csrf: null }); })}>로그아웃</button></div>
      {state && <>
        <section className="cms-panel"><h2>서버 초안</h2><p>{state.draft ? state.draft.schema.project.name : "아직 저장된 초안이 없습니다."}</p>
          <div className="cms-toolbar"><button className="button primary" disabled={busy || !state.draft} onClick={() => void run(async () => { setEditing(await hydrate(state.draft!)); })}>초안 편집</button><button className="button secondary" disabled={busy || !state.draft} onClick={() => setPreview(state.draft)}>저장본 미리보기</button><button className="button primary" disabled={busy || !state.draft} onClick={() => {
            if (!window.confirm("서버에 저장된 초안을 공개 화면에 게시할까요?")) return;
            void run(async () => { setState(await request<CmsState>("publish", { revision: state.revision }, session.csrf!)); setMessage("게시했습니다. 공개 화면을 새로고침하면 확인할 수 있습니다."); });
          }}>저장본 게시</button></div>
        </section>
        <section className="cms-panel"><h2>현재 브라우저의 시안 가져오기</h2><p>선택한 시안과 이미지를 서버 초안으로 복사합니다. 현재 게시본은 게시 버튼을 누르기 전까지 유지됩니다.</p>
          <label>저장된 시안<select value={localId} onChange={e => setLocalId(e.target.value)}><option value="">시안을 선택하세요</option>{local.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {!local.length && <p>제작 홈에서 시안을 만든 뒤 이 페이지를 다시 열어 주세요.</p>}
          <button className="button secondary" disabled={busy || !localId} onClick={() => {
            if (state.draft && !window.confirm("기존 서버 초안을 선택한 시안으로 교체할까요?")) return;
            void run(async () => { const schema = loadProject(localStorage, localId); if (!schema) throw new Error("시안을 찾을 수 없습니다."); await save(schema); setMessage("서버 초안으로 가져왔습니다."); });
          }}>서버 초안으로 가져오기</button>
        </section>
        <section className="cms-panel"><h2>게시 관리</h2><p>{state.published ? `게시 중: ${state.published.schema.project.name}` : "게시 전입니다."}</p><p>이전 게시본은 1개 보관합니다. 복원은 공개 화면만 변경하며 현재 초안은 유지합니다.</p>
          <button className="button secondary" disabled={busy || !state.previous} onClick={() => {
            if (!window.confirm("공개 화면을 이전 게시본으로 복원할까요?")) return;
            void run(async () => { setState(await request<CmsState>("restore", { revision: state.revision }, session.csrf!)); setMessage("이전 게시본으로 복원했습니다."); });
          }}>이전 게시본 복원</button>
        </section>
      </>}
    </>}
  </main>;
}
