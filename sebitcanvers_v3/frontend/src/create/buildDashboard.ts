import { createSample } from "../dashboard/samples";
import { dashboardSchema } from "../dashboard/schema";
import { readyOptionsSchema } from "./contracts";
import type { CreateOptions } from "./contracts";

export const accents = {
  blue: "#397ce8",
  green: "#198268",
  purple: "#8055da",
  neutral: "#64748b",
};
export const stylePresets = {
  modern: {
    background: "#f1f4f9",
    surface: "#ffffff",
    text: "#202e45",
    muted: "#5c6c83",
    border: "#dce3ed",
    radius: 14,
  },
  minimal: {
    background: "#fafafa",
    surface: "#ffffff",
    text: "#24282e",
    muted: "#626975",
    border: "#d9dde3",
    radius: 6,
  },
  corporate: {
    background: "#eaf0f6",
    surface: "#ffffff",
    text: "#152b48",
    muted: "#526781",
    border: "#bfcddd",
    radius: 4,
  },
  dark: {
    background: "#0e1521",
    surface: "#182333",
    text: "#eef1f8",
    muted: "#a8b5cb",
    border: "#2c394f",
    radius: 10,
  },
};
export function buildDashboard(
  input: CreateOptions,
  projectId: string,
  now: string,
) {
  const options = readyOptionsSchema.parse(input);
  const schema = createSample(options.type);
  schema.project = {
    ...schema.project,
    id: projectId,
    name: options.name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  schema.header.title = options.name.trim();
  schema.navigation.type = options.navigation;
  schema.theme = {
    ...stylePresets[options.style],
    primary: accents[options.color],
    preset: options.style,
  };
  schema.layout.gap = { compact: 12, standard: 20, spacious: 32 }[
    options.density
  ];
  schema.layout.density = options.density;
  schema.sections = schema.sections
    .map((section) => ({
      ...section,
      components: section.components.filter((component) =>
        options.components.includes(component.type),
      ),
    }))
    .filter((section) => section.components.length);
  schema.sections.forEach((section) =>
    section.components.forEach((component) => {
      if (component.type === "chart")
        component.datasets[0].color = accents[options.color];
    }),
  );
  if (options.components.includes("progress"))
    schema.sections.push({
      id: "section-progress",
      title: "프로젝트 진행률",
      visible: true,
      components: [
        {
          id: "progress-tasks",
          type: "progress",
          title: "프로젝트 완료율",
          visible: true,
          layout: { columnSpan: 12 },
          value: 68,
          max: 100,
        },
      ],
    });
  if (options.components.includes("notification"))
    schema.sections.push({
      id: "section-notifications",
      title: "알림",
      visible: true,
      components: [
        {
          id: "notification-review",
          type: "notification",
          title: "검토 요청",
          visible: true,
          layout: { columnSpan: 12 },
          message:
            "이번 주 운영 리포트가 준비되었습니다. 내용을 확인해 주세요.",
          status: "info",
        },
      ],
    });
  const visual = options.mainVisual;
  schema.mainVisual = {
    enabled: visual.enabled,
    type: visual.type,
    title: visual.title.trim() || "프로젝트 운영현황",
    description: visual.description,
    height: visual.height,
    alignment: visual.alignment,
    overlay: visual.overlay,
    imageAssetId: visual.imageAssetId,
    cta:
      visual.enabled && visual.cta.enabled
        ? { enabled: true, label: visual.cta.label.trim(), url: visual.cta.url }
        : { enabled: false, label: "자세히 보기", url: "#dashboard-data" },
  };
  schema.settings.selections = options;
  return dashboardSchema.parse(schema);
}
