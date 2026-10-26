import { z } from "zod";
import { createOptionsSchema, safeUrl } from "../create/contracts";

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
    showLegend: z.boolean().optional(),
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
export const activityItemsSchema = z.array(z.strictObject({
  title: text,
  description: z.string().trim().max(500),
  timestamp: z.string().trim().min(1).max(80),
  icon: z.enum(["info", "check", "clock", "alert"]),
})).max(20);
export const buttonSchema = z.strictObject({
  ...base,
  type: z.literal("button"),
  label: text,
  variant: z.enum(["primary", "secondary", "ghost", "danger"]),
  size: z.enum(["small", "medium", "large"]),
  url: safeUrl.refine(
    (value) => !value.startsWith("#") || value === "#dashboard-data",
    "내부 주소는 #dashboard-data를 사용해 주세요.",
  ),
});
export const componentSchema = z.discriminatedUnion("type", [
  kpiSchema,
  chartSchema,
  tableSchema,
  z
    .strictObject({
      ...base,
      type: z.literal("progress"),
      value: z.number().finite().min(0),
      max: z.number().finite().positive(),
    })
    .refine(
      (value) => value.value <= value.max,
      "진행 값은 최대값을 초과할 수 없습니다.",
    ),
  z.strictObject({
    ...base,
    type: z.literal("notification"),
    message: z.string().min(1).max(500),
    status: z.enum(["info", "success", "warning", "error"]),
  }),
  z.strictObject({
    ...base,
    type: z.literal("summary"),
    description: z.string().trim().min(1).max(500),
    displayValue: z.string().trim().min(1).max(80),
  }),
  z.strictObject({
    ...base,
    type: z.literal("activity"),
    items: activityItemsSchema,
  }),
  buttonSchema,
  z.strictObject({
    ...base,
    type: z.literal("statusBadge"),
    label: text,
    status: z.enum(["info", "success", "warning", "error"]),
  }),
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
      preset: z.enum(["modern", "minimal", "corporate", "dark"]).optional(),
    }),
    layout: z.strictObject({
      desktopWidth: z.literal(1280),
      minWidth: z.literal(1280),
      gridColumns: z.literal(12),
      gap: z.number().int().min(8).max(40),
      density: z.enum(["compact", "standard", "spacious"]).optional(),
    }),
    navigation: z.strictObject({
      type: z.enum(["sidebar", "top"]),
      logoText: text,
      items: z
        .array(z.strictObject({
          id, label: text, active: z.boolean(),
          visible: z.boolean().optional(),
          icon: z.enum(["none", "dashboard", "chart", "folder", "monitor", "settings"]).optional(),
        }))
        .min(1)
        .max(8),
    }),
    header: z.strictObject({
      title: text,
      description: z.string().max(300),
      date: z.strictObject({ visible: z.boolean(), value: z.iso.date() }).optional(),
    }),
    mainVisual: z.strictObject({
      enabled: z.boolean(),
      type: z.enum(["banner", "hero", "image-text"]),
      title: text,
      description: z.string().max(500),
      height: z.enum(["small", "medium", "large"]).optional(),
      alignment: z.enum(["left", "center", "right"]).optional(),
      overlay: z.number().min(0).max(80).optional(),
      imageAssetId: id.nullable().optional(),
      cta: z
        .strictObject({ enabled: z.boolean(), label: text, url: safeUrl })
        .optional(),
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
    settings: z.strictObject({
      dataMode: z.literal("sample"),
      selections: createOptionsSchema.optional(),
    }),
  })
  .superRefine((schema, ctx) => {
    if (!schema.navigation.items.some((item) => item.visible !== false))
      ctx.addIssue({ code: "custom", path: ["navigation", "items"],
        message: "최소 하나의 메뉴를 표시해 주세요." });
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
          section.components.some((component) => component.visible && component.type !== "button"),
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
