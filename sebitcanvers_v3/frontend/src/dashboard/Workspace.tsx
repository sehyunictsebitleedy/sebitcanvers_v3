import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Eye, Pencil, Undo2 } from "lucide-react";
import { DashboardRenderer } from "./Renderer";
import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";
import { loadBackup, loadInitialSnapshot, replaceProject, saveProject } from "./storage";
import { resetProject } from "./reset";
import { CreatePage } from "../create/CreatePage";
import { dashboardTypes, defaultOptions } from "../create/contracts";
import { ComponentForm } from "./ComponentForm";
import { GlobalForm } from "./GlobalForm";
import { addActivity, addButton, addStatusBadge, addSummary, arrangeComponent, editSnapshot, replaceComponent } from "./editing";
import { validateFinalization } from "./finalize";
import type { FinalizeIssue } from "./finalize";
import { AiEditDrawer } from "./AiEditDrawer";
import rendererCss from "./renderer.css?raw";
import "./renderer.css";
import "./workspace.css";

export function Workspace({
  initial,
  onBack,
  startInPreview = false,
}: {
  initial: DashboardSchema;
  onBack: () => void;
  startInPreview?: boolean;
}) {
  const [schema, setSchema] = useState(() =>
    !startInPreview && ["finalized", "exported"].includes(initial.status)
      ? editSnapshot(initial, {})
      : dashboardSchema.parse(initial),
  );
  const [previous, setPrevious] = useState<DashboardSchema | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [hasInitial] = useState(() => {
    try { return !!loadInitialSnapshot(localStorage, initial.project.id); }
    catch { return false; }
  });
  const [hasBackup, setHasBackup] = useState(() => {
    try { return !!loadBackup(localStorage, initial.project.id); }
    catch { return false; }
  });
  const [selected, setSelected] = useState(
    initial.sections.flatMap((s) => s.components)[0]?.id ?? "global",
  );
  const [preview, setPreview] = useState(startInPreview);
  const [storageStatus, setStorageStatus] = useState("저장 대기");
  const [exportStatus, setExportStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [issues, setIssues] = useState<FinalizeIssue[]>([]);
  const [finalized, setFinalized] = useState<{
    schema: DashboardSchema;
    bytes: Uint8Array;
  } | null>(null);
  const [modal, setModal] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const latestSchema = useRef(schema);
  useEffect(() => {
    latestSchema.current = schema;
  }, [schema]);
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const initialRef = useRef(schema);
  const save = (data: DashboardSchema) => {
    try {
      saveProject(localStorage, data);
      setUnsaved(false);
      setStorageStatus("브라우저에 저장됨");
      return true;
    } catch {
      setUnsaved(true);
      setStorageStatus(
        "저장 실패: 현재 작업은 메모리에 유지됩니다. 다시 저장하거나 ZIP을 다운로드하세요.",
      );
      return false;
    }
  };
  useEffect(() => {
    save(initialRef.current);
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [modal]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (unsaved || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [unsaved, busy]);
  const commit = (next: DashboardSchema, fromAi = false) => {
    if (lock.current && !fromAi) return false;
    setPrevious(schema);
    setSchema(next);
    save(next);
    setFinalized(null);
    setIssues([]);
    setExportStatus("");
    return true;
  };
  const patch = (value: Partial<DashboardSchema>) => {
    try {
      return commit(editSnapshot(schema, value));
    } catch {
      return false;
    }
  };
  const undo = () => {
    if (!previous || lock.current) return;
    const next = editSnapshot(previous, {});
    setSchema(next);
    setPrevious(null);
    setFinalized(null);
    save(next);
    setExportStatus("이전 정상 상태로 복원했습니다.");
  };
  const arrange = (action: "up" | "down" | "delete") => {
    try {
      commit(arrangeComponent(schema, selected, action));
      if (action === "delete") setSelected("global");
    } catch {
      setExportStatus(
        "이동 범위 또는 마지막 표시 항목을 확인해 주세요. 현재 작업은 유지됩니다.",
      );
    }
  };
  const finalize = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setModal(true);
    setIssues([]);
    setFinalized(null);
    setExportStatus("구조·데이터·이미지·렌더링·ZIP 생성 검사 중…");
    try {
      const result = await validateFinalization(schema);
      if (result.issues.length) {
        setIssues(result.issues);
        setExportStatus("검증에 실패했습니다. 항목을 수정해 주세요.");
        return;
      }
      const snapshot = dashboardSchema.parse({
        ...result.schema,
        status: "finalized",
      });
      const { createExportZip } = await import("./export");
      // Complete rendering and ZIP creation before persisting finalized status.
      const bytes = await createExportZip(snapshot, rendererCss);
      setSchema(snapshot);
      save(snapshot);
      setFinalized({ schema: snapshot, bytes });
      setExportStatus(
        "최종 검증을 통과했습니다. ZIP을 다운로드할 수 있습니다.",
      );
    } catch (error) {
      setIssues([
        {
          target: "global",
          message:
            error instanceof Error
              ? error.message
              : "렌더링 또는 ZIP 검증에 실패했습니다.",
        },
      ]);
      setExportStatus("확정하지 못했습니다. 기존 작업은 유지됩니다.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const download = async () => {
    if (!finalized || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const { exportFilename } = await import("./export");
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(finalized.bytes)], {
          type: "application/zip",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFilename(finalized.schema.project.name);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      const exported = dashboardSchema.parse({
        ...finalized.schema,
        status: "exported",
      });
      setSchema(exported);
      save(exported);
      setExportStatus(
        "ZIP을 브라우저에 전달했습니다. 압축을 풀고 index.html을 여세요.",
      );
    } catch {
      setExportStatus(
        "다운로드에 실패했습니다. 확정된 결과로 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const enterEditor = (target?: string) => {
    if (lock.current) return;
    if (["finalized", "exported"].includes(schema.status)) {
      const next = editSnapshot(schema, {});
      setSchema(next);
      save(next);
    }
    setFinalized(null);
    setPreview(false);
    setModal(false);
    if (target) setSelected(target);
  };
  const components = schema.sections.flatMap((s) => s.components);
  const component = components.find((c) => c.id === selected);
  const acceptReplacement = (next: DashboardSchema) => {
    setSchema(next);
    setPrevious(null);
    setSelected("global");
    setFinalized(null);
    setIssues([]);
    setPreview(true);
    setUnsaved(false);
    setStorageStatus("브라우저에 저장됨");
    setHasBackup(true);
  };
  if (regenerating) return (
    <CreatePage
      initialOptions={{ ...(schema.settings.selections ?? defaultOptions(dashboardTypes.find(type => type.key === schema.project.type)?.id)), name: schema.project.name }}
      onHome={() => setRegenerating(false)}
      onStart={(generated) => {
        try {
          const next = replaceProject(localStorage, schema, generated);
          acceptReplacement(next);
          setRegenerating(false);
          setExportStatus("재생성 완료 · 이전 디자인을 복원할 수 있습니다.");
        } catch {
          throw new Error("백업 또는 저장에 실패했습니다. 기존 디자인은 유지됩니다. 브라우저 저장 공간을 확인하세요.");
        }
      }}
    />
  );
  return (
    <main className={`workspace ${preview ? "workspace-preview" : ""}`}>
      <header className="workspace-toolbar">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            if (
              !unsaved ||
              window.confirm(
                "저장되지 않은 변경 내용이 있습니다. 홈으로 나가면 현재 변경을 잃을 수 있습니다. 나가시겠어요?",
              )
            )
              onBack();
          }}
        >
          <ArrowLeft size={16} />홈
        </button>
        <div className="workspace-project">
          <h1>{schema.project.name}</h1>
          <span>샘플 데이터 편집</span>
        </div>
        <div className="workspace-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setAiOpen(true)}
          >
            AI 수정
          </button>
          <button
            className="button secondary"
            disabled={!previous || busy}
            onClick={undo}
          >
            <Undo2 size={16} />
            실행 취소
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => (preview ? enterEditor() : setPreview(true))}
          >
            {preview ? <Pencil size={16} /> : <Eye size={16} />}
            {preview ? "편집으로 돌아가기" : "미리보기"}
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void finalize()}
          >
            <Download size={16} />
            {busy
              ? resetBusy ? "초기화 중" : aiBusy
                ? "AI 수정 중"
                : "최종 검증 중"
              : "확정 및 다운로드"}
          </button>
        </div>
      </header>
      <div className="workspace-status">
        <span role="status">{storageStatus}</span>
        <button onClick={() => save(schema)} disabled={busy}>
          다시 저장
        </button>
        <button disabled={busy} onClick={() => setRegenerating(true)}>재생성</button>
        <button disabled={busy || !hasBackup} onClick={() => {
          if (!window.confirm("백업된 디자인으로 복원할까요? 현재 디자인은 새 백업으로 보관됩니다.")) return;
          try {
            const backup = loadBackup(localStorage, schema.project.id);
            if (!backup) throw new Error("missing backup");
            acceptReplacement(replaceProject(localStorage, schema, editSnapshot(backup, {})));
            setExportStatus("이전 디자인으로 복원했습니다. 다운로드하려면 다시 확정하세요.");
          } catch {
            setExportStatus("백업을 복원하지 못했습니다. 현재 디자인은 유지됩니다.");
          }
        }}>이전 디자인 복원</button>
        <button disabled={busy || !hasInitial} onClick={async () => {
          if (lock.current || !window.confirm("최초 생성 상태로 초기화할까요? 현재 디자인은 이전 디자인 백업으로 보관되며, 다운로드하려면 다시 확정해야 합니다.")) return;
          lock.current = true;
          setBusy(true);
          setResetBusy(true);
          try {
            const next = await resetProject(localStorage, schema);
            acceptReplacement(next);
            setExportStatus("최초 생성 상태로 초기화했습니다. ‘이전 디자인 복원’으로 초기화 전 작업을 되돌릴 수 있습니다.");
          } catch (error) {
            setExportStatus(`초기화하지 못했습니다. 현재 작업은 유지됩니다. ${error instanceof Error ? error.message : "저장 공간과 원본 이미지를 확인해 주세요."}`);
          } finally {
            lock.current = false;
            setBusy(false);
            setResetBusy(false);
          }
        }}>최초 생성 상태로 초기화</button>
        {!hasInitial && <span>최초 생성본 없음 · 이 프로젝트는 초기화할 수 없습니다.</span>}
        <span role="status">{exportStatus}</span>
      </div>
      <div className="workspace-layout">
        {!preview && (
          <aside className="workspace-tree">
            <h2>컴포넌트</h2>
            <p>항목을 선택해 내용과 데이터를 편집하세요.</p>
            <button disabled={busy} onClick={() => {
              try {
                const id = crypto.randomUUID();
                if (commit(addSummary(schema, id))) setSelected(id);
              } catch (error) {
                setExportStatus(error instanceof Error ? error.message : "요약 카드를 추가하지 못했습니다.");
              }
            }}>요약 카드 추가</button>
            <button disabled={busy} onClick={() => {
              try {
                const id = crypto.randomUUID();
                if (commit(addActivity(schema, id))) setSelected(id);
              } catch (error) {
                setExportStatus(error instanceof Error ? error.message : "활동 목록을 추가하지 못했습니다.");
              }
            }}>활동 목록 추가</button>
            <button disabled={busy} onClick={() => {
              try {
                const id = crypto.randomUUID();
                if (commit(addButton(schema, id))) setSelected(id);
              } catch (error) {
                setExportStatus(error instanceof Error ? error.message : "버튼을 추가하지 못했습니다.");
              }
            }}>버튼 추가</button>
            <button disabled={busy} onClick={() => {
              try {
                const id = crypto.randomUUID();
                if (commit(addStatusBadge(schema, id))) setSelected(id);
              } catch (error) {
                setExportStatus(error instanceof Error ? error.message : "상태 배지를 추가하지 못했습니다.");
              }
            }}>상태 배지 추가</button>
            <button
              className={selected === "global" ? "active" : ""}
              onClick={() => setSelected("global")}
              disabled={busy}
            >
              전체 설정
            </button>
            <button
              className={selected === "visual" ? "active" : ""}
              onClick={() => setSelected("visual")}
              disabled={busy}
            >
              메인 비주얼
            </button>
            {schema.sections.map((section) => (
              <details key={section.id} open>
                <summary>
                  {section.title}
                  {section.visible ? "" : " · 숨김"}
                </summary>
                {section.components.map((item) => (
                  <button
                    key={item.id}
                    disabled={busy}
                    className={item.id === selected ? "active" : ""}
                    aria-pressed={item.id === selected}
                    onClick={() => setSelected(item.id)}
                  >
                    {item.title}
                    {item.visible ? "" : " · 숨김"}
                  </button>
                ))}
              </details>
            ))}
            {component && (
              <div className="tree-actions">
                <button disabled={busy} onClick={() => arrange("up")}>
                  위로
                </button>
                <button disabled={busy} onClick={() => arrange("down")}>
                  아래로
                </button>
                <button disabled={busy} onClick={() => arrange("delete")}>
                  삭제
                </button>
              </div>
            )}
          </aside>
        )}
        <div
          className="workspace-canvas"
          tabIndex={0}
          aria-label="대시보드 캔버스, 가로 스크롤 가능"
        >
          <DashboardRenderer
            schema={schema}
            selectedId={preview ? undefined : selected}
            onSelect={preview || busy ? undefined : setSelected}
          />
        </div>
        {!preview && (
          <aside className="workspace-properties">
            {selected === "global" || selected === "visual" ? (
              <GlobalForm
                key={`${selected}-${schema.project.updatedAt}`}
                schema={schema}
                mode={selected}
                onApply={patch}
                disabled={busy}
              />
            ) : component ? (
              <ComponentForm
                key={JSON.stringify(component)}
                component={component}
                disabled={busy}
                onApply={(value) => {
                  try {
                    return commit(replaceComponent(schema, value));
                  } catch {
                    return false;
                  }
                }}
              />
            ) : (
              <p>편집할 항목을 선택하세요.</p>
            )}
            <div className="workspace-hint">
              변경은 이 브라우저에 저장됩니다. 브라우저 데이터를 삭제하면 복구할
              수 없습니다.
            </div>
          </aside>
        )}
      </div>
      {aiOpen && (
        <AiEditDrawer
          schema={schema}
          selectedId={selected}
          onClose={() => setAiOpen(false)}
          onBusy={(value) => {
            lock.current = value;
            setBusy(value);
            setAiBusy(value);
          }}
          onApply={(base, next) => {
            if (latestSchema.current !== base) return false;
            return commit(next, true);
          }}
          onUndo={undo}
          canUndo={!!previous}
        />
      )}
      <dialog
        ref={dialog}
        className="finalize-dialog"
        aria-labelledby="finalize-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setModal(false);
        }}
      >
        <h2 id="finalize-title">대시보드 최종 검증</h2>
        <p>구조 · 필수값 · 차트/표 데이터 · 이미지 · 렌더링 · ZIP 파일</p>
        {busy ? (
          <p role="status">검사 중입니다…</p>
        ) : issues.length ? (
          <ul>
            {issues.map((issue, i) => (
              <li key={i}>
                <p role="alert">{issue.message}</p>
                <button
                  onClick={() =>
                    enterEditor(
                      issue.target === "visual"
                        ? "visual"
                        : components.some((c) => c.id === issue.target)
                          ? issue.target
                          : "global",
                    )
                  }
                >
                  수정하기
                </button>
              </li>
            ))}
          </ul>
        ) : finalized ? (
          <>
            <p className="finalize-success">모든 검사를 통과했습니다.</p>
            <p>
              {finalized.schema.project.name} ·{" "}
              {(finalized.bytes.length / 1024).toFixed(1)} KB
            </p>
            <p>
              샘플 데이터가 포함된 PC 대시보드입니다. 압축을 풀어 index.html을
              여세요.
            </p>
          </>
        ) : null}
        <div className="generation-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setModal(false)}
          >
            닫기
          </button>
          {finalized && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void download()}
            >
              ZIP 다운로드
            </button>
          )}
          {issues.length > 0 && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void finalize()}
            >
              다시 검사
            </button>
          )}
        </div>
      </dialog>
    </main>
  );
}
