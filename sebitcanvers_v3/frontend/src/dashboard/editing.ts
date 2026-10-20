import { dashboardSchema } from "./schema";
import type { DashboardComponent, DashboardSchema } from "./schema";

function addComponent(schema: DashboardSchema, component: DashboardComponent) {
  const target = schema.sections.find((section) => section.visible && section.components.length < 20);
  if (!target) throw new Error("표시 중인 섹션에 여유 공간이 없습니다. 항목을 정리한 뒤 다시 추가해 주세요.");
  return editSnapshot(schema, {
    sections: schema.sections.map((section) => section.id === target.id
      ? { ...section, components: [...section.components, component] }
      : section),
  });
}

export function addSummary(schema: DashboardSchema, id: string) {
  return addComponent(schema, {
    id, type: "summary", title: "운영 요약", visible: true,
    layout: { columnSpan: 6 }, displayValue: "정상 운영",
    description: "주요 현황과 다음 할 일을 요약해 주세요.",
  });
}

export function addActivity(schema: DashboardSchema, id: string) {
  return addComponent(schema, {
    id, type: "activity", title: "최근 활동", visible: true,
    layout: { columnSpan: 6 },
    items: [{ title: "프로젝트 검토 완료", description: "주요 진행 현황을 확인했습니다.",
      timestamp: "오늘 09:00", icon: "check" }],
  });
}

export function addButton(schema: DashboardSchema, id: string) {
  return addComponent(schema, {
    id, type: "button", title: "바로가기", visible: true,
    layout: { columnSpan: 6 }, label: "대시보드 데이터 보기",
    variant: "primary", size: "medium", url: "#dashboard-data",
  });
}

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
