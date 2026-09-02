/* 效果串解释器 —— 前端唯一的「原始效果串语义」module。
 * 职责:把游戏 .info.darkest 技能 effects 的原始英文串(如 "ShamblerBleed 1"、
 * "Miller HealStress 3")解释为 UI 视图:状态图标 id 列表 + 中文展示文本。
 *
 * 设计:一张概念表(CONCEPTS)同时编码两种语义,消灭历史上两套平行启发式
 * (fxicons.ts 的 FX_RULES 与 data.ts 的 FX_ZH)必须人肉保持一致而无人强制的排序坑:
 *  - 文本替换:区分大小写字面量、依表序全量替换(沿用原 FX_ZH 行为);
 *  - 图标收集:对小写串做正则命中,依表序收集(沿用原 FX_RULES 行为),
 *    block 表达「更精确概念命中后,更泛概念让位」(如 stress-heal 吸收 heal/stress)。
 * 表序约束(改动前先跑 tests/effect.spec.ts 的 parity 测试):
 *  1. 被包含的长词必须排在短词之前(vs Marked→Marked→Mark;Crimson Curse→Curse;
 *     Allies→All;HealStress→Heal/Stress);
 *  2. 带 block 的概念必须排在被 block 概念之前(stress-heal、crimson-curse、
 *     extra-damage-vs-marked)。
 * 诚实原则:首领专属机制串(Ancestor Disrupt、Crow Caw 等)不强行配图标——
 * 无图标是 interface 的显式输出,宁可无图标不可错图标。 */
import { LANG, type Lang } from "./i18n";

export interface EffectView {
  /** 命中的状态图标 id(0..3 个,对应 fxicons.FX_ICONS) */
  icons: string[];
  /** 展示文本:zh 为中文化结果,en 为原始串 */
  text: string;
}

interface EffectConcept {
  /** 图标 id(对应 fxicons.FX_ICONS;纯文本概念省略) */
  id?: string;
  /** 图标命中:对小写化原始串测试 */
  iconRe?: RegExp;
  /** 命中后让位的更泛概念 id */
  block?: string[];
  /** 文本替换:依序执行 split/join 全量替换(区分大小写) */
  text?: Array<[find: string, rep: string]>;
}

