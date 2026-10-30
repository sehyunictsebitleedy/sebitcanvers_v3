import { useState } from "react";
import { backupKey, initialSnapshotKey, recoveryStorageKey, schemaStorageKey, storageFailureMessage } from "./storage";
import { recoverStoredProject } from "./recoverStored";

export function RecoveryActions({ id, onRecovered }: { id: string; onRecovered: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const recover = async (source: "backup" | "initial") => {
    if (!window.confirm(`${source === "backup" ? "이전 디자인 백업" : "최초 생성본"}으로 손상되거나 누락된 현재 저장본을 복구할까요? 손상 원본은 먼저 보관하며, 정상 저장본과 미지원 버전은 덮어쓰지 않습니다.`)) return;
    setBusy(true);
    try {
      if (!navigator.locks) throw new Error("안전한 복구를 지원하는 HTTPS/로컬 주소의 최신 브라우저가 필요합니다.");
      await navigator.locks.request(`sebit-project-editor-v1:${id}`, { mode: "exclusive", ifAvailable: true }, lock => {
        if (!lock) throw new Error("다른 탭에서 이 프로젝트를 열고 있습니다. 먼저 홈으로 돌아가거나 탭을 닫아 주세요.");
        recoverStoredProject(localStorage, id, source);
        setMessage("저장본을 복구했습니다. 작업을 열어 내용과 이미지를 확인하고 다시 확정해 주세요.");
        onRecovered();
      });
    } catch (error) {
      setMessage(error instanceof Error && !["QuotaExceededError", "SecurityError"].includes(error.name) ? error.message : storageFailureMessage(error));
    } finally { setBusy(false); }
  };
  const download = () => {
    try {
      const records = Object.fromEntries([schemaStorageKey, backupKey, initialSnapshotKey, recoveryStorageKey].map(prefix => [prefix, localStorage.getItem(prefix + id)]));
      const url = URL.createObjectURL(new Blob([JSON.stringify({ format: "sebit-recovery-raw-v1", projectId: id, records }, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "project-recovery.json"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("저장 원문을 내려받았습니다. 이미지 파일은 포함되지 않으며 이 파일은 자동 가져오기용이 아닙니다.");
    } catch (error) { setMessage(storageFailureMessage(error)); }
  };
  return <details className="project-recovery">
    <summary>저장 문제 복구</summary>
    <p>현재 저장본이 손상되거나 없을 때 사용하세요. 파일에는 프로젝트 내용이 포함되므로 안전하게 보관하세요.</p>
    <button type="button" onClick={download} disabled={busy}>저장 원문 내려받기</button>{" "}
    <button type="button" onClick={() => void recover("backup")} disabled={busy}>백업으로 복구</button>{" "}
    <button type="button" onClick={() => void recover("initial")} disabled={busy}>최초 생성본으로 복구</button>
    <p role="status">{message}</p>
  </details>;
}
