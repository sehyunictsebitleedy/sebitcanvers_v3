import { useEffect, useRef, useState } from "react";
import { applyAiPatch } from "./aiPatch";
import type { DashboardSchema } from "./schema";
import { UsageNotice } from "./UsageNotice";

export function AiEditDrawer({
  schema,
  selectedId,
  onClose,
  onBusy,
  onApply,
  onUndo,
  canUndo,
}: {
  schema: DashboardSchema;
  selectedId?: string;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
  onApply: (base: DashboardSchema, next: DashboardSchema) => boolean;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [scope, setScope] = useState("all");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const [summary, setSummary] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const component = schema.sections
    .flatMap((s) => s.components)
    .find((c) => c.id === selectedId);
  useEffect(() => {
    dialog.current?.showModal();
    return () => { controller.current?.abort(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    locked.current = false;
    setPending(false);
    onBusy(false);
    setError("");
    setNotice("수정을 취소했습니다. 기존 작업과 수정 요청은 유지되며, 취소한 결과는 적용하지 않습니다.");
  };
  const submit = async () => {
    if (locked.current) return;
    if (!instruction.trim()) {
      setError("수정 요청을 입력해 주세요.");
      return;
    }
    locked.current = true;
    setPending(true);
    onBusy(true);
    setError("");
    setNotice("");
    startedAt.current = Date.now();
    setElapsed(0);
    setSummary([]);
    const base = schema;
    const revision = crypto.randomUUID();
    const targetId = scope === "selected" ? component?.id : undefined;
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort("timeout"), 125000);
    try {
      const response = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.signal,
        body: JSON.stringify({
          schema: base,
          instruction: instruction.trim(),
          baseRevision: revision,
          ...(targetId ? { targetId } : {}),
        }),
      }).catch((error: unknown) => {
        if (abort.signal.aborted) throw error;
        throw new Error("AI 수정 서버에 연결하지 못했습니다. 연결 상태를 확인한 뒤 다시 적용해 주세요. 기존 작업은 유지됩니다.");
      });
      const result = await response.json().catch(() => {
        throw new Error(
          "수정 서버 응답이 올바르지 않습니다. 연결 상태를 확인해 주세요.",
        );
      });
      if (!response.ok) {
        if (result?.code === "TIMEOUT" || result?.code === "REQUEST_TIMEOUT" || response.status === 504)
          throw new Error("서버의 수정 대기 시간이 초과되었습니다. 기존 작업과 요청은 유지됩니다. 잠시 후 다시 적용해 주세요.");
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "AI 수정에 실패했습니다.",
        );
      }
      if (abort.signal.aborted || controller.current !== abort) return;
      if (result?.baseRevision !== revision)
        throw new Error(
          "수정 기준이 일치하지 않습니다. 최신 상태에서 다시 요청해 주세요.",
        );
      let applied;
      try {
        applied = applyAiPatch(
          base,
          result.patch,
          new Date().toISOString(),
          targetId,
        );
      } catch {
        throw new Error(
          "수정 결과가 지원 범위나 데이터 검증 조건에 맞지 않습니다. 기존 작업은 유지됩니다. 요청을 구체적으로 바꿔 주세요.",
        );
      }
      if (!onApply(base, applied.schema))
        throw new Error(
          "요청 중 작업이 변경되어 결과를 적용하지 않았습니다. 다시 요청해 주세요.",
        );
      setSummary(applied.summary);
    } catch (err) {
      if (controller.current !== abort) return;
      setError(
        abort.signal.aborted
          ? abort.signal.reason === "timeout"
            ? "수정 시간이 초과되었습니다. 기존 작업은 유지됩니다."
            : "수정을 취소했습니다. 기존 작업은 유지됩니다."
          : err instanceof Error
            ? err.message
            : "AI 수정 서버에 연결하지 못했습니다.",
      );
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) {
        controller.current = null;
        locked.current = false;
        setPending(false);
        onBusy(false);
      }
    }
  };
  return (
    <dialog
      ref={dialog}
      className="ai-edit-drawer"
      aria-labelledby="ai-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (pending) cancel();
        else onClose();
      }}
    >
      <header>
        <span>AI EDIT</span>
        <h2 id="ai-edit-title">어떻게 바꿔볼까요?</h2>
        <p>현재 디자인과 데이터를 기준으로 요청한 부분을 수정합니다.</p>
      </header>
      <UsageNotice kind="edit" pending={pending} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={pending}>
          <label htmlFor="ai-edit-scope">수정 범위</label>
          <select
            id="ai-edit-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="all">전체 대시보드</option>
            {component && (
              <option value="selected">선택 항목: {component.title}</option>
            )}
          </select>
          <label htmlFor="ai-edit-instruction">수정 요청</label>
          <textarea
            id="ai-edit-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={1000}
            rows={7}
            placeholder="예: 매출 추이 차트를 막대 차트로 바꾸고 너비를 12열로 넓혀줘"
          />
          <small>
            {instruction.length} / 1000 · 개인정보·비밀번호·API Key를 입력하지
            마세요.
          </small>
          <p className="ai-edit-hint">
            제목·샘플 데이터·색상·간격·컴포넌트 추가/삭제/이동을 지원합니다.
            이미지 변경은 CMS에서 진행하세요.
          </p>
          <button type="submit" className="button primary">
            {pending ? "AI 수정 중…" : "AI 수정 적용"}
          </button>
        </fieldset>
      </form>
      {pending && (
        <div>
          <p role="timer" aria-live="off">경과 시간 {elapsed}초</p>
          <p role="status">{elapsed >= 60 ? "예상보다 오래 걸리고 있습니다. 기다리거나 취소한 뒤 다시 적용할 수 있습니다." : "요청을 분석하고 변경 내용을 검증하고 있습니다."} 최대 125초 동안 응답을 기다립니다.</p>
          <button
            className="button secondary"
            onClick={cancel}
          >
            수정 취소
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
          {" "}수정 요청을 유지한 채 AI 수정 적용 버튼으로 다시 시도할 수 있습니다.
        </p>
      )}
      {summary.length > 0 && (
        <section aria-label="AI 변경 요약">
          <h3>변경한 내용</h3>
          <ul>
            {summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p>변경 후에는 다시 확정해야 다운로드할 수 있습니다.</p>
        </section>
      )}
      <footer>
        <button
          className="button secondary"
          disabled={pending || !canUndo}
          onClick={() => {
            onUndo();
            setSummary([]);
            setError("");
            setNotice("최근 변경을 실행 취소했습니다.");
          }}
        >
          최근 변경 실행 취소
        </button>
        <button
          className="button secondary"
          disabled={pending}
          onClick={onClose}
        >
          닫기
        </button>
      </footer>
    </dialog>
  );
}
