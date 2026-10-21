import { useEffect, useRef, useState } from "react";
import type { DashboardComponent } from "./schema";
import { componentSchema } from "./schema";

function NumberInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const [text, setText] = useState(String(value));
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.trim() ? Number(e.target.value) : NaN);
      }}
    />
  );
}

export function ComponentForm({
  component,
  onApply,
  disabled,
}: {
  component: DashboardComponent;
  onApply: (value: DashboardComponent) => boolean;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<DashboardComponent>(
    structuredClone(component),
  );
  const [error, setError] = useState("");
  const [resetVersion, setResetVersion] = useState(0);
  const [dataOpen, setDataOpen] = useState(false);
  const dataDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (dataOpen) dataDialog.current?.showModal();
  }, [dataOpen]);
  const [dataDraft, setDataDraft] = useState<DashboardComponent>(
    structuredClone(component),
  );
  const patch = (value: object) =>
    setDraft({ ...draft, ...value } as DashboardComponent);
  const numberField = (label: string, key: string, value: number) => (
    <label>
      {label}
      <NumberInput
        key={`${key}-${resetVersion}`}
        label={label}
        value={value}
        onChange={(value) => patch({ [key]: value })}
      />
    </label>
  );
  return (
    <form
      className="workspace-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = componentSchema.safeParse(draft);
        if (!parsed.success) {
          setError(parsed.error.issues.map((i) => i.message).join(" / "));
          return;
        }
        setError(
          onApply(parsed.data)
            ? ""
            : "최소 하나의 표시 가능한 데이터 컴포넌트를 유지해 주세요.",
        );
      }}
    >
      <fieldset disabled={disabled}>
        <legend>
          {
            {
              kpi: "KPI",
              chart: "차트",
              table: "테이블",
              progress: "진행률",
              notification: "알림",
              summary: "요약 카드",
              activity: "활동 목록",
              button: "버튼",
              statusBadge: "상태 배지",
            }[draft.type]
          }{" "}
          속성
        </legend>
        <label>
          제목
          <input
            aria-label="제목"
            value={draft.title}
            maxLength={120}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label>
          표시 여부
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(e) => patch({ visible: e.target.checked })}
          />
        </label>
        <label>
          너비
          <select
            value={draft.layout.columnSpan}
            onChange={(e) =>
              patch({ layout: { columnSpan: Number(e.target.value) } })
            }
          >
            {[3, 4, 6, 8, 12].includes(draft.layout.columnSpan) ? null : (
              <option value={draft.layout.columnSpan}>
                {draft.layout.columnSpan}열
              </option>
            )}
            {[3, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n}열
              </option>
            ))}
          </select>
        </label>
        {draft.type === "statusBadge" && (
          <>
            <label>배지 문구
              <input aria-label="배지 문구" value={draft.label} maxLength={120}
                onChange={(e) => patch({ label: e.target.value })} />
            </label>
            <label>배지 상태
              <select aria-label="배지 상태" value={draft.status}
                onChange={(e) => patch({ status: e.target.value })}>
                <option value="info">안내</option>
                <option value="success">정상</option>
                <option value="warning">주의</option>
                <option value="error">오류</option>
              </select>
            </label>
          </>
        )}
        {draft.type === "button" && (
          <>
            <label>버튼 문구
              <input aria-label="버튼 문구" value={draft.label} maxLength={120}
                onChange={(e) => patch({ label: e.target.value })} />
            </label>
            <label>버튼 스타일
              <select aria-label="버튼 스타일" value={draft.variant}
                onChange={(e) => patch({ variant: e.target.value })}>
                <option value="primary">Primary · 기본</option>
                <option value="secondary">Secondary · 보조</option>
                <option value="ghost">Ghost · 투명</option>
                <option value="danger">Danger · 강조</option>
              </select>
            </label>
            <label>버튼 크기
              <select aria-label="버튼 크기" value={draft.size}
                onChange={(e) => patch({ size: e.target.value })}>
                <option value="small">작게</option>
                <option value="medium">기본</option>
                <option value="large">크게</option>
              </select>
            </label>
            <label>이동 주소
              <input aria-label="이동 주소" value={draft.url} maxLength={2048}
                onChange={(e) => patch({ url: e.target.value })} />
            </label>
            <p>http/https 웹주소는 새 창으로, #dashboard-data는 대시보드 내부로 이동합니다. 미리보기에서 클릭할 수 있습니다.</p>
          </>
        )}
        {draft.type === "activity" && (
          <div>
            <p>최대 20개 · 입력 후 변경 적용을 눌러 저장하세요.</p>
            {draft.items.map((item, index) => (
              <fieldset key={`${resetVersion}-${index}`}>
                <legend>활동 {index + 1}</legend>
                <label>제목
                  <input aria-label={`활동 ${index + 1} 제목`} value={item.title} maxLength={120}
                    onChange={(e) => patch({ items: draft.items.map((v, i) => i === index ? { ...v, title: e.target.value } : v) })} />
                </label>
                <label>설명
                  <textarea aria-label={`활동 ${index + 1} 설명`} value={item.description} maxLength={500}
                    onChange={(e) => patch({ items: draft.items.map((v, i) => i === index ? { ...v, description: e.target.value } : v) })} />
                </label>
                <label>시간
                  <input aria-label={`활동 ${index + 1} 시간`} value={item.timestamp} maxLength={80}
                    onChange={(e) => patch({ items: draft.items.map((v, i) => i === index ? { ...v, timestamp: e.target.value } : v) })} />
                </label>
                <label>아이콘
                  <select aria-label={`활동 ${index + 1} 아이콘`} value={item.icon}
                    onChange={(e) => patch({ items: draft.items.map((v, i) => i === index ? { ...v, icon: e.target.value } : v) })}>
                    <option value="info">안내</option><option value="check">완료</option>
                    <option value="clock">대기</option><option value="alert">주의</option>
                  </select>
                </label>
                <button type="button" disabled={index === 0} onClick={() => {
                  const items = [...draft.items];
                  [items[index - 1], items[index]] = [items[index], items[index - 1]];
                  patch({ items });
                }} aria-label={`활동 ${index + 1} 위로`}>위로</button>
                <button type="button" onClick={() => patch({ items: draft.items.filter((_, i) => i !== index) })}
                  aria-label={`활동 ${index + 1} 삭제`}>삭제</button>
              </fieldset>
            ))}
            <button type="button" disabled={draft.items.length >= 20}
              onClick={() => patch({ items: [...draft.items, {
                title: "새 활동", description: "", timestamp: "방금", icon: "info",
              }] })}>활동 항목 추가</button>
          </div>
        )}
        {draft.type === "summary" && (
          <>
            <label>
              표시 값
              <input aria-label="표시 값" value={draft.displayValue} maxLength={80}
                onChange={(e) => patch({ displayValue: e.target.value })} />
            </label>
            <label>
              요약 설명
              <textarea aria-label="요약 설명" value={draft.description} maxLength={500}
                onChange={(e) => patch({ description: e.target.value })} />
            </label>
          </>
        )}
        {draft.type === "kpi" && (
          <>
            {numberField("값", "value", draft.value)}
            <label>
              단위
              <input
                aria-label="단위"
                value={draft.unit}
                maxLength={12}
                onChange={(e) => patch({ unit: e.target.value })}
              />
            </label>
            {numberField("증감", "change", draft.change)}
          </>
        )}
        {draft.type === "progress" && (
          <>
            {numberField("진행 값", "value", draft.value)}
            {numberField("최대값", "max", draft.max)}
          </>
        )}
        {draft.type === "notification" && (
          <>
            <label>
              알림 문구
              <textarea
                value={draft.message}
                maxLength={500}
                onChange={(e) => patch({ message: e.target.value })}
              />
            </label>
            <label>
              상태
              <select
                value={draft.status}
                onChange={(e) => patch({ status: e.target.value })}
              >
                {["info", "success", "warning", "error"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </>
        )}
        {draft.type === "chart" && (
          <label>
            차트 종류
            <select
              value={draft.chartType}
              onChange={(e) => patch({ chartType: e.target.value })}
            >
              {["line", "bar", "area", "donut"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {(draft.type === "chart" || draft.type === "table") && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setDataDraft(structuredClone(draft));
              setDataOpen(true);
              setError("");
            }}
          >
            데이터 편집
          </button>
        )}
        {dataOpen && (
          <dialog
            ref={dataDialog}
            className="data-editor"
            aria-label="데이터 편집기"
            onCancel={() => setDataOpen(false)}
          >
            <h3>샘플 데이터</h3>
            {dataDraft.type === "chart" && (
              <>
                {dataDraft.labels.map((label, i) => (
                  <label key={i}>
                    라벨 {i + 1}
                    <input
                      value={label}
                      onChange={(e) =>
                        setDataDraft({
                          ...dataDraft,
                          labels: dataDraft.labels.map((v, j) =>
                            j === i ? e.target.value : v,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                {dataDraft.datasets.map((ds, i) => (
                  <fieldset key={i}>
                    <legend>데이터셋 {i + 1}</legend>
                    <label>
                      데이터셋 이름
                      <input
                        value={ds.name}
                        onChange={(e) =>
                          setDataDraft({
                            ...dataDraft,
                            datasets: dataDraft.datasets.map((d, j) =>
                              j === i ? { ...d, name: e.target.value } : d,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      차트 색상
                      <input
                        value={ds.color}
                        onChange={(e) =>
                          setDataDraft({
                            ...dataDraft,
                            datasets: dataDraft.datasets.map((d, j) =>
                              j === i ? { ...d, color: e.target.value } : d,
                            ),
                          })
                        }
                      />
                    </label>
                    {ds.data.map((v, k) => (
                      <label key={k}>
                        {dataDraft.labels[k]} 값
                        <NumberInput
                          value={v}
                          onChange={(value) =>
                            setDataDraft({
                              ...dataDraft,
                              datasets: dataDraft.datasets.map((d, j) =>
                                j === i
                                  ? {
                                      ...d,
                                      data: d.data.map((n, l) =>
                                        l === k ? value : n,
                                      ),
                                    }
                                  : d,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      disabled={dataDraft.datasets.length === 1}
                      onClick={() =>
                        setDataDraft({
                          ...dataDraft,
                          datasets: dataDraft.datasets.filter(
                            (_, j) => i !== j,
                          ),
                        })
                      }
                    >
                      데이터셋 삭제
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  disabled={dataDraft.labels.length >= 24}
                  onClick={() =>
                    setDataDraft({
                      ...dataDraft,
                      labels: [...dataDraft.labels, "새 항목"],
                      datasets: dataDraft.datasets.map((ds) => ({
                        ...ds,
                        data: [...ds.data, 0],
                      })),
                    })
                  }
                >
                  항목 추가
                </button>
                <button
                  type="button"
                  disabled={dataDraft.labels.length <= 1}
                  onClick={() =>
                    setDataDraft({
                      ...dataDraft,
                      labels: dataDraft.labels.slice(0, -1),
                      datasets: dataDraft.datasets.map((ds) => ({
                        ...ds,
                        data: ds.data.slice(0, -1),
                      })),
                    })
                  }
                >
                  마지막 항목 삭제
                </button>
                <button
                  type="button"
                  disabled={
                    dataDraft.datasets.length >= 4 ||
                    dataDraft.chartType === "donut"
                  }
                  onClick={() =>
                    setDataDraft({
                      ...dataDraft,
                      datasets: [
                        ...dataDraft.datasets,
                        {
                          name: "새 데이터셋",
                          color: "#397ce8",
                          data: dataDraft.labels.map(() => 0),
                        },
                      ],
                    })
                  }
                >
                  데이터셋 추가
                </button>
              </>
            )}
            {dataDraft.type === "table" && (
              <>
                {dataDraft.columns.map((col, i) => (
                  <label key={col.key}>
                    컬럼 {i + 1}
                    <input
                      value={col.label}
                      onChange={(e) =>
                        setDataDraft({
                          ...dataDraft,
                          columns: dataDraft.columns.map((c, j) =>
                            i === j ? { ...c, label: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <div className="data-grid">
                  <table>
                    <thead>
                      <tr>
                        {dataDraft.columns.map((c) => (
                          <th key={c.key}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataDraft.rows.map((row, i) => (
                        <tr key={i}>
                          {dataDraft.columns.map((col) => (
                            <td key={col.key}>
                              {typeof row[col.key] === "number" ? (
                                <NumberInput
                                  label={`${i + 1}행 ${col.label}`}
                                  value={row[col.key] as number}
                                  onChange={(value) =>
                                    setDataDraft({
                                      ...dataDraft,
                                      rows: dataDraft.rows.map((r, j) =>
                                        i === j
                                          ? { ...r, [col.key]: value }
                                          : r,
                                      ),
                                    })
                                  }
                                />
                              ) : (
                                <input
                                  aria-label={`${i + 1}행 ${col.label}`}
                                  value={row[col.key]}
                                  onChange={(e) =>
                                    setDataDraft({
                                      ...dataDraft,
                                      rows: dataDraft.rows.map((r, j) =>
                                        i === j
                                          ? { ...r, [col.key]: e.target.value }
                                          : r,
                                      ),
                                    })
                                  }
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!dataDraft.rows.length && <p>표시할 행이 없습니다.</p>}
                <button
                  type="button"
                  disabled={dataDraft.rows.length >= 100}
                  onClick={() =>
                    setDataDraft({
                      ...dataDraft,
                      rows: [
                        ...dataDraft.rows,
                        Object.fromEntries(
                          dataDraft.columns.map((c) => [
                            c.key,
                            typeof dataDraft.rows[0]?.[c.key] === "number"
                              ? 0
                              : "",
                          ]),
                        ),
                      ],
                    })
                  }
                >
                  행 추가
                </button>
                <button
                  type="button"
                  disabled={!dataDraft.rows.length}
                  onClick={() =>
                    setDataDraft({
                      ...dataDraft,
                      rows: dataDraft.rows.slice(0, -1),
                    })
                  }
                >
                  마지막 행 삭제
                </button>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                const parsed = componentSchema.safeParse(dataDraft);
                if (!parsed.success) {
                  setError(
                    parsed.error.issues.map((i) => i.message).join(" / "),
                  );
                  return;
                }
                setDraft(parsed.data);
                setDataOpen(false);
                setError("");
              }}
            >
              데이터 적용
            </button>
            <button
              type="button"
              onClick={() => {
                setDataOpen(false);
                setError("");
              }}
            >
              데이터 취소
            </button>
          </dialog>
        )}
        <p>입력 후 변경 적용을 누르면 화면에 반영됩니다.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button primary" disabled={dataOpen}>
          변경 적용
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setDraft(structuredClone(component));
            setResetVersion((v) => v + 1);
            setDataOpen(false);
            setError("");
          }}
        >
          입력 취소
        </button>
      </fieldset>
    </form>
  );
}
