/* 状态图标资产:归档.zip 提供的 wiki 状态图标(src/assets/fx/*.png)。
 * 职责:① 图标元数据(中英名 + 悬停说明);② 图标 id → URL 查找。
 * 「原始效果串 → 图标/文本」的解释逻辑在 effect.ts(单一入口 interpretEffect)。 */
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