const CONCEPTS: EffectConcept[] = [
  // -- 修辞/条件前缀(纯文本;含被包含词的长词一律在前)--
  { text: [["vs Marked", "对标记目标"]], },
  { text: [["On Miss", "未命中时"]], },
  { text: [["On Hit", "命中时"]], },
  { text: [["On Kill", "击杀时"]], },
  // -- 猩红诅咒:必须先于 Curse 文本、先于 debuff 图标 --
  { id: "crimson-curse", iconRe: /crimson curse/, block: ["debuff"], text: [["Crimson Curse", "猩红诅咒"]] },
  // -- 压力治疗:必须先于 Heal/Stress 文本(包含链),且先于 heal/stress 图标(block)--
  //    (修正常年排序 bug:旧 FX_ZH 中 Stress 排在 HealStress 前,"Miller HealStress"
  //     实际渲染成「治疗压力」而非「压力治疗」)
  { id: "stress-heal", iconRe: /stress[ -]?heal|healstress|heal stress/, block: ["heal", "stress"], text: [["HealStress", "压力治疗"]] },
  { id: "heal", iconRe: /heal|regen/, text: [["Heal", "治疗"], ["Regen", "回复"]] },
  // -- 疾病(含狂犬病)--
  { id: "disease", iconRe: /disease|rabies/, text: [["Disease", "疾病"], ["Rabies", "狂犬病"]] },
  // -- 三大持续伤害 --
  { id: "bleed", iconRe: /bleed/, text: [["Bleed", "流血"]] },
  { id: "blight", iconRe: /blight|\bblt\b|poison/, text: [["Blight", "腐蚀"]] },
  { id: "stun", iconRe: /stun/, text: [["Stun", "眩晕"]] },
  // -- 伤害量词 --
  { text: [["DMG", "伤害"], ["Damage", "伤害"]] },
  { text: [["Minor", "轻度"], ["Medium", "中度"], ["Major", "重度"], ["Heavy", "沉重"]] },
  { id: "horror", iconRe: /horror/, text: [["Horror", "恐怖"]] },
  { id: "stress", iconRe: /stress/, text: [["Stress", "压力"]] },
  // -- 标记:extra-damage-vs-marked 与 Marked 必须先于 Mark --
  { id: "extra-damage-vs-marked", iconRe: /(dmg|damage)\w*[ .]*mark|mark\w*[ .]*(dmg|damage)/, block: ["mark"] },
  { text: [["Marked", "被标记"]] },
  { id: "mark", iconRe: /\bmark|tagged/, text: [["Mark", "标记"]] },
  // -- 位移/击退(图标一个概念,文本六个变体)--
  {
    id: "move-knockback",
    iconRe: /pull|push|knockback|shuffle|swap|\bthrow/,
    text: [["Move", "位移"], ["Pull", "拉拽"], ["Knockback", "击退"], ["Throw", "投掷"], ["Swap", "换位"], ["Shuffle", "打乱"]],
  },
  { text: [["Target", "目标"]] },
  // -- 自身/反击/守护/潜行 --
  { text: [["Self", "自身:"]] },
  { id: "riposte", iconRe: /riposte/, text: [["Riposte", "反击"]] },
  { id: "guard", iconRe: /guard|protect|defend/, text: [["Guard", "守护"]] },
  { id: "stealth", iconRe: /stealth|\bhide\b/, text: [["Stealth", "隐匿"], ["Hide", "潜藏"]] },
  // -- 召唤 --
  { id: "summons-enemy", iconRe: /summon|spawn|grow_seedling/, text: [["Summon", "召唤"]] },
  { text: [["Charm", "魅惑"]] },
  // -- 增益 / 减益(debuff 图标正则涵盖 weaken/curse/slow 等,其文本条目在后面独立替换)--
  { id: "buff", iconRe: /(?<!de)buff|bolster|\bspeed\b|dodge|\bprep\b/, text: [["Buff", "增益"], ["Dodge", "闪避"]] },
  { id: "debuff", iconRe: /debuff|weaken|\bcurse\b|\bslow\b|debil|vulnerab|shock|gouge|distract/, text: [["Debuff", "减益"]] },
  // -- 范围词(Allies 含 All,必须在前)--
  { text: [["Allies", "全体队友"], ["Party", "全体"], ["All", "全体"]] },
  // -- 杂项 --
  { text: [["ACC", "命中"]] },
  { text: [["Curse", "诅咒"]] },
  { text: [["Weakening", "削弱"]] },
  { text: [["Slow", "减速"]] },
  // -- 即死/处决(Kill 文本并入:任何含 "Kill" 的串都替换,图标只认狭窄的处决语义)--
  { id: "instant-deathblow", iconRe: /kill_target|kill vamp|deathblow/, text: [["Kill", "击杀"]] },
  // -- 特殊机制(变身/模式切换/自毁/控制;Exit 文本并入本概念)--
  {
    id: "special-note",
    iconRe: /kill_self|kill_performer|xform|switch_mode|change_to|control|capture|\bfuse\b|exit|to seed|to countess|consume self/,
    text: [["Exit", "退场"]],
  },
];

const MAX_ICONS = 3;

/** 原始效果串 → UI 视图(图标 + 文本)。全局唯一入口,勿再各自启发式。 */
export function interpretEffect(raw: string, lang: Lang = LANG.value): EffectView {
  const hay = raw.toLowerCase();
  const icons: string[] = [];
  const blocked = new Set<string>();
  let text = raw;
  for (const c of CONCEPTS) {
    // 文本:字面量替换,与图标命中无关(zh only)
    if (lang === "zh") {
      for (const [f, r] of c.text ?? []) text = text.split(f).join(r);
    }
    // 图标:依序收集,block 让位,上限 3
    if (c.id && !blocked.has(c.id) && icons.length < MAX_ICONS && c.iconRe?.test(hay)) {
      icons.push(c.id);
      for (const b of c.block ?? []) blocked.add(b);
    }
  }
  return { icons, text };
}
