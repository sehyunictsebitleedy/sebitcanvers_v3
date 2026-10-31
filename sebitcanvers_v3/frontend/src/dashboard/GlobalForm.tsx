import { useState } from "react";
import type { DashboardSchema } from "./schema";
import { dashboardSchema } from "./schema";
import { useFieldErrors } from "./FieldErrors";
import { saveImage } from "../create/assets";
import { AssetImage } from "./AssetImage";
import { NavigationEditor } from "./NavigationEditor";

export function GlobalForm({
  schema,
  mode,
  onApply,
  disabled,
}: {
  schema: DashboardSchema;
  mode: "global" | "visual";
  onApply: (patch: Partial<DashboardSchema>) => boolean;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(() => structuredClone(schema));
  const [error, setError] = useState("");
  const { ref: formRef, field, errors: fieldErrors, setIssues } = useFieldErrors();
  const [uploading, setUploading] = useState(false);
  const visual = draft.mainVisual;
  const patchVisual = (patch: Partial<typeof visual>) =>
    setDraft((current) => ({
      ...current,
      mainVisual: { ...current.mainVisual, ...patch },
    }));
  return (
    <form
      ref={formRef}
      className="workspace-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const checked = dashboardSchema.safeParse(draft);
        if (!checked.success) {
          setIssues(checked.error.issues);
          setError("");
          return;
        }
        setIssues([]);
        setError(
          onApply(
            mode === "visual"
              ? { mainVisual: visual }
              : {
                  project: draft.project,
                  header: draft.header,
                  theme: draft.theme,
                  navigation: draft.navigation,
                  sections: draft.sections,
                },
          )
            ? ""
            : "입력값을 확인해 주세요. 제목·날짜·색상·URL과 최소 하나의 표시 항목이 필요합니다.",
        );
      }}
    >
      <fieldset disabled={disabled || uploading}>
        <legend>{mode === "visual" ? "메인 비주얼" : "전체 설정"}</legend>
        {mode === "global" ? (
          <>
            <fieldset className="property-group"><legend>내용 · 헤더</legend>
            <label>
              프로젝트 이름
              <input
                {...field("project.name")} value={draft.project.name}
                maxLength={120}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    project: { ...draft.project, name: e.target.value },
                  })
                }
              />
            </label>
            <label>
              대시보드 제목
              <input
                {...field("header.title")} value={draft.header.title}
                maxLength={120}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    header: { ...draft.header, title: e.target.value },
                  })
                }
              />
            </label>
            <label>
              설명
              <textarea
                {...field("header.description")} value={draft.header.description}
                maxLength={300}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    header: { ...draft.header, description: e.target.value },
                  })
                }
              />
            </label>
            <label>헤더 날짜 표시
              <input type="checkbox" aria-label="헤더 날짜 표시"
                checked={draft.header.date?.visible ?? false}
                onChange={(event) => {
                  const now = new Date();
                  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
                  setDraft({ ...draft, header: { ...draft.header, date: {
                    visible: event.target.checked, value: draft.header.date?.value ?? today,
                  } } });
                }} />
            </label>
            {draft.header.date?.visible && (
              <label>기준일
                <input type="date" aria-label="헤더 기준일" {...field("header.date.value")} value={draft.header.date.value}
                  onChange={(event) => setDraft({ ...draft, header: { ...draft.header,
                    date: { visible: true, value: event.target.value },
                  } })} />
                <small>선택한 날짜를 저장하며, 새로고침해도 자동 변경되지 않습니다.</small>
              </label>
            )}
            </fieldset>
            <fieldset className="property-group"><legend>스타일</legend>
            {(
              [
                "primary",
                "background",
                "surface",
                "text",
                "muted",
                "border",
              ] as const
            ).map((key, i) => (
              <label key={key}>
                {
                  [
                    "강조색",
                    "배경색",
                    "카드색",
                    "글자색",
                    "보조 글자색",
                    "테두리색",
                  ][i]
                }
                <input
                  {...field(`theme.${key}`)} value={draft.theme[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      theme: { ...draft.theme, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            </fieldset>
            <fieldset className="property-group"><legend>메뉴 · 레이아웃</legend>
            <label>
              로고 텍스트
              <input
                {...field("navigation.logoText")} value={draft.navigation.logoText}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navigation: {
                      ...draft.navigation,
                      logoText: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              메뉴 위치
              <select
                aria-label="메뉴 위치"
                {...field("navigation.type")} value={draft.navigation.type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    navigation: {
                      ...draft.navigation,
                      type: e.target.value as "sidebar" | "top",
                    },
                  })
                }
              >
                <option value="sidebar">사이드바</option>
                <option value="top">상단</option>
              </select>
            </label>
            <NavigationEditor navigation={draft.navigation} field={field}
              onChange={(navigation) => setDraft({ ...draft, navigation })} />
            </fieldset>
            <fieldset className="property-group"><legend>섹션 · 표시</legend>
            {draft.sections.map((section, i) => (
              <div key={section.id}>
                <label>
                  섹션 {i + 1}
                  <input
                    {...field(`sections.${i}.title`)} value={section.title}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sections: draft.sections.map((s, j) =>
                          i === j ? { ...s, title: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  섹션 표시
                  <input
                    type="checkbox"
                    {...field(`sections.${i}.visible`)} checked={section.visible}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        sections: draft.sections.map((s, j) =>
                          i === j ? { ...s, visible: e.target.checked } : s,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
            </fieldset>
          </>
        ) : (
          <>
            <label>
              메인 비주얼 사용
              <input
                type="checkbox"
                {...field("mainVisual.enabled")} checked={visual.enabled}
                onChange={(e) => patchVisual({ enabled: e.target.checked })}
              />
            </label>
            <fieldset disabled={!visual.enabled}>
            <legend>비주얼 세부 설정</legend>
            <label>
              유형
              <select
                {...field("mainVisual.type")} value={visual.type}
                onChange={(e) =>
                  patchVisual({ type: e.target.value as typeof visual.type })
                }
              >
                {["banner", "hero", "image-text"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              높이
              <select
                {...field("mainVisual.height")} value={visual.height ?? "medium"}
                onChange={(e) =>
                  patchVisual({
                    height: e.target.value as typeof visual.height,
                  })
                }
              >
                {["small", "medium", "large"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              비주얼 제목
              <input
                {...field("mainVisual.title")} value={visual.title}
                maxLength={120}
                onChange={(e) => patchVisual({ title: e.target.value })}
              />
            </label>
            <label>
              비주얼 설명
              <textarea
                {...field("mainVisual.description")} value={visual.description}
                maxLength={500}
                onChange={(e) => patchVisual({ description: e.target.value })}
              />
            </label>
            <label>
              정렬
              <select
                {...field("mainVisual.alignment")} value={visual.alignment ?? "left"}
                onChange={(e) =>
                  patchVisual({
                    alignment: e.target.value as typeof visual.alignment,
                  })
                }
              >
                {["left", "center", "right"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              오버레이 {visual.overlay ?? 35}%
              <input
                type="range"
                min={0}
                max={80}
                {...field("mainVisual.overlay")} value={visual.overlay ?? 35}
                onChange={(e) =>
                  patchVisual({ overlay: Number(e.target.value) })
                }
              />
            </label>
            <AssetImage id={visual.imageAssetId} />
            <label>
              이미지 업로드
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const id = await saveImage(file);
                    patchVisual({ imageAssetId: id });
                    setError("");
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "업로드 실패",
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => patchVisual({ imageAssetId: null })}
            >
              이미지 제거
            </button>
            <label>
              CTA 사용
              <input
                type="checkbox"
                checked={visual.cta?.enabled ?? false}
                onChange={(e) =>
                  patchVisual({
                    cta: {
                      label: "자세히 보기",
                      url: "#dashboard-data",
                      ...visual.cta,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
            </label>
            {visual.cta && (
              <>
                <label>
                  버튼 이름
                  <input
                    {...field("mainVisual.cta.label")} value={visual.cta.label}
                    maxLength={120}
                    onChange={(e) =>
                      patchVisual({
                        cta: { ...visual.cta!, label: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  버튼 주소
                  <input
                    {...field("mainVisual.cta.url")} value={visual.cta.url}
                    onChange={(e) =>
                      patchVisual({
                        cta: { ...visual.cta!, url: e.target.value },
                      })
                    }
                  />
                </label>
              </>
            )}
            </fieldset>
          </>
        )}
        {fieldErrors}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary" type="submit">
          변경 적용
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            setDraft(structuredClone(schema));
            setIssues([]);
            setError("");
          }}
        >
          입력 취소
        </button>
      </fieldset>
      {uploading && <p role="status">이미지 저장 중…</p>}
    </form>
  );
}
