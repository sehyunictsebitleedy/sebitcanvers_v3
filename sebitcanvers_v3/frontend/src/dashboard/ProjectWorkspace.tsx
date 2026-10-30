import { useEffect, useState } from "react";
import { Workspace } from "./Workspace";
import { loadProject } from "./storage";
import type { DashboardSchema } from "./schema";

type Props = { initial: DashboardSchema; onBack: () => void; startInPreview?: boolean };
export function ProjectWorkspace(props: Props) {
  const [ready, setReady] = useState<{ schema: DashboardSchema; canWrite: () => boolean } | null>(null);
  const [message, setMessage] = useState("다른 탭에서 이 프로젝트를 열고 있습니다. 그 탭에서 홈으로 돌아가거나 탭을 닫으면 최신 저장 내용으로 자동으로 열립니다.");
  const [retry, setRetry] = useState(0);
  const [initial] = useState(props.initial);
  const [supported] = useState(() => !!navigator.locks);
  useEffect(() => {
    let cancelled = false;
    let held = false;
    let release: (() => void) | undefined;
    if (!supported) return;
    const waiting = new AbortController();
    void navigator.locks.request(`sebit-project-editor-v1:${initial.project.id}`, { mode: "exclusive", signal: waiting.signal }, async () => {
      if (cancelled) return;
      // Never mount the saving editor with the snapshot captured before waiting.
      const latest = loadProject(localStorage, initial.project.id) ?? initial;
      await new Promise<void>(resolve => {
        release = resolve;
        held = true;
        setReady({ schema: latest, canWrite: () => held && !cancelled });
      });
    }).catch(() => {
      if (!cancelled) setMessage("프로젝트를 안전하게 열지 못했습니다. 저장 데이터와 브라우저 설정을 확인해 주세요.");
    });
    return () => { cancelled = true; held = false; waiting.abort(); release?.(); };
  }, [initial, retry, supported]);
  if (ready) return <Workspace {...props} initial={ready.schema} canWrite={ready.canWrite}
    startInPreview={ready.schema.status === "finalized" || ready.schema.status === "exported" || (ready.schema.status === "generated" && !!ready.schema.settings.selections)} />;
  return <main className="container" style={{ padding: "48px 24px" }}>
    <h1>프로젝트 열기</h1>
    <p role="status">{supported ? message : "이 브라우저에서는 안전한 동시 편집 방지를 지원하지 않습니다. 최신 Chrome 또는 Edge의 HTTPS/로컬 주소로 접속해 주세요."}</p>
    <p>이 탭에서는 편집·AI 수정·재생성·복원을 시작하지 않으며, 다시 열 때 최신 저장 내용을 불러옵니다.</p>
    {supported && <button className="button primary" onClick={() => { setMessage("다른 탭의 편집 종료를 기다리고 있습니다."); setRetry(value => value + 1); }}>다시 열기</button>}{" "}
    <button className="button secondary" onClick={props.onBack}>홈으로 돌아가기</button>
  </main>;
}
