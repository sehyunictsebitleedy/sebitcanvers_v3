import type { CSSProperties } from "react";
import { validateDashboard } from "./schema";
import { AssetImage } from "./AssetImage";
import type { ChartComponent, DashboardComponent } from "./schema";

export function Chart({ component }: { component: ChartComponent }) {
  const { datasets, labels, chartType } = component;
  const colors = [
    datasets[0].color,
    "#63b2e7",
    "#df99bd",
    "#7bc4ac",
    "#e8b46e",
  ];
  if (chartType === "donut") {
    const values = datasets[0].data;
    const total = values.reduce((a, b) => a + b, 0);
    return (
      <div className="db-donut-layout">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={`${component.title}: ${labels.map((label, i) => `${label} ${values[i]}`).join(", ")}`}
        >
          {values.map((value, i) => {
            const share = (value / total) * 100;
            const offset =
              (values.slice(0, i).reduce((sum, item) => sum + item, 0) /
                total) *
              100;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r="72"
                pathLength="100"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="26"
                strokeDasharray={`${share} ${100 - share}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 100 100)"
              />
            );
          })}
          <text x="100" y="103" textAnchor="middle" className="db-donut-value">
            {Math.round((values[0] / total) * 100)}%
          </text>
          <text
            x="100"
            y="127"
            textAnchor="middle"
            className="db-donut-caption"
          >
            {labels[0]}
          </text>
        </svg>
        <ul className="db-legend">
          {labels.map((label, i) => (
            <li key={i}>
              <i style={{ background: colors[i % colors.length] }} />
              {label}
              <strong>{values[i]}</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const values = datasets.flatMap((dataset) => dataset.data);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const range = high - low || 1;
  const y = (value: number) => 190 - ((value - low) / range) * 155;
  const x = (index: number) =>
    50 + (index * 560) / Math.max(1, labels.length - 1);
  const baseline = y(0);
  return (
    <>
      <svg
        className="db-chart"
        viewBox="0 0 660 240"
        role="img"
        aria-label={`${component.title}, ${datasets.map((dataset) => `${dataset.name}: ${dataset.data.join(", ")}`).join("; ")}`}
      >
        {[0, 1, 2, 3].map((step) => {
          const value = low + (range * step) / 3;
          return (
            <g key={step}>
              <line
                x1="45"
                x2="630"
                y1={y(value)}
                y2={y(value)}
                className="db-gridline"
              />
              <text
                x="38"
                y={y(value) + 4}
                textAnchor="end"
                className="db-axis"
              >
                {Math.round(value).toLocaleString("en-US")}
              </text>
            </g>
          );
        })}
        {datasets.map((dataset, datasetIndex) => {
          const points = dataset.data
            .map((value, i) => `${x(i)},${y(value)}`)
            .join(" ");
          if (chartType === "bar") {
            const group = 560 / labels.length;
            const width = Math.min(42, (group * 0.7) / datasets.length);
            return (
              <g key={dataset.name}>
                {dataset.data.map((value, i) => (
                  <rect
                    key={i}
                    x={50 + group * i + group * 0.15 + datasetIndex * width}
                    y={Math.min(baseline, y(value))}
                    width={width}
                    height={Math.max(1, Math.abs(y(value) - baseline))}
                    fill={dataset.color}
                    rx="2"
                  />
                ))}
              </g>
            );
          }
          return (
            <g key={dataset.name}>
              {chartType === "area" && (
                <polygon
                  points={`${x(0)},${baseline} ${points} ${x(labels.length - 1)},${baseline}`}
                  fill={dataset.color}
                  opacity=".15"
                />
              )}
              <polyline
                points={points}
                fill="none"
                stroke={dataset.color}
                strokeWidth="3"
              />
              {dataset.data.map((value, i) => (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(value)}
                  r="3.5"
                  fill={dataset.color}
                />
              ))}
            </g>
          );
        })}
        {labels.map((label, i) => (
          <text
            key={i}
            x={
              chartType === "bar"
                ? 50 + ((i + 0.5) * 560) / labels.length
                : x(i)
            }
            y="220"
            textAnchor="middle"
            className="db-axis"
          >
            {label.length > 8 ? `${label.slice(0, 8)}…` : label}
          </text>
        ))}
      </svg>
      <ul className="db-series">
        {datasets.map((dataset) => (
          <li key={dataset.name}>
            <i style={{ background: dataset.color }} />
            {dataset.name}
          </li>
        ))}
      </ul>
    </>
  );
}
function Content({ component }: { component: DashboardComponent }) {
  if (component.type === "progress")
    return (
      <>
        <h3>{component.title}</h3>
        <p className="db-value">
          {Math.round((component.value / component.max) * 100)}
          <span>%</span>
        </p>
        <progress
          max={component.max}
          value={component.value}
          aria-label={component.title}
        />
        <p className="db-progress-caption">
          {component.value} / {component.max} 완료
        </p>
      </>
    );
  if (component.type === "notification")
    return (
      <div className={`db-notification ${component.status}`}>
        <h3>{component.title}</h3>
        <p>{component.message}</p>
      </div>
    );
  if (component.type === "kpi")
    return (
      <>
        <h3>{component.title}</h3>
        <p className="db-value">
          {component.value.toLocaleString("en-US", {
            maximumFractionDigits: 4,
          })}
          <span>{component.unit}</span>
        </p>
        <p className={`db-change ${component.change < 0 ? "negative" : ""}`}>
          {component.change >= 0 ? "↑" : "↓"} {Math.abs(component.change)}%{" "}
          <span>지난 기간 대비</span>
        </p>
      </>
    );
  if (component.type === "chart")
    return (
      <>
        <h3>{component.title}</h3>
        <Chart component={component} />
      </>
    );
  return (
    <>
      <h3>{component.title}</h3>
      {component.rows.length ? (
        <div className="db-table-scroll">
          <table>
            <thead>
              <tr>
                {component.columns.map((column) => (
                  <th scope="col" key={column.key}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {component.rows.map((row, i) => (
                <tr key={i}>
                  {component.columns.map((column) => (
                    <td key={column.key}>{row[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="db-empty">표시할 데이터가 없습니다.</p>
      )}
    </>
  );
}
export function DashboardRenderer({
  schema,
  selectedId,
  onSelect,
  assetUrls,
}: {
  schema: unknown;
  selectedId?: string;
  onSelect?: (id: string) => void;
  assetUrls?: Record<string, string>;
}) {
  const result = validateDashboard(schema);
  if (!result.success)
    return (
      <div className="db-invalid" role="alert">
        <h3>대시보드를 표시할 수 없습니다.</h3>
        <ul>
          {result.error.issues.slice(0, 6).map((issue, i) => (
            <li key={i}>
              {issue.path.join(".")}: {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  const data = result.data;
  const style = {
    "--db-primary": data.theme.primary,
    "--db-bg": data.theme.background,
    "--db-surface": data.theme.surface,
    "--db-text": data.theme.text,
    "--db-muted": data.theme.muted,
    "--db-border": data.theme.border,
    "--db-radius": `${data.theme.radius}px`,
    "--db-gap": `${data.layout.gap}px`,
    width: data.layout.desktopWidth,
    minWidth: data.layout.minWidth,
  } as CSSProperties;
  return (
    <div
      className={`schema-dashboard db-nav-${data.navigation.type} db-style-${data.theme.preset ?? "dark"} db-density-${data.layout.density ?? "standard"}`}
      style={style}
    >
      <aside className="db-nav" aria-label="대시보드 메뉴">
        <div className="db-logo">{data.navigation.logoText}</div>
        <div className="db-nav-items">
          {data.navigation.items.map((item) => (
            <span key={item.id} className={item.active ? "active" : ""}>
              {item.label}
            </span>
          ))}
        </div>
        <span className="db-sample">샘플 데이터</span>
      </aside>
      <div className="db-body">
        <header className="db-heading">
          <div>
            <h2>{data.header.title}</h2>
            <p>{data.header.description}</p>
          </div>
          <span className="db-sample">SAMPLE DASHBOARD</span>
        </header>
        {data.mainVisual.enabled && (
          <section
            className={`db-visual ${data.mainVisual.type} db-visual-${data.mainVisual.height ?? "medium"} ${data.mainVisual.imageAssetId ? "has-image" : ""}`}
            style={{ textAlign: data.mainVisual.alignment ?? "left" }}
          >
            {(data.mainVisual.imageAssetId ||
              data.mainVisual.type === "image-text") && (
              <div className="db-visual-image">
                <AssetImage
                  id={data.mainVisual.imageAssetId}
                  src={
                    data.mainVisual.imageAssetId
                      ? assetUrls?.[data.mainVisual.imageAssetId]
                      : undefined
                  }
                />
                {data.mainVisual.imageAssetId && (
                  <div
                    className="db-visual-overlay"
                    style={{ opacity: (data.mainVisual.overlay ?? 35) / 100 }}
                  />
                )}
              </div>
            )}
            <div className="db-visual-copy">
              <h2>{data.mainVisual.title}</h2>
              <p>{data.mainVisual.description}</p>
              {data.mainVisual.cta?.enabled && (
                <a
                  href={data.mainVisual.cta.url}
                  target={
                    data.mainVisual.cta.url.startsWith("#")
                      ? undefined
                      : "_blank"
                  }
                  rel="noopener noreferrer"
                  className="db-visual-cta"
                >
                  {data.mainVisual.cta.label}
                </a>
              )}
            </div>
          </section>
        )}
        {data.sections
          .filter((section) => section.visible)
          .map((section) => (
            <section
              id={
                data.mainVisual.enabled &&
                data.mainVisual.cta?.enabled &&
                section.id === data.sections.find((item) => item.visible)?.id
                  ? "dashboard-data"
                  : undefined
              }
              className="db-section"
              key={section.id}
              aria-label={section.title}
            >
              {section.components
                .filter((component) => component.visible)
                .map((component) => (
                  <article
                    key={component.id}
                    className={`db-card db-${component.type} ${selectedId === component.id ? "db-selected" : ""}`}
                    style={{
                      gridColumn: `span ${component.layout.columnSpan}`,
                    }}
                  >
                    {onSelect && component.type === "kpi" && (
                      <button
                        className="db-select"
                        onClick={() => onSelect(component.id)}
                        aria-label={`${component.title} 편집`}
                        aria-pressed={selectedId === component.id}
                      />
                    )}
                    <Content component={component} />
                  </article>
                ))}
            </section>
          ))}
      </div>
    </div>
  );
}
