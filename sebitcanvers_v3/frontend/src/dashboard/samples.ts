import rawSample from "./sample.json";
import { dashboardSchema } from "./schema";
import type { DashboardSchema } from "./schema";

export const sampleDashboard = dashboardSchema.parse(rawSample);
const variants = [
  {
    id: 0,
    name: "분석",
    type: "analytics",
    color: "#9373fa",
    titles: ["총 매출", "신규 고객", "전환율", "진행 프로젝트"],
    values: [128430, 892, 74.2, 24],
    units: ["", "", "%", ""],
  },
  {
    id: 1,
    name: "관리자",
    type: "admin",
    color: "#6096fb",
    titles: ["전체 사용자", "활성 사용자", "가동률", "처리 요청"],
    values: [8492, 1286, 99.8, 132],
    units: ["", "", "%", ""],
  },
  {
    id: 3,
    name: "프로젝트",
    type: "project",
    color: "#e9a15f",
    titles: ["전체 프로젝트", "완료 작업", "진행률", "팀원"],
    values: [24, 186, 68.4, 32],
    units: ["", "", "%", ""],
  },
  {
    id: 4,
    name: "모니터링",
    type: "monitoring",
    color: "#e4778d",
    titles: ["전체 서버", "응답 시간", "CPU 사용률", "알림"],
    values: [48, 124, 42.8, 3],
    units: ["", "ms", "%", ""],
  },
] as const;
export function createSample(type = 0): DashboardSchema {
  const variant = variants.find(variant => variant.id === type);
  if (!variant) throw new Error("지원하지 않는 대시보드 유형입니다.");
  const schema = structuredClone(sampleDashboard);
  schema.project.id = `sample-${variant.type}`;
  schema.project.type = variant.type;
  schema.project.name = `${variant.name} 대시보드`;
  schema.header.title = type === 0 ? "매출 현황 대시보드" : schema.project.name;
  schema.theme.primary = variant.color;
  schema.sections[0].components.forEach((component, i) => {
    if (component.type !== "kpi") return;
    component.title = variant.titles[i];
    component.value = variant.values[i];
    component.unit = variant.units[i];
  });
  schema.sections[1].components.forEach((component) => {
    if (component.type === "chart") component.datasets[0].color = variant.color;
  });
  return dashboardSchema.parse(schema);
}
