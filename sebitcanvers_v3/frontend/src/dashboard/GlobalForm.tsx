import { useState } from "react";
import type { DashboardSchema } from "./schema";
import { saveImage } from "../create/assets";
import { AssetImage } from "./AssetImage";

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
  const [uploading, setUploading] = useState(false);
  const visual = draft.mainVisual;
  const patchVisual = (patch: Partial<typeof visual>) =>
    setDraft((current) => ({
      ...current,
      mainVisual: { ...current.mainVisual, ...patch },
    }));
  return (
    <form
      className="workspace-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
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
            : "입력값을 확인해 주세요. 제목·색상·URL과 최소 하나의 표시 항목이 필요합니다.",
        );
      }}
    >
      <fieldset disabled={disabled || uploading}>
        <legend>{mode === "visual" ? "메인 비주얼" : "전체 설정"}</legend>
        {mode === "global" ? (
          <>
            <label>
              프로젝트 이름
              <input
                value={draft.project.name}
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
                value={draft.header.title}
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
                value={draft.header.description}
                maxLength={300}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    header: { ...draft.header, description: e.target.value },
                  })
                }
              />
            </label>
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
                  value={draft.theme[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      theme: { ...draft.theme, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <label>
              로고 텍스트
              <input
                value={draft.navigation.logoText}
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
                value={draft.navigation.type}
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
            {draft.navigation.items.map((item, i) => (
              <label key={item.id}>
                메뉴 {i + 1}
                <input
                  value={item.label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      navigation: {
                        ...draft.navigation,
                        items: draft.navigation.items.map((n, j) =>
                          i === j ? { ...n, label: e.target.value } : n,
                        ),
                      },
                    })
                  }
                />
              </label>
            ))}
            {draft.sections.map((section, i) => (
              <div key={section.id}>
                <label>
                  섹션 {i + 1}
                  <input
                    value={section.title}
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
                    checked={section.visible}
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
          </>
        ) : (
          <>
            <label>
              메인 비주얼 사용
              <input
                type="checkbox"
                checked={visual.enabled}
                onChange={(e) => patchVisual({ enabled: e.target.checked })}
              />
            </label>
            <label>
              유형
              <select
                value={visual.type}
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
                value={visual.height ?? "medium"}
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
                value={visual.title}
                maxLength={120}
                onChange={(e) => patchVisual({ title: e.target.value })}
              />
            </label>
            <label>
              비주얼 설명
              <textarea
                value={visual.description}
                maxLength={500}
                onChange={(e) => patchVisual({ description: e.target.value })}
              />
            </label>
            <label>
              정렬
              <select
                value={visual.alignment ?? "left"}
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
                value={visual.overlay ?? 35}
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
                    value={visual.cta.label}
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
                    value={visual.cta.url}
                    onChange={(e) =>
                      patchVisual({
                        cta: { ...visual.cta!, url: e.target.value },
                      })
                    }
                  />
                </label>
              </>
            )}
          </>
        )}
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
