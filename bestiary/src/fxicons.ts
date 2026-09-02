/* 状态图标:归档.zip 提供的 wiki 状态图标(public/img/fx/*.png)。
 * 职责:① 图标元数据(中英名 + 悬停说明);② 把技能 effects 的原始效果串
 * (如 "ShamblerBleed 1"、"SummonTentacle A")映射到 0..n 个图标 id。
 * 匹配是对原始英文串的关键词启发式,与 data.ts 的 FX_ZH 互不影响(后者只管显示文本)。 */
import { LANG } from "./data";

export interface FxIconMeta {
  en: string;
  zh: string; // 悬停说明(中文)
}

export const FX_ICONS: Record<string, FxIconMeta> = {
  "bleed": { en: "Bleed", zh: "流血:每回合损失生命的持续伤害(抗性判定)" },
  "blight": { en: "Blight", zh: "腐蚀:每回合损失的持续伤害(抗性判定)" },
  "stun": { en: "Stun", zh: "眩晕(跳过回合,抗性判定)" },
  "debuff": { en: "Debuff", zh: "减益效果(降低属性)" },
  "buff": { en: "Buff", zh: "增益效果(提升属性)" },
  "mark": { en: "Mark", zh: "标记:被标记目标受到标记加成伤害" },
  "extra-damage-vs-marked": { en: "Extra Damage vs Marked", zh: "对被标记目标的额外伤害" },
  "stress": { en: "Stress", zh: "压力伤害(增加英雄压力值)" },
  "stress-heal": { en: "Stress Heal", zh: "压力治疗(减少英雄压力值)" },
  "horror": { en: "Horror", zh: "恐惧:持续压力伤害状态" },
  "heal": { en: "Heal", zh: "治疗(恢复 HP)" },
  "disease": { en: "Disease", zh: "疾病(战斗后可能遗留的负面状态)" },
  "crimson-curse": { en: "Crimson Curse", zh: "猩红诅咒(庭院专属疾病状态)" },
  "guard": { en: "Guard", zh: "护卫:代替队友承受伤害 / 自我保护" },
  "riposte": { en: "Riposte", zh: "反击姿态(受攻击时自动反击)" },
  "stealth": { en: "Stealth", zh: "潜行(无法被直接选中)" },
  "move-knockback": { en: "Move / Knockback", zh: "位移与击退(拉拽 / 击退 / 打乱站位,抗性判定)" },
  "summons-enemy": { en: "Summons Enemy", zh: "召唤敌人(召唤援军 / 衍生物)" },
  "instant-deathblow": { en: "Instant Deathblow", zh: "即死 / 处决攻击" },
  "special-note": { en: "Special Mechanic", zh: "特殊机制(变身 / 模式切换 / 自毁 / 控制)" },
};

/* 图标走 Vite 资源导入(src/assets/fx/*.png):
 * 不能放 public/img/ —— scripts/build.ts 重建数据时会整体清空 public/img/。
 * glob 的 key 是 "./assets/fx/bleed.png" 这类路径,转成 id -> url 查找表。 */
const ICON_URLS: Record<string, string> = {};
for (const [p, url] of Object.entries(import.meta.glob("./assets/fx/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>)) {
  ICON_URLS[p.split("/").pop()!.replace(/\.png$/, "")] = url;
}

export function fxIconSrc(id: string): string {
  return ICON_URLS[id] ?? "";
}

export function fxIconTitle(id: string): string {
  const m = FX_ICONS[id];
  if (!m) return id;
  return LANG.value === "zh" ? m.zh : m.en;
}

/* 规则表:按序扫描小写效果串,命中即收集图标;block 阻止后续更泛的规则重复命中。
 * 例:"Miller HealStress" 先被 stress-heal 命中并 block 掉 heal/stress;
 *     "Damage Marked Target" 被 extra-damage-vs-marked 命中并 block 掉 mark。 */
interface FxRule {
  re: RegExp;
  id: string;
  block?: string[];
}

const FX_RULES: FxRule[] = [
  { re: /stress[ -]?heal|healstress|heal stress/, id: "stress-heal", block: ["heal", "stress"] },
  { re: /crimson curse/, id: "crimson-curse", block: ["debuff"] },
  { re: /(dmg|damage)\w*[ .]*mark|mark\w*[ .]*(dmg|damage)/, id: "extra-damage-vs-marked", block: ["mark"] },
  { re: /heal|regen/, id: "heal" },
  { re: /disease|rabies/, id: "disease" },
  { re: /bleed/, id: "bleed" },
  { re: /blight|\bblt\b|poison/, id: "blight" },
  { re: /stun/, id: "stun" },
  { re: /horror/, id: "horror" },
  { re: /stress/, id: "stress" },
  { re: /\bmark|tagged/, id: "mark" },
  { re: /pull|push|knockback|shuffle|swap|\bthrow/, id: "move-knockback" },
  { re: /guard|protect|defend/, id: "guard" },
  { re: /riposte/, id: "riposte" },
  { re: /stealth|\bhide\b/, id: "stealth" },
  { re: /summon|spawn|grow_seedling/, id: "summons-enemy" },
  { re: /(?<!de)buff|bolster|\bspeed\b|dodge|\bprep\b/, id: "buff" },
  { re: /debuff|weaken|\bcurse\b|\bslow\b|debil|vulnerab|shock|gouge|distract/, id: "debuff" },
  { re: /kill_target|kill vamp|deathblow/, id: "instant-deathblow" },
  { re: /kill_self|kill_performer|xform|switch_mode|change_to|control|capture|\bfuse\b|exit|to seed|to countess|consume self/, id: "special-note" },
];

const MAX_ICONS_PER_EFFECT = 3;

/** 原始效果串 → 图标 id 列表(可能为空;最多 3 个)。 */
export function fxIconsFor(effect: string): string[] {
  const hay = String(effect).toLowerCase();
  const out: string[] = [];
  const blocked = new Set<string>();
  for (const rule of FX_RULES) {
    if (blocked.has(rule.id) || out.length >= MAX_ICONS_PER_EFFECT) continue;
    if (rule.re.test(hay)) {
      out.push(rule.id);
      for (const b of rule.block ?? []) blocked.add(b);
    }
  }
  return out;
}
