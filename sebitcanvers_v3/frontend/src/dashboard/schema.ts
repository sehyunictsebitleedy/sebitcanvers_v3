import { z } from "zod";

const text = z.string().trim().min(1).max(120);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const number = z.number().finite().min(-1e12).max(1e12);
const base = {
  id,
  title: text,
  visible: z.boolean(),
  layout: z.strictObject({ columnSpan: z.number().int().min(1).max(12) }),
};
export const kpiSchema = z.strictObject({
  ...base,
  type: z.literal("kpi"),
  value: number,
  unit: z.string().max(12),
  change: number,
});
const chartSchema = z
  .strictObject({
    ...base,
    type: z.literal("chart"),
    chartType: z.enum(["line", "bar", "area", "donut"]),
    labels: z.array(text).min(1).max(24),
    datasets: z
      .array(
        z.strictObject({
          name: text,
          data: z.array(number).min(1).max(24),
          color,
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((chart, ctx) => {
    for (const [i, dataset] of chart.datasets.entries()) {
      if (dataset.data.length !== chart.labels.length)
        ctx.addIssue({
          code: "custom",
          path: ["datasets", i, "data"],
          message: "라벨과 데이터 개수가 일치해야 합니다.",
        });
      if (
        chart.chartType === "donut" &&
        (dataset.data.some((value) => value < 0) ||
          dataset.data.reduce((a, b) => a + b, 0) <= 0)
      )
        ctx.addIssue({
          code: "custom",
          path: ["datasets", i, "data"],
          message: "도넛 데이터는 0 이상이며 합계가 0보다 커야 합니다.",
        });
    }
    if (chart.chartType === "donut" && chart.datasets.length !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["datasets"],
        message: "도넛은 하나의 데이터셋을 사용합니다.",
      });
  });
const tableSchema = z
  .strictObject({
    ...base,
    type: z.literal("table"),
    columns: z
      .array(z.strictObject({ key: id, label: text }))
      .min(1)
      .max(10),
    rows: z
      .array(z.record(z.string(), z.union([z.string().max(500), number])))
      .max(100),
  })
  .superRefine((table, ctx) => {
    const keys = table.columns.map((column) => column.key);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: "custom",
        path: ["columns"],
        message: "컬럼 키가 중복되었습니다.",
      });
    table.rows.forEach((row, index) => {
      if (
        Object.keys(row).length !== keys.length ||
        keys.some((key) => !Object.hasOwn(row, key))
      )
        ctx.addIssue({
          code: "custom",
          path: ["rows", index],
          message: "행 데이터와 컬럼 구조가 일치해야 합니다.",
        });
    });
  });
export const componentSchema = z.discriminatedUnion("type", [
  kpiSchema,
  chartSchema,
  tableSchema,
]);
export const dashboardSchema = z
  .strictObject({
    schemaVersion: z.literal("0.1"),
    project: z.strictObject({
      id,
      name: text,
      type: z.enum(["analytics", "admin", "project", "monitoring"]),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
    }),
    status: z.enum(["generated", "editing", "finalized", "exported"]),
    theme: z.strictObject({
      primary: color,
      background: color,
      surface: color,
      text: color,
      muted: color,
      border: color,
      radius: z.number().int().min(0).max(24),
    }),
    layout: z.strictObject({
      desktopWidth: z.literal(1280),
      minWidth: z.literal(1280),
      gridColumns: z.literal(12),
      gap: z.number().int().min(8).max(40),
    }),
    navigation: z.strictObject({
      type: z.enum(["sidebar", "top"]),
      logoText: text,
      items: z
        .array(z.strictObject({ id, label: text, active: z.boolean() }))
        .min(1)
        .max(8),
    }),
    header: z.strictObject({ title: text, description: z.string().max(300) }),
    mainVisual: z.strictObject({
      enabled: z.boolean(),
      type: z.enum(["banner", "hero"]),
      title: text,
      description: z.string().max(500),
    }),
    sections: z
      .array(
        z.strictObject({
          id,
          title: text,
          visible: z.boolean(),
          components: z.array(componentSchema).min(1).max(20),
        }),
      )
      .min(1)
      .max(10),
    settings: z.strictObject({ dataMode: z.literal("sample") }),
  })
  .superRefine((schema, ctx) => {
    const ids = new Set<string>();
    const check = (value: string, path: (string | number)[]) => {
      if (ids.has(value))
        ctx.addIssue({
          code: "custom",
          path,
          message: "ID는 문서 전체에서 고유해야 합니다.",
        });
      ids.add(value);
    };
    check(schema.project.id, ["project", "id"]);
    schema.navigation.items.forEach((item, i) =>
      check(item.id, ["navigation", "items", i, "id"]),
    );
    schema.sections.forEach((section, i) => {
      check(section.id, ["sections", i, "id"]);
      section.components.forEach((component, j) =>
        check(component.id, ["sections", i, "components", j, "id"]),
      );
    });
    if (
      !schema.sections.some(
        (section) =>
          section.visible &&
          section.components.some((component) => component.visible),
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["sections"],
        message: "표시 가능한 데이터 컴포넌트가 필요합니다.",
      });
  });
export type DashboardSchema = z.infer<typeof dashboardSchema>;
export type DashboardComponent = z.infer<typeof componentSchema>;
export type KpiComponent = z.infer<typeof kpiSchema>;
export type ChartComponent = Extract<DashboardComponent, { type: "chart" }>;
export function validateDashboard(input: unknown) {
  return dashboardSchema.safeParse(input);
}
export function updateKpi(
  schema: DashboardSchema,
  componentId: string,
  input: { title: string; value: string; unit: string },
) {
  if (!input.value.trim()) throw new Error("KPI 값을 입력해 주세요.");
  let found = false;
  const sections = schema.sections.map((section) => ({
    ...section,
    components: section.components.map((component) => {
      if (component.id !== componentId || component.type !== "kpi")
        return component;
      found = true;
      return {
        ...component,
        title: input.title,
        value: Number(input.value),
        unit: input.unit,
      };
    }),
  }));
  if (!found) throw new Error("선택한 KPI를 찾을 수 없습니다.");
  return dashboardSchema.parse({
    ...schema,
    status: "editing",
    project: { ...schema.project, updatedAt: new Date().toISOString() },
    sections,
  });
}
