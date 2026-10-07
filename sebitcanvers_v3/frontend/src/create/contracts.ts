import { z } from "zod";

export const dashboardTypes = [
  {
    id: 0,
    key: "analytics",
    name: "분석",
    description: "데이터에서 찾는 인사이트",
  },
  {
    id: 1,
    key: "admin",
    name: "관리자",
    description: "시스템 운영과 현황 관리",
  },
  {
    id: 3,
    key: "project",
    name: "프로젝트",
    description: "팀의 업무와 진행 상황",
  },
  {
    id: 4,
    key: "monitoring",
    name: "모니터링",
    description: "서비스 상태와 알림",
  },
] as const;
export const safeUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (/^#[a-zA-Z0-9_-]+$/.test(value)) return true;
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "http(s) 주소 또는 #앵커를 입력해 주세요.");
export const mainVisualOptionsSchema = z.strictObject({
  enabled: z.boolean(),
  type: z.enum(["banner", "hero", "image-text"]),
  height: z.enum(["small", "medium", "large"]),
  title: z.string().max(120),
  description: z.string().max(500),
  alignment: z.enum(["left", "center", "right"]),
  overlay: z.number().min(0).max(80),
  imageAssetId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,80}$/)
    .nullable(),
  imageName: z.string().max(255),
  cta: z.strictObject({
    enabled: z.boolean(),
    label: z.string().max(40),
    url: z.string().max(2048),
  }),
});
// Drafts allow incomplete form fields; validation at submission preserves them for recovery.
export const createOptionsSchema = z.strictObject({
  name: z.string().max(60),
  type: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(4)]),
  navigation: z.enum(["sidebar", "top"]),
  style: z.enum(["modern", "minimal", "corporate", "dark"]),
  color: z.enum(["blue", "green", "purple", "neutral"]),
  components: z
    .array(z.enum(["kpi", "chart", "table", "progress", "notification"]))
    .max(5),
  density: z.enum(["compact", "standard", "spacious"]),
  mainVisual: mainVisualOptionsSchema,
  additionalRequest: z.string().max(500),
});
export const readyOptionsSchema = createOptionsSchema.superRefine(
  (value, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (!value.name.trim()) issue(["name"], "프로젝트 이름을 입력해 주세요.");
    if (!value.components.length)
      issue(["components"], "컴포넌트를 하나 이상 선택해 주세요.");
    if (new Set(value.components).size !== value.components.length)
      issue(["components"], "중복된 컴포넌트 선택입니다.");
    if (value.mainVisual.enabled) {
      if (!value.mainVisual.title.trim())
        issue(["mainVisual", "title"], "메인 비주얼 제목을 입력해 주세요.");
      if (value.mainVisual.cta.enabled) {
        if (!value.mainVisual.cta.label.trim())
          issue(["mainVisual", "cta", "label"], "버튼 이름을 입력해 주세요.");
        if (!safeUrl.safeParse(value.mainVisual.cta.url).success)
          issue(
            ["mainVisual", "cta", "url"],
            "http(s) 주소 또는 #앵커를 입력해 주세요.",
          );
      }
    }
  },
);
export type CreateOptions = z.infer<typeof createOptionsSchema>;
export function defaultOptions(type: number = 0): CreateOptions {
  return createOptionsSchema.parse({
    name: "새 대시보드",
    type,
    navigation: "sidebar",
    style: "modern",
    color: "blue",
    components: ["kpi", "chart", "table"],
    density: "standard",
    mainVisual: {
      enabled: false,
      type: "banner",
      height: "medium",
      title: "프로젝트 운영현황",
      description: "우리 팀의 주요 지표와 진행 상황을 한눈에 확인하세요.",
      alignment: "left",
      overlay: 35,
      imageAssetId: null,
      imageName: "",
      cta: { enabled: false, label: "자세히 보기", url: "#dashboard-data" },
    },
    additionalRequest: "",
  });
}
export const createDraftKey = "sebit-create-options-v1";
export function readCreateDraft(
  storage: Pick<Storage, "getItem">,
): CreateOptions | null {
  const value = storage.getItem(createDraftKey);
  if (!value) return null;
  const envelope = z
    .strictObject({ version: z.literal(1), options: createOptionsSchema })
    .parse(JSON.parse(value));
  return envelope.options;
}
export function saveCreateDraft(
  storage: Pick<Storage, "setItem">,
  options: CreateOptions,
) {
  storage.setItem(
    createDraftKey,
    JSON.stringify({ version: 1, options: createOptionsSchema.parse(options) }),
  );
}
