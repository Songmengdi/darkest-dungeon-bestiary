/* 展示辅助:把图鉴数据形状翻译成 UI 文本/配置。
 * 中文映射是 UI 层词典(非游戏原文);效果串的中文化在 effect.ts,不在此处。 */
import { t } from "./i18n";
import type { BrainDesire, IndexMonster, MonsterDetail, Tier } from "./types";

/* ---------- 档位(空档隐藏:原型已验证 baron 等无 info 档位不展示)---------- */
export function liveTiers(detail: MonsterDetail): Tier[] {
  return detail.tiers.filter((tr) => tr.stats || tr.skills.length > 0 || tr.loot.length > 0);
}

/* ---------- 技能 ---------- */
export function skillTypeZh(ty?: string): string {
  if (!ty) return "";
  const map: Record<string, [string, string]> = {
    melee: ["近战", "Melee"], ranged: ["远程", "Ranged"], heal: ["治疗", "Heal"],
    buff: ["增益", "Buff"], summon: ["召唤", "Summon"],
  };
  const hit = map[ty];
  return hit ? t(hit[0], hit[1]) : ty;
}

/* ---------- 抗性展示配置(五抗性圆点/图标的颜色与文案)---------- */
export const RES_ITEMS: Array<{ key: "stun" | "poison" | "bleed" | "debuff" | "move"; zh: string; en: string; color: string; icon: string }> = [
  { key: "stun", zh: "眩晕", en: "Stun", color: "#c8892e", icon: "stun" },
  { key: "poison", zh: "腐蚀", en: "Blight", color: "#86a03c", icon: "blight" },
  { key: "bleed", zh: "流血", en: "Bleed", color: "#b03030", icon: "bleed" },
  { key: "debuff", zh: "减益", en: "Debuff", color: "#9a5aa8", icon: "debuff" },
  { key: "move", zh: "位移", en: "Move", color: "#4f7fa8", icon: "move-knockback" },
];

export function fmt(v: number | string | undefined | null): string {
  return v === undefined || v === null ? "—" : String(v);
}

export function displayNameOf(entry: IndexMonster | undefined, tier0: Tier | undefined, id: string): { zh: string; en: string } {
  const dn = tier0?.displayName;
  return {
    zh: dn?.zh ?? entry?.name.zh ?? id,
    en: dn?.en ?? entry?.name.en ?? id,
  };
}

/* 特殊能力:从机制字段推导(真实数据无独立 ability 字段) */
export function abilityOf(tier0: Tier | undefined): string | null {
  if (!tier0) return null;
  const parts: string[] = [];
  if (tier0.deathClass) parts.push(t("死亡后化为尸体", "Leaves a corpse"));
  if (tier0.lifeLink) parts.push(t("生命链接 · 召唤联动", "Life link"));
  if (tier0.skills.some((s) => s.type === "summon")) parts.push(t("召唤援军", "Summons allies"));
  return parts.length ? parts.join(t(" · ", " · ")) : null;
}

/* ---------- 掉落(沿用正式版旧前端的中文映射)---------- */
export const RARITY_ZH: Record<string, string> = {
  very_common: "极常见", common: "常见", uncommon: "罕见", rare: "稀有",
  very_rare: "极稀有", ancestral: "祖传", ancestral_shambler: "徘徊者", crystal: "水晶",
};

export const LOOT_TYPE_ZH: Record<string, string> = {
  nothing: "空", table: "掉落表", item: "物品", trinket: "饰品", gem: "传家宝石",
  heirloom: "传家宝", pack: "补给品", journal: "日志页", emblem: "徽记",
};

export function lootEntryText(e: { type: string; data?: Record<string, unknown> }): string {
  const d = e.data ?? {};
  switch (e.type) {
    case "table": return `→ ${t("掉落表", "Table")} ${String(d.table ?? "")}`;
    case "item": return `${String(d.id ?? "")} ×${String(d.amount ?? 1)}`;
    case "trinket": return `${t("饰品", "Trinket")}(${RARITY_ZH[String(d.rarity)] ?? String(d.rarity ?? "?")})`;
    default: {
      const base = LOOT_TYPE_ZH[e.type];
      return base ? base : JSON.stringify(d);
    }
  }
}

/* ---------- AI 倾向 ---------- */
const DESIRE_ZH: Record<string, string> = {
  preferred_skill: "优先技能", random_skill: "随机技能",
  heal_skill: "治疗技能", specific_skill: "指定技能",
};

export function brainDesireLabel(d: BrainDesire, tier: Tier): string {
  if (d.skill) {
    const sk = tier.skills.find((x) => x.id === d.skill);
    return sk?.name.zh ?? d.skill;
  }
  return DESIRE_ZH[String(d.type)] ?? String(d.type);
}
