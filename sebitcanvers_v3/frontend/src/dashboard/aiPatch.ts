import { z } from "zod";
import { activityItemsSchema, componentSchema, dashboardSchema, kpiSchema } from "./schema";
import type { DashboardSchema } from "./schema";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const chart = componentSchema.options[1];
const table = componentSchema.options[2];
const changes = z
  .strictObject({
    title: kpiSchema.shape.title.optional(),
    visible: z.boolean().optional(),
    layout: kpiSchema.shape.layout.optional(),
    value: z.number().finite().optional(),
    unit: kpiSchema.shape.unit.optional(),
    change: kpiSchema.shape.change.optional(),
    chartType: chart.shape.chartType.optional(),
    labels: chart.shape.labels.optional(),
    datasets: chart.shape.datasets.optional(),
    columns: table.shape.columns.optional(),
    rows: table.shape.rows.optional(),
    max: z.number().finite().optional(),
    message: z.string().min(1).max(500).optional(),
    status: z.enum(["info", "success", "warning", "error"]).optional(),
    description: z.string().trim().min(1).max(500).optional(),
    displayValue: z.string().trim().min(1).max(80).optional(),
    items: activityItemsSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "변경할 속성이 필요합니다.");
const visualChanges = dashboardSchema.shape.mainVisual
  .omit({ imageAssetId: true, cta: true })
  .partial()
  .extend({
    cta: dashboardSchema.shape.mainVisual.shape.cta
      .unwrap()
      .partial()
      .optional(),
  });
export const aiPatchSchema = z.strictObject({
  operations: z
    .array(
      z.discriminatedUnion("action", [
        z.strictObject({ action: z.literal("update"), targetId: id, changes }),
        z.strictObject({
          action: z.literal("add"),
          sectionId: id,
          component: componentSchema,
        }),
        z.strictObject({ action: z.literal("remove"), targetId: id }),
        z.strictObject({
          action: z.literal("move"),
          targetId: id,
          sectionId: id,
          index: z.number().int().min(0).max(19),
        }),
        z.strictObject({
          action: z.literal("themeChange"),
          changes: dashboardSchema.shape.theme.partial(),
        }),
        z.strictObject({
          action: z.literal("headerChange"),
          changes: dashboardSchema.shape.header.partial(),
        }),
        z.strictObject({
          action: z.literal("layoutChange"),
          changes: dashboardSchema.shape.layout
            .pick({ gap: true, density: true })
            .partial(),
        }),
        z.strictObject({
          action: z.literal("visualChange"),
          changes: visualChanges,
        }),
        z.strictObject({
          action: z.literal("navigationChange"),
          changes: dashboardSchema.shape.navigation.partial(),
        }),
        z.strictObject({
          action: z.literal("sectionChange"),
          targetId: id,
          changes: z.strictObject({
            title: kpiSchema.shape.title.optional(),
            visible: z.boolean().optional(),
          }),
        }),
      ]),
    )
    .min(1)
    .max(20),
});
export type AiPatch = z.infer<typeof aiPatchSchema>;
export const editRequestSchema = z.strictObject({
  schema: dashboardSchema,
  instruction: z.string().trim().min(1).max(1000),
  baseRevision: z.string().uuid(),
  targetId: id.optional(),
});

// No JSON pointers or arbitrary property assignment. Validate the entire transaction before committing.
export function applyAiPatch(
  input: DashboardSchema,
  raw: unknown,
  now = new Date().toISOString(),
  targetId?: string,
) {
  const source = dashboardSchema.parse(input);
  const patch = aiPatchSchema.parse(raw);
  const next = structuredClone(source);
  const summary: string[] = [];
  const locate = (id: string) => {
    const section = next.sections.find((s) =>
      s.components.some((c) => c.id === id),
    );
    if (!section) throw new Error(`수정할 컴포넌트를 찾을 수 없습니다: ${id}`);
    return { section, index: section.components.findIndex((c) => c.id === id) };
  };
  if (
    targetId &&
    !source.sections.some((s) => s.components.some((c) => c.id === targetId))
  )
    throw new Error("선택한 수정 대상을 찾을 수 없습니다.");
  for (const op of patch.operations) {
    if (targetId && (op.action !== "update" || op.targetId !== targetId))
      throw new Error(
        "선택한 컴포넌트의 속성만 수정할 수 있습니다. 전체 수정 범위를 선택해 주세요.",
      );
    if (op.action === "update") {
      const { section, index } = locate(op.targetId);
      const current = section.components[index];
      const updated = componentSchema.parse({ ...current, ...op.changes });
      section.components[index] = updated;
      if (JSON.stringify(current) !== JSON.stringify(updated))
        summary.push(
          `${current.title}: ${Object.keys(op.changes)
            .map(
              (key) =>
                ({
                  title: "제목",
                  visible: "표시 여부",
                  layout: "너비",
                  value: "값",
                  unit: "단위",
                  change: "증감",
                  chartType: "차트 종류",
                  labels: "라벨",
                  datasets: "데이터셋",
                  columns: "컬럼",
                  rows: "행 데이터",
                  max: "최대값",
                  message: "문구",
                  status: "상태",
                })[key] ?? key,
            )
            .join(", ")} 변경`,
        );
    } else if (op.action === "add") {
      const section = next.sections.find((s) => s.id === op.sectionId);
      if (!section) throw new Error("추가할 섹션을 찾을 수 없습니다.");
      if (["global", "visual"].includes(op.component.id))
        throw new Error("예약된 ID는 사용할 수 없습니다.");
      section.components.push(op.component);
      summary.push(`${op.component.title}: 컴포넌트 추가`);
    } else if (op.action === "remove") {
      const { section, index } = locate(op.targetId);
      summary.push(`${section.components[index].title}: 컴포넌트 삭제`);
      section.components.splice(index, 1);
    } else if (op.action === "move") {
      const { section, index } = locate(op.targetId);
      const destination = next.sections.find((s) => s.id === op.sectionId);
      if (!destination) throw new Error("이동할 섹션을 찾을 수 없습니다.");
      const [component] = section.components.splice(index, 1);
      if (op.index > destination.components.length)
        throw new Error("이동 위치가 범위를 벗어났습니다.");
      destination.components.splice(op.index, 0, component);
      summary.push(
        `${component.title}: ${destination.title}의 ${op.index + 1}번째로 이동`,
      );
    } else if (op.action === "themeChange") {
      next.theme = { ...next.theme, ...op.changes };
      summary.push("테마 색상·스타일 변경");
    } else if (op.action === "headerChange") {
      next.header = { ...next.header, ...op.changes };
      summary.push("대시보드 제목·설명 변경");
    } else if (op.action === "layoutChange") {
      next.layout = { ...next.layout, ...op.changes };
      summary.push("화면 간격·밀도 변경");
    } else if (op.action === "visualChange") {
      next.mainVisual = {
        ...next.mainVisual,
        ...op.changes,
        cta: op.changes.cta
          ? {
              enabled: false,
              label: "자세히 보기",
              url: "#dashboard-data",
              ...next.mainVisual.cta,
              ...op.changes.cta,
            }
          : next.mainVisual.cta,
      };
      if (
        next.mainVisual.cta?.enabled &&
        next.mainVisual.cta.url.startsWith("#") &&
        next.mainVisual.cta.url !== "#dashboard-data"
      )
        throw new Error("내부 CTA는 #dashboard-data만 지원합니다.");
      summary.push("메인 비주얼 설정 변경");
    } else if (op.action === "navigationChange") {
      next.navigation = { ...next.navigation, ...op.changes };
      summary.push("대시보드 메뉴 변경");
    } else if (op.action === "sectionChange") {
      const section = next.sections.find((s) => s.id === op.targetId);
      if (!section) throw new Error("수정할 섹션을 찾을 수 없습니다.");
      Object.assign(section, op.changes);
      summary.push(`${section.title}: 섹션 설정 변경`);
    }
  }
  next.sections = next.sections.filter((s) => s.components.length);
  if (JSON.stringify(next) === JSON.stringify(source))
    throw new Error(
      "실제 변경 내용이 없습니다. 구체적인 수정 요청을 입력해 주세요.",
    );
  const schema = dashboardSchema.parse({
    ...next,
    status: "editing",
    project: { ...source.project, updatedAt: now },
  });
  return { schema, summary: [...new Set(summary)] };
}
