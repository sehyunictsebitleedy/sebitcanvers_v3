import { BarChart3, Folder, LayoutDashboard, Monitor, Settings2 } from "lucide-react";
import type { DashboardSchema } from "./schema";

type Navigation = DashboardSchema["navigation"];
type MenuItem = Navigation["items"][number];
const icons = { dashboard: LayoutDashboard, chart: BarChart3, folder: Folder, monitor: Monitor, settings: Settings2 };
const iconLabels = { none: "없음", dashboard: "대시보드", chart: "차트", folder: "폴더", monitor: "모니터", settings: "설정" };

export function NavigationIcon({ name }: { name: MenuItem["icon"] }) {
  if (!name || name === "none") return null;
  const Icon = icons[name];
  return <Icon className="db-menu-icon" size={16} aria-hidden="true" focusable="false" />;
}

export function NavigationEditor({ navigation, onChange }: {
  navigation: Navigation;
  onChange: (navigation: Navigation) => void;
}) {
  const update = (id: string, patch: Partial<MenuItem>) => onChange({
    ...navigation,
    items: navigation.items.map(item => item.id === id ? { ...item, ...patch } : item),
  });
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= navigation.items.length) return;
    const items = [...navigation.items];
    [items[index], items[destination]] = [items[destination], items[index]];
    onChange({ ...navigation, items });
  };
  const visibleCount = navigation.items.filter(item => item.visible !== false).length;
  return (
    <div className="navigation-editor">
      <p>최소 하나의 메뉴를 표시하세요. 변경 적용을 누르면 반영됩니다.</p>
      {navigation.items.map((item, index) => (
        <fieldset key={item.id}>
          <legend>메뉴 {index + 1}</legend>
          <label>메뉴명
            <input aria-label={`메뉴 ${index + 1} 이름`} value={item.label} maxLength={120}
              onChange={(event) => update(item.id, { label: event.target.value })} />
          </label>
          <label>표시
            <input type="checkbox" aria-label={`메뉴 ${index + 1} 표시`} checked={item.visible !== false}
              disabled={item.visible !== false && visibleCount === 1}
              onChange={(event) => update(item.id, { visible: event.target.checked })} />
          </label>
          <label>아이콘
            <select aria-label={`메뉴 ${index + 1} 아이콘`} value={item.icon ?? "none"}
              onChange={(event) => update(item.id, { icon: event.target.value as MenuItem["icon"] })}>
              {Object.entries(iconLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="navigation-order-actions">
            <button type="button" aria-label={`메뉴 ${index + 1} 위로`} disabled={index === 0}
              onClick={() => move(index, -1)}>위로</button>
            <button type="button" aria-label={`메뉴 ${index + 1} 아래로`} disabled={index === navigation.items.length - 1}
              onClick={() => move(index, 1)}>아래로</button>
          </div>
        </fieldset>
      ))}
    </div>
  );
}
