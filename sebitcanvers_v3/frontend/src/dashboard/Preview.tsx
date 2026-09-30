import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createSample } from "./samples";
import { DashboardRenderer } from "./Renderer";
import "./renderer.css";

export function Dashboard({
  type = 0,
  compact = false,
}: {
  type?: number;
  compact?: boolean;
}) {
  const [period, setPeriod] = useState("current");
  const schema = useMemo(() => {
    const data = createSample(type);
    if (period === "previous") {
      data.sections.forEach((section) =>
        section.components.forEach((component) => {
          if (component.type === "kpi")
            component.value = Math.round((component.value / 1.12) * 10) / 10;
          if (component.type === "chart" && component.chartType !== "donut")
            component.datasets.forEach((dataset) => {
              dataset.data = dataset.data.map((value) =>
                Math.round(value * 0.88),
              );
            });
        }),
      );
    }
    return data;
  }, [type, period]);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const parent = viewport.current!;
    const child = content.current!;
    const resize = () => {
      const scale = parent.clientWidth / schema.layout.desktopWidth;
      child.style.transform = `scale(${scale})`;
      parent.style.height = `${child.scrollHeight * scale}px`;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    observer.observe(child);
    resize();
    return () => observer.disconnect();
  }, [schema.layout.desktopWidth]);
  return (
    <div className={`schema-preview ${compact ? "is-compact" : ""}`}>
      {!compact && (
        <div className="schema-preview-controls">
          <span>샘플 데이터</span>
          <select
            aria-label="미리보기 조회 기간"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="current">이번 달</option>
            <option value="previous">지난 달</option>
          </select>
        </div>
      )}
      <div className="schema-preview-viewport" ref={viewport}>
        <div className="schema-preview-content" ref={content}>
          <DashboardRenderer schema={schema} />
        </div>
      </div>
    </div>
  );
}
