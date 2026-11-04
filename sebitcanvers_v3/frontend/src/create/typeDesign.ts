import type { DashboardSchema, DashboardComponent } from "../dashboard/schema";

export const typeDesignBrief = {
  0: "Analytics: lead with visitor KPIs, an expansive traffic trend and channel comparison. Use an area trend and bar channel chart, followed by acquisition details.",
  1: "Administration: lead with the user/role/status table, then compact operational KPIs and an access activity chart. This is a management workspace, not a sales report.",
  3: "Projects: lead with three equal-width task lists: Planned, In Progress, Done. Represent these as three table components with task and team columns, not an unsupported kanban type. Follow with project KPIs and completion trend.",
  4: "Monitoring: lead with a wide response-time line chart, followed by service health KPIs and an API/database/storage status table. Use operational latency and availability data, not sales data.",
} as const;

export function applyTypeDesign(schema: DashboardSchema, type: keyof typeof typeDesignBrief) {
  const kpis = schema.sections[0];
  const charts = schema.sections[1];
  const tables = schema.sections[2];
  const trend = charts.components[0];
  const distribution = charts.components[1];
  const table = tables.components[0];
  const icons = { 0: ["users", "users", "target", "activity"], 1: ["users", "activity", "target", "users"], 3: ["chart", "target", "activity", "users"], 4: ["chart", "activity", "activity", "target"] } as const;
  kpis.components.forEach((c, i) => { if (c.type === "kpi") c.icon = icons[type][i % 4]; });
  schema.navigation.items.forEach((item, i) => { item.icon = (["dashboard", "chart", "folder"] as const)[i % 3]; });
  if (trend.type !== "chart" || distribution.type !== "chart" || table.type !== "table") throw new Error("Invalid base design");
  const renameKpis = (titles: string[], values: number[], units: string[]) => kpis.components.forEach((c, i) => {
    if (c.type === "kpi") { c.title = titles[i]; c.value = values[i]; c.unit = units[i]; }
  });
  if (type === 0) {
    renameKpis(["이번 달 방문", "신규 방문", "전환율", "평균 체류"], [24860, 6840, 4.8, 186], ["명", "명", "%", "초"]);
    trend.title = "방문 추이"; trend.datasets[0].name = "방문";
    distribution.chartType = "bar"; distribution.title = "유입 경로";
    table.title = "채널별 성과";
    table.columns = [{ key: "channel", label: "채널" }, { key: "visits", label: "방문" }, { key: "conversion", label: "전환율" }];
    table.rows = [{ channel: "검색", visits: 15413, conversion: "5.2%" }, { channel: "직접", visits: 5966, conversion: "4.6%" }, { channel: "소셜", visits: 3481, conversion: "3.4%" }];
  } else if (type === 1) {
    table.title = "팀 멤버 및 접근 권한";
    table.columns = [{ key: "team", label: "팀" }, { key: "role", label: "권한" }, { key: "members", label: "사용자 수" }, { key: "status", label: "상태" }];
    table.rows = ["운영팀", "디자인팀", "개발팀", "지원팀"].map((team, i) => ({ team, role: i === 0 ? "관리자" : "멤버", members: [6, 12, 20, 10][i], status: "활성" }));
    renameKpis(["전체 사용자", "활성 사용자", "승인 대기", "관리자"], [52, 48, 4, 6], ["명", "명", "건", "명"]);
    trend.title = "일별 접근 활동"; trend.chartType = "bar"; trend.layout.columnSpan = 12; trend.datasets[0].name = "접근";
    charts.components = [trend]; schema.sections = [tables, kpis, charts];
  } else if (type === 3) {
    tables.title = "스프린트 업무 보드";
    tables.components = ["예정", "진행 중", "완료"].map((title, i): DashboardComponent => ({
      ...structuredClone(table), id: `tasks-${i}`, title, layout: { columnSpan: 4 },
      columns: [{ key: "task", label: "업무" }, { key: "team", label: "담당 팀" }],
      rows: (i === 0 ? ["요구사항 정리", "콘텐츠 수집"] : i === 1 ? ["화면 설계", "컴포넌트 개발"] : ["일정 수립"]).map(task => ({ task, team: i === 1 ? "제작팀" : "기획팀" })),
    }));
    trend.title = "누적 완료 작업"; trend.datasets[0].name = "완료 작업"; trend.layout.columnSpan = 12;
    charts.components = [trend]; schema.sections = [tables, kpis, charts];
  } else {
    trend.title = "서비스 응답 시간"; trend.chartType = "line"; trend.layout.columnSpan = 12;
    trend.labels = ["10:00", "10:10", "10:20", "10:30", "10:40", "10:50", "11:00"];
    trend.datasets[0].name = "응답 시간(ms)"; trend.datasets[0].data = [118, 124, 112, 143, 121, 117, 124];
    charts.components = [trend];
    table.title = "서비스 상태";
    table.columns = [{ key: "service", label: "서비스" }, { key: "status", label: "상태" }, { key: "availability", label: "가용률" }, { key: "latency", label: "응답 시간" }];
    table.rows = [{ service: "API", status: "정상", availability: "99.9%", latency: "124ms" }, { service: "Database", status: "정상", availability: "99.8%", latency: "18ms" }, { service: "Storage", status: "정상", availability: "100%", latency: "42ms" }];
    schema.sections = [charts, kpis, tables];
  }
  for (const section of schema.sections) section.title = section === kpis ? "핵심 지표" : section === charts ? "추이 분석" : type === 3 ? "스프린트 업무 보드" : table.title;
  return schema;
}
