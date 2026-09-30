import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, Download, Eye, Pencil, Undo2 } from "lucide-react";
import { DashboardRenderer } from "./Renderer";
import { dashboardSchema, updateKpi } from "./schema";
import type { DashboardSchema, KpiComponent } from "./schema";
import { saveProject } from "./storage";
import rendererCss from "./renderer.css?raw";
import "./renderer.css";
import "./workspace.css";

function KpiForm({
  component,
  onApply,
  disabled,
}: {
  component: KpiComponent;
  onApply: (input: { title: string; value: string; unit: string }) => boolean;
  disabled: boolean;
}) {
  const [title, setTitle] = useState(component.title);
  const [value, setValue] = useState(String(component.value));
  const [unit, setUnit] = useState(component.unit);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !value.trim() || !Number.isFinite(Number(value))) {
      setError("제목과 올바른 숫자 값을 입력해 주세요.");
      return;
    }
    if (onApply({ title, value, unit })) setError("");
    else
      setError(
        "값을 적용할 수 없습니다. 제목 120자, 단위 12자, 숫자 ±1조 범위를 확인하세요.",
      );
  };
  return (
    <form className="workspace-form" onSubmit={submit}>
      <fieldset disabled={disabled}>
        <legend>KPI 속성</legend>
        <label htmlFor="kpi-title">제목</label>
        <input
          id="kpi-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
        />
        <label htmlFor="kpi-value">값</label>
        <input
          id="kpi-value"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          required
        />
        <label htmlFor="kpi-unit">단위</label>
        <input
          id="kpi-unit"
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          maxLength={12}
          placeholder="예: 원, %, 명"
        />
        <p>변경한 내용은 적용 버튼을 누르면 화면에 반영됩니다.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button primary">
          변경 적용
        </button>
      </fieldset>
    </form>
  );
}

export function Workspace({
  initial,
  onBack,
}: {
  initial: DashboardSchema;
  onBack: () => void;
}) {
  const [schema, setSchema] = useState(() => dashboardSchema.parse(initial));
  const [previous, setPrevious] = useState<DashboardSchema | null>(null);
  const [selected, setSelected] = useState(
    initial.sections
      .flatMap((section) => section.components)
      .find((component) => component.type === "kpi")?.id ?? "",
  );
  const [preview, setPreview] = useState(false);
  const [storageStatus, setStorageStatus] = useState("저장 대기");
  const [exportStatus, setExportStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const lock = useRef(false);
  const initialRef = useRef(initial);
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
  const apply = (input: { title: string; value: string; unit: string }) => {
    if (lock.current) return false;
    try {
      const next = updateKpi(schema, selected, input);
      setPrevious(schema);
      setSchema(next);
      save(next);
      setExportStatus("");
      return true;
    } catch {
      return false;
    }
  };
  const undo = () => {
    if (!previous || lock.current) return;
    const next = dashboardSchema.parse({
      ...previous,
      status: "editing",
      project: { ...previous.project, updatedAt: new Date().toISOString() },
    });
    setSchema(next);
    setPrevious(null);
    save(next);
    setExportStatus("이전 정상 상태로 복원했습니다.");
  };
  const download = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setExportStatus("Schema 검증 및 ZIP 생성 중…");
    try {
      const snapshot = dashboardSchema.parse({
        ...schema,
        status: "finalized",
      });
      setSchema(snapshot);
      save(snapshot);
      const { createExportZip, exportFilename } = await import("./export");
      const bytes = await createExportZip(snapshot, rendererCss);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/zip" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFilename(snapshot.project.name);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      const exported = dashboardSchema.parse({
        ...snapshot,
        status: "exported",
      });
      setSchema(exported);
      save(exported);
      setExportStatus(
        "ZIP을 브라우저에 전달했습니다. 압축을 풀고 index.html을 여세요.",
      );
    } catch {
      setExportStatus(
        "다운로드에 실패했습니다. 현재 작업을 유지했습니다. 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const kpis = schema.sections
    .filter((section) => section.visible)
    .flatMap((section) => section.components)
    .filter(
      (component): component is KpiComponent =>
        component.type === "kpi" && component.visible,
    );
  const component = kpis.find((item) => item.id === selected);
  return (
    <main className={`workspace ${preview ? "workspace-preview" : ""}`}>
      <header className="workspace-toolbar">
        <button className="button secondary" disabled={busy} onClick={() => {
          if (!unsaved || window.confirm('저장되지 않은 변경 내용이 있습니다. 홈으로 나가면 현재 변경을 잃을 수 있습니다. 나가시겠어요?')) onBack();
        }}>
          <ArrowLeft size={16} />홈
        </button>
        <div className="workspace-project">
          <h1>{schema.project.name}</h1>
          <span>샘플 데이터 편집</span>
        </div>
        <div className="workspace-actions">
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
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? <Pencil size={16} /> : <Eye size={16} />}{" "}
            {preview ? "편집으로 돌아가기" : "미리보기"}
          </button>
          <button className="button primary" disabled={busy} onClick={download}>
            <Download size={16} />
            {busy ? "ZIP 생성 중" : "검증 후 ZIP 다운로드"}
          </button>
        </div>
      </header>
      <div className="workspace-status">
        <span role="status">{storageStatus}</span>
        <button onClick={() => save(schema)} disabled={busy}>
          다시 저장
        </button>
        <span role="status">{exportStatus}</span>
      </div>
      <div className="workspace-layout">
        {!preview && (
          <aside className="workspace-tree">
            <h2>컴포넌트</h2>
            <p>KPI를 선택해 제목과 값을 바꾸세요.</p>
            {kpis.map((item) => (
              <button
                key={item.id}
                disabled={busy}
                className={item.id === selected ? "active" : ""}
                aria-pressed={item.id === selected}
                onClick={() => setSelected(item.id)}
              >
                {item.title}
              </button>
            ))}
            <div className="workspace-hint">
              차트·테이블은 Schema에서 표시됩니다. 속성 편집은 다음 단계에서
              확장합니다.
            </div>
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
            {component ? (
              <KpiForm
                key={`${component.id}-${component.title}-${component.value}-${component.unit}`}
                component={component}
                onApply={apply}
                disabled={busy}
              />
            ) : (
              <p>편집할 KPI가 없습니다.</p>
            )}
            <div className="workspace-hint">
              현재 브라우저에 변경 내용을 저장합니다. 브라우저 데이터를 삭제하면
              복구할 수 없습니다.
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
