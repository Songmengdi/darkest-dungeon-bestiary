/* 卡片墙过滤:副本页签、搜索词、区域徽章。纯函数,不依赖 Vue 运行时,可独立测试。
 * 「已验证的原型决策」(现状分组、空档归 other)收敛在这里。 */
import { t } from "./i18n";
import { hasMatch } from "./pinyin";
import type { IndexFile, IndexMonster } from "./types";

export interface RegionTab {
  id: string; // 'all' | region id | 'none'
  label: string;
  en: string;
}

export function regionTabs(index: IndexFile): RegionTab[] {
  const tabs: RegionTab[] = [{ id: "all", label: t("全部", "All"), en: "All" }];
  for (const r of index.regions) {
    if (r.id === "none") continue; // 无归属的走下方统一的「其他 / 未收录」
    tabs.push({ id: r.id, label: r.zh, en: r.en });
  }
  tabs.push({ id: "none", label: t("其他 / 未收录", "Other"), en: "Other" });
  return tabs;
}

export function regionZh(index: IndexFile, id: string): string {
  return index.regions.find((r) => r.id === id)?.zh ?? id;
}

export function monsterMatchesTab(m: IndexMonster, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "none") return !m.regions || m.regions.length === 0;
  return (m.regions ?? []).includes(tab);
}

export function monsterMatchesQuery(m: IndexMonster, q: string): boolean {
  if (!q.trim()) return true;
  const hay = `${m.id} ${m.name.zh} ${m.name.en} ${m.type ? m.type.zh + " " + m.type.en : ""}`;
  return hasMatch(hay, q);
}

export function regionBadges(index: IndexFile, m: IndexMonster): string[] {
  return (m.regions ?? []).map((r) => regionZh(index, r));
}
