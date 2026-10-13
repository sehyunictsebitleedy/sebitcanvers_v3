import { dashboardSchema } from "./schema";
import type { DashboardComponent, DashboardSchema } from "./schema";

export function editSnapshot(
  schema: DashboardSchema,
  patch: Partial<DashboardSchema>,
) {
  return dashboardSchema.parse({
    ...schema,
    ...patch,
    status: "editing",
    project: {
      ...(patch.project ?? schema.project),
      updatedAt: new Date().toISOString(),
    },
  });
}
export function replaceComponent(
  schema: DashboardSchema,
  input: DashboardComponent,
) {
  if (!schema.sections.some((s) => s.components.some((c) => c.id === input.id)))
    throw new Error("선택한 항목을 찾을 수 없습니다.");
  return editSnapshot(schema, {
    sections: schema.sections.map((s) => ({
      ...s,
      components: s.components.map((c) => (c.id === input.id ? input : c)),
    })),
  });
}
export function arrangeComponent(
  schema: DashboardSchema,
  id: string,
  action: "up" | "down" | "delete",
) {
  const sections = structuredClone(schema.sections);
  const section = sections.find((s) => s.components.some((c) => c.id === id));
  if (!section) throw new Error("항목을 찾을 수 없습니다.");
  const index = section.components.findIndex((c) => c.id === id);
  if (action === "delete") section.components.splice(index, 1);
  else {
    const next = index + (action === "up" ? -1 : 1);
    if (next < 0 || next >= section.components.length)
      throw new Error("같은 섹션 안에서 이동할 수 있습니다.");
    [section.components[index], section.components[next]] = [
      section.components[next],
      section.components[index],
    ];
  }
  return editSnapshot(schema, {
    sections: sections.filter((s) => s.components.length),
  });
}
