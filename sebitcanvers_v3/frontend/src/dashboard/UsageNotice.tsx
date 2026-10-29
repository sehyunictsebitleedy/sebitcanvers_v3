import { useEffect, useState } from "react";
import { z } from "zod";
import "./usage.css";

const count = z.number().int().nonnegative();
const quota = z.object({ limit: count, used: count, pending: count, remaining: count, ipLimited: z.boolean() });
const usageSchema = z.object({ observedAt: z.iso.datetime(), resetAt: z.iso.datetime(), generate: quota, edit: quota });
type Usage = z.infer<typeof usageSchema>;

export function UsageNotice({ kind, pending = false }: { kind: "generate" | "edit"; pending?: boolean }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let current: AbortController | undefined;
    const refresh = async () => {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/usage", { signal: controller.signal, cache: "no-store", credentials: "same-origin" });
        if (!response.ok) throw new Error("Usage unavailable");
        const data = usageSchema.parse(await response.json());
        if (active && current === controller) { setUsage(data); setError(false); }
      } catch {
        if (active && current === controller) { setUsage(null); setError(true); }
      } finally { window.clearTimeout(timeout); }
    };
    const refreshVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const timer = window.setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [kind, pending, revision]);
  const label = kind === "generate" ? "AI 생성" : "AI 수정";
  const selected = usage?.[kind];
  return <section className="usage-notice" aria-label={`${label} 사용량`}>
    <div>
      <p role="status">{error ? "사용량을 확인하지 못했습니다. 남은 횟수를 알 수 없으며 실제 가능 여부는 서버에서 확인합니다."
        : selected ? `${label} 오늘 ${selected.remaining}회 남음 / ${selected.limit}회 · 성공 ${selected.used}회 · 처리 중 ${selected.pending}회`
        : "오늘의 AI 사용량을 확인하고 있습니다."}</p>
      {usage && <p>초기화: {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(usage.resetAt))} (한국시간)</p>}
      {selected?.ipLimited && <p>현재 네트워크의 일일 보조 한도에 도달했습니다. 개인 잔여 횟수가 있어도 요청이 제한됩니다.</p>}
      {selected?.remaining === 0 && <p>오늘 사용할 수 있는 횟수가 없습니다. 처리 중인 요청이 실패·취소되면 반환될 수 있습니다.</p>}
      <small>생성과 수정은 별도 한도입니다. 처리 중인 요청은 임시로 반영하며 실패 시 반환됩니다. 표시 후 다른 탭의 요청으로 달라질 수 있습니다.</small>
    </div>
    <button type="button" className="button secondary" onClick={() => setRevision(value => value + 1)}>사용량 새로고침</button>
  </section>;
}
