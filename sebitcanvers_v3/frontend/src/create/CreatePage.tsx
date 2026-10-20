import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Folder,
  LayoutDashboard,
  Monitor,
  PanelLeft,
  PanelsTopLeft,
  SlidersHorizontal,
  ImagePlus,
  X,
} from "lucide-react";
import {
  createDraftKey,
  dashboardTypes,
  defaultOptions,
  readCreateDraft,
  readyOptionsSchema,
  saveCreateDraft,
} from "./contracts";
import type { CreateOptions } from "./contracts";
import { accents, buildDashboard, stylePresets } from "./buildDashboard";
import { getAsset, saveImage } from "./assets";
import { SchemaPreview } from "../dashboard/Preview";
import { AssetImage } from "../dashboard/AssetImage";
import type { DashboardSchema } from "../dashboard/schema";
import "./create.css";
import { generateDashboard } from "./generation";

type Choice<T> = {
  value: T;
  title: string;
  description?: string;
  visual?: ReactNode;
};
function Choices<T extends string | number>({
  legend,
  name,
  value,
  choices,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="create-group">
      <legend>{legend}</legend>
      <div className={`create-choices count-${choices.length}`}>
        {choices.map((choice) => (
          <label
            className={`create-choice ${value === choice.value ? "selected" : ""}`}
            key={choice.value}
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              aria-label={choice.title}
            />
            {choice.visual && (
              <span className="choice-visual">{choice.visual}</span>
            )}
            <span className="choice-title">{choice.title}</span>
            {choice.description && <small>{choice.description}</small>}
            <Check className="choice-check" size={14} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
const styleNames = {
  modern: "Modern",
  minimal: "Minimal",
  corporate: "Corporate",
  dark: "Dark",
};
const colorNames = {
  blue: "블루",
  green: "그린",
  purple: "퍼플",
  neutral: "뉴트럴",
};
const densityNames = {
  compact: "촘촘하게",
  standard: "기본",
  spacious: "여유롭게",
};
const componentLabels = {
  kpi: "KPI 카드",
  chart: "차트",
  table: "테이블",
  progress: "진행률",
  notification: "알림",
};
const typeIcons = [BarChart3, LayoutDashboard, Folder, Monitor];
function readInitial(type?: number) {
  try {
    const saved = readCreateDraft(localStorage);
    const options = saved ?? defaultOptions();
    return {
      options:
        type === undefined
          ? options
          : { ...options, type: defaultOptions(type).type },
      error: "",
      restored: !!saved,
    };
  } catch {
    return {
      options: defaultOptions(type),
      error:
        "이전 선택 조건을 복원하지 못했습니다. 기존 데이터는 보존되어 있습니다.",
      restored: false,
    };
  }
}
export function CreatePage({
  initialType,
  initialOptions,
  onHome,
  onStart,
}: {
  initialType?: number;
  initialOptions?: CreateOptions;
  onHome: () => void;
  onStart: (schema: DashboardSchema) => void;
}) {
  const [initial] = useState(() => initialOptions
    ? { options: initialOptions, error: "", restored: true }
    : readInitial(initialType));
  const [options, setOptions] = useState<CreateOptions>(initial.options);
  const [blocked, setBlocked] = useState(!!initial.error);
  const [storageStatus, setStorageStatus] = useState(
    initial.error ||
      (initial.restored
        ? "이전 선택 조건을 복원했습니다."
        : "기본 조건으로 시작하세요."),
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [generation, setGeneration] = useState<"idle" | "pending" | "failed">(
    "idle",
  );
  const [generationError, setGenerationError] = useState("");
  useEffect(() => () => request.current?.abort(), []);
  const uploadVersion = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const persist = (next: CreateOptions, allow = !blocked) => {
    if (!allow) return;
    try {
      saveCreateDraft(localStorage, next);
      setStorageStatus("선택 조건이 브라우저에 저장되었습니다.");
    } catch {
      setStorageStatus(
        "저장 실패: 현재 선택은 유지됩니다. 다시 저장해 주세요.",
      );
    }
  };
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const change = <K extends keyof CreateOptions>(
    key: K,
    value: CreateOptions[K],
  ) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    setIssues([]);
  };
  const visual = <K extends keyof CreateOptions["mainVisual"]>(
    key: K,
    value: CreateOptions["mainVisual"][K],
  ) => change("mainVisual", { ...options.mainVisual, [key]: value });
  const validation = useMemo(
    () => readyOptionsSchema.safeParse(options),
    [options],
  );
  const preview = useMemo(
    () =>
      validation.success
        ? buildDashboard(
            validation.data,
            "selection-preview",
            "2026-01-01T00:00:00.000Z",
          )
        : null,
    [validation],
  );
  const recover = () => {
    try {
      const previous = localStorage.getItem(createDraftKey);
      if (previous)
        localStorage.setItem(`${createDraftKey}-recovery`, previous);
      saveCreateDraft(localStorage, options);
      setBlocked(false);
      setStorageStatus("이전 데이터를 백업하고 현재 조건을 저장했습니다.");
    } catch {
      setStorageStatus("저장에 실패했습니다. 기존 데이터는 유지됩니다.");
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const version = ++uploadVersion.current;
    setUploading(true);
    setImageError("");
    try {
      const id = await saveImage(file);
      if (version === uploadVersion.current) {
        setOptions((current) => {
          const next = {
            ...current,
            mainVisual: {
              ...current.mainVisual,
              imageAssetId: id,
              imageName: file.name,
            },
          };
          return next;
        });
        // Persist in the next render, with the latest form fields rather than a stale upload closure.
      }
    } catch (error) {
      if (version === uploadVersion.current)
        setImageError(
          error instanceof Error
            ? error.message
            : "이미지를 업로드할 수 없습니다.",
        );
    } finally {
      if (version === uploadVersion.current) setUploading(false);
    }
  };
  useEffect(() => {
    if (blocked) return;
    let active = true;
    let message = "선택 조건이 브라우저에 저장되었습니다.";
    try {
      saveCreateDraft(localStorage, options);
    } catch {
      message = "저장 실패: 현재 선택은 유지됩니다. 다시 저장해 주세요.";
    }
    queueMicrotask(() => {
      if (active) setStorageStatus(message);
    });
    return () => {
      active = false;
    };
  }, [options, blocked]);
  useEffect(
    () => () => {
      uploadVersion.current++;
    },
    [],
  );
  const submit = async (event: FormEvent, ai = false) => {
    event.preventDefault();
    if (lock.current || uploading) return;
    if (!validation.success) {
      setIssues(validation.error.issues.map((issue) => issue.message));
      return;
    }
    if (initialOptions && !window.confirm("현재 디자인을 새 결과로 교체할까요? 기존 디자인은 1개 백업되며 복원할 수 있습니다.")) return;
    lock.current = true;
    setBusy(true);
    setIssues([]);
    const controller = new AbortController();
    request.current = controller;
    if (ai) {
      setGeneration("pending");
      setGenerationError("");
    }
    const timer = setTimeout(() => controller.abort("timeout"), 125000);
    try {
      if (
        options.mainVisual.enabled &&
        options.mainVisual.imageAssetId &&
        !(await getAsset(options.mainVisual.imageAssetId))
      )
        throw new Error(
          "저장된 이미지가 없습니다. 이미지를 교체하거나 제거해 주세요.",
        );
      persist(options);
      const schema = ai
        ? await generateDashboard(options, controller.signal)
        : buildDashboard(
            options,
            crypto.randomUUID(),
            new Date().toISOString(),
          );
      if (controller.signal.aborted) return;
      onStart(schema);
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (ai) {
        setGenerationError(
          controller.signal.aborted
            ? "생성 시간이 초과되었습니다. 다시 시도해 주세요."
            : error instanceof Error
              ? error.message
              : "생성에 실패했습니다.",
        );
        setGeneration("failed");
      }
      setIssues([
        error instanceof Error
          ? error.message
          : "미리보기를 만들 수 없습니다. 다시 시도해 주세요.",
      ]);
    } finally {
      clearTimeout(timer);
      setBusy(false);
      lock.current = false;
    }
  };
  const selectedType = dashboardTypes.find((item) => item.id === options.type)!;
  if (generation !== "idle")
    return (
      <main
        className="generation-page container"
        aria-busy={generation === "pending"}
      >
        <span className="create-eyebrow">DASHBOARD BUILDER · GENERATING</span>
        <h1>
          {generation === "pending"
            ? "대시보드를 만들고 있어요"
            : "생성을 완료하지 못했어요"}
        </h1>
        <p>
          {options.name} · {selectedType.name} · 선택 조건과 추가 요청으로 샘플
          데이터를 구성합니다.
        </p>
        <ol className="generation-stages">
          <li>선택 조건 확인 완료</li>
          <li aria-current="step">
            {generation === "pending"
              ? "AI 생성 및 결과 검증 중"
              : "생성 중 오류 발생"}
          </li>
          <li>완료되면 미리보기로 이동</li>
        </ol>
        {generation === "pending" ? (
          <div className="generation-skeleton" aria-hidden="true">
            <div />
            <div />
            <div />
            <div />
          </div>
        ) : (
          <p className="form-error" role="alert">
            {generationError}
          </p>
        )}
        <div className="generation-actions">
          {generation === "failed" && (
            <button
              className="button primary"
              onClick={(e) => void submit(e, true)}
            >
              다시 생성
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => {
              request.current?.abort();
              setGeneration("idle");
              setIssues([]);
            }}
          >
            {generation === "pending"
              ? "생성 취소 · 조건으로 돌아가기"
              : "조건 수정하기"}
          </button>
        </div>
        <p>
          선택한 조건은 유지됩니다. AI 결과는 검증을 통과한 경우에만 저장됩니다.
        </p>
      </main>
    );
  return (
    <main className="create-page container" id="main">
      <button className="create-back" onClick={onHome}>
        <ArrowLeft size={15} />
        {initialOptions ? "기존 디자인으로 돌아가기" : "홈으로"}
      </button>
      <div className="create-heading">
        <div>
          <span className="create-eyebrow">DASHBOARD BUILDER</span>
          <h1 ref={heading} tabIndex={-1}>
            {initialOptions ? "대시보드 재생성" : "어떤 대시보드를 만들까요?"}
          </h1>
          <p>
            업무에 맞는 구성과 스타일을 선택하세요. 나머지는 화면에서 확인할 수
            있어요.
          </p>
        </div>
        <ol className="create-steps">
          <li aria-current="step">
            <b>1</b>조건 선택
          </li>
          <li>
            <b>2</b>결과 확인
          </li>
          <li>
            <b>3</b>편집 · 다운로드
          </li>
        </ol>
      </div>
      <div className="create-layout">
        <form className="create-form" onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="create-form-fields">
            <section className="create-panel">
              <div className="create-panel-heading">
                <SlidersHorizontal size={18} />
                <h2>기본 구성</h2>
              </div>
              <label className="create-field-label" htmlFor="project-name">
                프로젝트 이름
              </label>
              <input
                id="project-name"
                value={options.name}
                maxLength={60}
                onChange={(event) => change("name", event.target.value)}
                placeholder="예: 우리 팀 운영현황"
              />
              <Choices
                legend="대시보드 유형"
                name="dashboard-type"
                value={options.type}
                onChange={(value) => change("type", value)}
                choices={dashboardTypes.map((item, i) => {
                  const Icon = typeIcons[i];
                  return {
                    value: item.id,
                    title: item.name,
                    description: item.description,
                    visual: <Icon size={25} />,
                  };
                })}
              />
              <Choices
                legend="네비게이션"
                name="navigation"
                value={options.navigation}
                onChange={(value) => change("navigation", value)}
                choices={[
                  {
                    value: "sidebar",
                    title: "사이드바",
                    description: "왼쪽에서 메뉴를 빠르게 탐색",
                    visual: <PanelLeft size={30} />,
                  },
                  {
                    value: "top",
                    title: "상단 메뉴",
                    description: "넓은 콘텐츠 중심 레이아웃",
                    visual: <PanelsTopLeft size={30} />,
                  },
                ]}
              />
            </section>
            <section className="create-panel">
              <div className="create-panel-heading">
                <LayoutDashboard size={18} />
                <h2>디자인</h2>
              </div>
              <Choices
                legend="스타일"
                name="style"
                value={options.style}
                onChange={(value) => change("style", value)}
                choices={(
                  Object.keys(stylePresets) as (keyof typeof stylePresets)[]
                ).map((key) => ({
                  value: key,
                  title: styleNames[key],
                  visual: (
                    <span
                      className={`style-swatch style-${key}`}
                      style={
                        {
                          background: stylePresets[key].background,
                          "--swatch-surface": stylePresets[key].surface,
                          "--swatch-border": stylePresets[key].border,
                          "--swatch-radius": `${stylePresets[key].radius / 2}px`,
                        } as CSSProperties
                      }
                    >
                      <i />
                      <span>
                        <i />
                        <i />
                        <i />
                        <b />
                      </span>
                    </span>
                  ),
                }))}
              />
              <fieldset className="create-group">
                <legend>컬러 테마</legend>
                <div className="create-colors">
                  {(Object.keys(accents) as (keyof typeof accents)[]).map(
                    (key) => (
                      <label
                        key={key}
                        className={options.color === key ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="color"
                          checked={options.color === key}
                          onChange={() => change("color", key)}
                          aria-label={colorNames[key]}
                        />
                        <span style={{ background: accents[key] }}>
                          {options.color === key && <Check size={16} />}
                        </span>
                        {colorNames[key]}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
              <Choices
                legend="화면 밀도"
                name="density"
                value={options.density}
                onChange={(value) => change("density", value)}
                choices={(
                  Object.keys(densityNames) as (keyof typeof densityNames)[]
                ).map((key) => ({ value: key, title: densityNames[key] }))}
              />
            </section>
            <section className="create-panel">
              <div className="create-panel-heading">
                <BarChart3 size={18} />
                <h2>포함할 컴포넌트</h2>
              </div>
              <p className="create-help">
                필요한 정보를 선택하세요. 하나 이상의 컴포넌트가 필요합니다.
              </p>
              <div className="create-components">
                {(
                  Object.keys(
                    componentLabels,
                  ) as (keyof typeof componentLabels)[]
                ).map((key) => (
                  <label
                    key={key}
                    className={
                      options.components.includes(key) ? "selected" : ""
                    }
                  >
                    <input
                      type="checkbox"
                      checked={options.components.includes(key)}
                      onChange={(event) =>
                        change(
                          "components",
                          event.target.checked
                            ? [...options.components, key]
                            : options.components.filter((item) => item !== key),
                        )
                      }
                    />
                    {componentLabels[key]}
                  </label>
                ))}
              </div>
              {!options.components.length && (
                <p className="create-error" role="alert">
                  컴포넌트를 하나 이상 선택해 주세요.
                </p>
              )}
            </section>
            <section className="create-panel">
              <div className="create-panel-heading">
                <ImagePlus size={18} />
                <h2>메인 비주얼</h2>
                <label className="create-toggle">
                  <input
                    type="checkbox"
                    checked={options.mainVisual.enabled}
                    onChange={(event) =>
                      visual("enabled", event.target.checked)
                    }
                  />
                  사용하기
                </label>
              </div>
              <p className="create-help">
                대시보드 상단에 제목과 이미지를 담은 전용 영역을 추가합니다.
              </p>
              {options.mainVisual.enabled && (
                <div className="visual-fields">
                  <Choices
                    legend="비주얼 유형"
                    name="visual-type"
                    value={options.mainVisual.type}
                    onChange={(value) => visual("type", value)}
                    choices={[
                      {
                        value: "banner",
                        title: "배너",
                        visual: <span className="visual-diagram banner" />,
                      },
                      {
                        value: "hero",
                        title: "히어로",
                        visual: <span className="visual-diagram hero" />,
                      },
                      {
                        value: "image-text",
                        title: "이미지 + 텍스트",
                        visual: <span className="visual-diagram split" />,
                      },
                    ]}
                  />
                  <div className="create-field-row">
                    <label>
                      높이
                      <select
                        value={options.mainVisual.height}
                        onChange={(event) =>
                          visual(
                            "height",
                            event.target
                              .value as CreateOptions["mainVisual"]["height"],
                          )
                        }
                      >
                        <option value="small">작게</option>
                        <option value="medium">보통</option>
                        <option value="large">크게</option>
                      </select>
                    </label>
                    <label>
                      텍스트 정렬
                      <select
                        value={options.mainVisual.alignment}
                        onChange={(event) =>
                          visual(
                            "alignment",
                            event.target
                              .value as CreateOptions["mainVisual"]["alignment"],
                          )
                        }
                      >
                        <option value="left">왼쪽</option>
                        <option value="center">가운데</option>
                        <option value="right">오른쪽</option>
                      </select>
                    </label>
                  </div>
                  <label className="create-field-label" htmlFor="visual-title">
                    비주얼 제목
                  </label>
                  <input
                    id="visual-title"
                    value={options.mainVisual.title}
                    maxLength={120}
                    onChange={(event) => visual("title", event.target.value)}
                  />
                  <label
                    className="create-field-label"
                    htmlFor="visual-description"
                  >
                    설명
                  </label>
                  <textarea
                    id="visual-description"
                    value={options.mainVisual.description}
                    maxLength={500}
                    rows={2}
                    onChange={(event) =>
                      visual("description", event.target.value)
                    }
                  />
                  <label className="create-field-label" htmlFor="visual-image">
                    배경 이미지
                  </label>
                  <div className="create-upload">
                    {options.mainVisual.imageAssetId && (
                      <div className="create-upload-thumb">
                        <AssetImage id={options.mainVisual.imageAssetId} />
                        <button
                          type="button"
                          className="icon-button"
                          aria-label="이미지 제거"
                          onClick={() => {
                            uploadVersion.current++;
                            setUploading(false);
                            change("mainVisual", {
                              ...options.mainVisual,
                              imageAssetId: null,
                              imageName: "",
                            });
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    <input
                      id="visual-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={(event) => {
                        void upload(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <small>
                      {uploading
                        ? "이미지 저장 중…"
                        : options.mainVisual.imageName ||
                          "PNG, JPG, WebP · 최대 2MB. 이미지 없이도 기본 영역을 표시합니다."}
                    </small>
                  </div>
                  {imageError && (
                    <p className="create-error" role="alert">
                      {imageError}
                    </p>
                  )}
                  <label
                    className="create-field-label"
                    htmlFor="visual-overlay"
                  >
                    어둡기 {options.mainVisual.overlay}%
                  </label>
                  <input
                    id="visual-overlay"
                    type="range"
                    min="0"
                    max="80"
                    value={options.mainVisual.overlay}
                    onChange={(event) =>
                      visual("overlay", Number(event.target.value))
                    }
                  />
                  <label className="create-check">
                    <input
                      type="checkbox"
                      checked={options.mainVisual.cta.enabled}
                      onChange={(event) =>
                        visual("cta", {
                          ...options.mainVisual.cta,
                          enabled: event.target.checked,
                        })
                      }
                    />
                    CTA 버튼 사용
                  </label>
                  {options.mainVisual.cta.enabled && (
                    <div className="create-field-row">
                      <label>
                        버튼 이름
                        <input
                          value={options.mainVisual.cta.label}
                          maxLength={40}
                          onChange={(event) =>
                            visual("cta", {
                              ...options.mainVisual.cta,
                              label: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        버튼 링크
                        <input
                          value={options.mainVisual.cta.url}
                          placeholder="https:// 또는 #dashboard-data"
                          onChange={(event) =>
                            visual("cta", {
                              ...options.mainVisual.cta,
                              url: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </section>
            <section className="create-panel">
              <label
                className="create-field-label"
                htmlFor="additional-request"
              >
                추가 요청 <span>선택</span>
              </label>
              <textarea
                id="additional-request"
                rows={4}
                maxLength={500}
                placeholder="예: 프로젝트 진행률을 강조하고, 주요 지표를 상단에 배치해 주세요."
                value={options.additionalRequest}
                onChange={(event) =>
                  change("additionalRequest", event.target.value)
                }
              />
              <div className="create-request-meta">
                <small>개인정보·비밀번호·API Key를 입력하지 마세요.</small>
                <span>{options.additionalRequest.length} / 500</span>
              </div>
              <p className="create-help">
                추가 요청은 AI 생성에 반영됩니다. 샘플 미리보기에는 반영되지
                않습니다.
              </p>
            </section>
            <div className="create-submit">
              <p>
                <Bell size={15} />
                AI로 업무에 맞게 생성하거나, 기본 샘플을 먼저 확인하세요.
              </p>
              {issues.length > 0 && (
                <ul className="create-error" role="alert">
                  {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
              <button
                className="button primary"
                type="button"
                disabled={busy || uploading}
                onClick={(event) => void submit(event, true)}
              >
                AI 대시보드 생성 <ArrowRight size={17} />
              </button>
              <button
                className="button secondary"
                type="submit"
                disabled={busy || uploading}
              >
                {busy ? "미리보기 준비 중…" : "샘플 미리보기 만들기"}
                <ArrowRight size={17} />
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="create-summary" aria-label="현재 선택 요약">
          <div className="summary-heading">
            <h2>설정 요약</h2>
            <span>PC 전용</span>
          </div>
          <p>선택한 조건이 바로 반영됩니다.</p>
          <div
            className="summary-preview"
            aria-hidden="true"
            inert
            aria-label="선택한 구성 미리보기"
          >
            {preview ? (
              <SchemaPreview schema={preview} />
            ) : (
              <div className="summary-placeholder">
                입력 조건을 확인하면 미리보기가 표시됩니다.
              </div>
            )}
          </div>
          <h3>{options.name || "새 대시보드"}</h3>
          <dl>
            <div>
              <dt>대시보드 유형</dt>
              <dd>{selectedType.name}</dd>
            </div>
            <div>
              <dt>네비게이션</dt>
              <dd>
                {options.navigation === "sidebar" ? "사이드바" : "상단 메뉴"}
              </dd>
            </div>
            <div>
              <dt>스타일</dt>
              <dd>{styleNames[options.style]}</dd>
            </div>
            <div>
              <dt>컬러 테마</dt>
              <dd>
                <i style={{ background: accents[options.color] }} />
                {colorNames[options.color]}
              </dd>
            </div>
            <div>
              <dt>화면 밀도</dt>
              <dd>{densityNames[options.density]}</dd>
            </div>
            <div>
              <dt>컴포넌트</dt>
              <dd>
                {options.components
                  .map((key) => componentLabels[key])
                  .join(", ") || "선택 없음"}
              </dd>
            </div>
            <div>
              <dt>메인 비주얼</dt>
              <dd>
                {options.mainVisual.enabled
                  ? {
                      banner: "배너",
                      hero: "히어로",
                      "image-text": "이미지 + 텍스트",
                    }[options.mainVisual.type]
                  : "사용 안 함"}
              </dd>
            </div>
            <div>
              <dt>추가 요청</dt>
              <dd>
                {options.additionalRequest
                  ? `${options.additionalRequest.length}자 입력 (저장됨)`
                  : "없음"}
              </dd>
            </div>
          </dl>
          <div className="summary-storage">
            <p role="status">{storageStatus}</p>
            <button
              type="button"
              onClick={() => (blocked ? recover() : persist(options))}
            >
              {blocked ? "기존 데이터 백업 후 저장" : "다시 저장"}
            </button>
            <small>이 브라우저에서만 복원할 수 있습니다.</small>
          </div>
        </aside>
      </div>
    </main>
  );
}
