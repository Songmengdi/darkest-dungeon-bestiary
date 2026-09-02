/* 数据加载与展示辅助:抓取 public/data 下的 JSON;语言态;效果启发式中文化;
 * 分类(副本)页签;空档隐藏等「已验证的原型决策」都收敛在这里。 */
import { ref } from "vue";
import type { BrainDesire, IndexFile, IndexMonster, MonsterDetail, Tier } from "./types";

/* ---------- 语言(默认中文,只展示一种语言,可切换) ---------- */
export type Lang = "zh" | "en";
export const LANG = ref<Lang>("zh");
export function setLang(l: Lang): void {
  LANG.value = l;
}
export function t(zh: string, en?: string): string {
  return LANG.value === "zh" ? zh : (en ?? zh);
}

/* ---------- 抓取(带缓存) ---------- */
export async function loadIndex(): Promise<IndexFile> {
  const r = await fetch("data/index.json");
  if (!r.ok) throw new Error(`index.json ${r.status}`);
  return (await r.json()) as IndexFile;
}

const detailCache = new Map<string, MonsterDetail>();
export async function loadMonster(id: string): Promise<MonsterDetail> {
  const hit = detailCache.get(id);
  if (hit) return hit;
  const r = await fetch(`data/monsters/${encodeURIComponent(id)}.json`);
  if (!r.ok) throw new Error(`${id} ${r.status}`);
  const j = (await r.json()) as MonsterDetail;
  detailCache.set(id, j);
  return j;
}

/* ---------- 副本页签(现状分组:数据层归类问题下一步再解) ---------- */
export interface RegionTab {
  id: string; // 'all' | region id | 'none'
  label: string;
  en: string;
}

export function regionTabs(index: IndexFile): RegionTab[] {
  const tabs: RegionTab[] = [{ id: "all", label: t("全部", "All"), en: "All" }];
  for (const r of index.regions) tabs.push({ id: r.id, label: r.zh, en: r.en });
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
  if (!q) return true;
  const hay = `${m.id} ${m.name.zh} ${m.name.en} ${m.type ? m.type.zh + " " + m.type.en : ""}`.toLowerCase();
  return hay.includes(q);
}

export function regionBadges(index: IndexFile, m: IndexMonster): string[] {
  return (m.regions ?? []).map((r) => regionZh(index, r));
}

/* ---------- 空档隐藏(原型已验证:baron 等游戏文件无 info 的档位不展示) ---------- */
export function liveTiers(detail: MonsterDetail): Tier[] {
  return detail.tiers.filter((tr) => tr.stats || tr.skills.length > 0 || tr.loot.length > 0);
}

/* ---------- 技能效果启发式中文化(UI 层词典,非游戏原文;数据层本地化后续再做) ---------- */
const FX_ZH: Array<[string, string]> = [
  ["vs Marked", "对标记目标"], ["On Miss", "未命中时"], ["On Hit", "命中时"], ["On Kill", "击杀时"],
  ["Crimson Curse", "猩红诅咒"], ["Disease", "疾病"], ["Rabies", "狂犬病"],
  ["DMG", "伤害"], ["Damage", "伤害"], ["Minor", "轻度"], ["Medium", "中度"], ["Major", "重度"], ["Heavy", "沉重"],
  ["Bleed", "流血"], ["Blight", "腐蚀"], ["Stun", "眩晕"], ["Debuff", "减益"], ["Move", "位移"],
  ["Pull", "拉拽"], ["Knockback", "击退"], ["Throw", "投掷"], ["Marked", "被标记"], ["Mark", "标记"], ["Target", "目标"],
  ["Stress", "压力"], ["Horror", "恐怖"], ["HealStress", "压力治疗"], ["Heal", "治疗"], ["Regen", "回复"], ["Self", "自身:"], ["Riposte", "反击"],
  ["Guard", "守护"], ["Stealth", "隐匿"], ["Summon", "召唤"], ["Charm", "魅惑"], ["Swap", "换位"], ["Shuffle", "打乱"],
  ["Buff", "增益"], ["Allies", "全体队友"], ["Party", "全体"], ["All", "全体"], ["Dodge", "闪避"], ["ACC", "命中"],
  ["Curse", "诅咒"], ["Weakening", "削弱"], ["Slow", "减速"], ["Hide", "潜藏"], ["Kill", "击杀"], ["Exit", "退场"],
];

export function fxZh(s: string): string {
  if (LANG.value !== "zh") return s;
  let out = String(s);
  for (const [a, b] of FX_ZH) out = out.split(a).join(b);
  return out;
}

export function skillTypeZh(ty?: string): string {
  if (!ty) return "";
  const map: Record<string, [string, string]> = {
    melee: ["近战", "Melee"], ranged: ["远程", "Ranged"], heal: ["治疗", "Heal"],
    buff: ["增益", "Buff"], summon: ["召唤", "Summon"],
  };
  const hit = map[ty];
  return hit ? t(hit[0], hit[1]) : ty;
}

/* ---------- 展示辅助 ---------- */
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

/* ---------- 掉落(沿用正式版旧前端的中文映射) ---------- */
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

/* ---------- 灯箱(看原画大图) ---------- */
export const lightbox = ref<{ src: string; title: string } | null>(null);
export function openLightbox(src: string, title: string): void {
  lightbox.value = { src, title };
}
export function closeLightbox(): void {
  lightbox.value = null;
}
