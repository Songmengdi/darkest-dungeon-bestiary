/* 全局观战设定:游戏模式(默认/光芒/血月/NG+)+ 火把亮度档。localStorage 持久化,作用于全部档案页。
 * 数值取自游戏 rules.json:standard=shared/;radiant=modes/radiant/;ng+=modes/new_game_plus/;
 * bloodmoon=CC DLC features/crimson_court/modes/bloodmoon/。副本等级(学徒/资深/冠军)与模式无关,
 * 由怪物 A/B/C 变体数据直接决定,不在本设定内。 */
import { computed, ref, watch } from "vue";
import { t } from "./i18n";

export type ModeId = "standard" | "radiant" | "bloodmoon" | "ngplus";

export interface ModeDef {
  id: ModeId;
  zh: string;
  en: string;
  hpMult: number;
  critMod: number;
  weekLimit: number | null;
  deathLimit: number | null;
}

export const MODES: ModeDef[] = [
  { id: "standard", zh: "默认", en: "Standard", hpMult: 1, critMod: 0, weekLimit: null, deathLimit: null },
  { id: "radiant", zh: "光芒", en: "Radiant", hpMult: 1, critMod: 0, weekLimit: null, deathLimit: null },
  { id: "bloodmoon", zh: "血月", en: "Bloodmoon", hpMult: 1.2, critMod: 3, weekLimit: 100, deathLimit: 16 },
  { id: "ngplus", zh: "NG+", en: "NG+", hpMult: 1.2, critMod: 3, weekLimit: 86, deathLimit: 12 },
];

/** 亮度档:区间为(下界,上界],对应游戏内火把读数 */
export interface LightBand {
  stop: number;
  range: [number, number];
  zh: string;
  en: string;
}

export const LIGHT_BANDS: LightBand[] = [
  { stop: 100, range: [76, 100], zh: "明亮", en: "Bright" },
  { stop: 75, range: [51, 75], zh: "微光", en: "Dim" },
  { stop: 50, range: [26, 50], zh: "昏暗", en: "Dark" },
  { stop: 25, range: [1, 25], zh: "幽暗", en: "Very dark" },
  { stop: 0, range: [0, 0], zh: "黑暗", en: "Darkness" },
];

/* darkness.range_table 各档怪物加成:命中(百分点)/伤害(%)/暴击(百分点);血月与 NG+ 同为高伤表 */
const LIGHT_MODS: Record<ModeId, { acc: number[]; dmg: number[]; crit: number[] }> = {
  standard: { acc: [0, 0, 5, 10, 12.5], dmg: [0, 0, 10, 15, 25], crit: [0, 1, 2, 3, 5] },
  radiant: { acc: [0, 0, 5, 10, 12.5], dmg: [0, 0, 10, 15, 25], crit: [0, 1, 2, 3, 5] },
  bloodmoon: { acc: [0, 0, 5, 10, 12.5], dmg: [0, 0, 10, 17.5, 30], crit: [0, 1, 2.5, 3.5, 6] },
  ngplus: { acc: [0, 0, 5, 10, 12.5], dmg: [0, 0, 10, 17.5, 30], crit: [0, 1, 2.5, 3.5, 6] },
};

const KEY = "dd-bestiary-settings";

function load(): { mode: ModeId; light: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const mode = MODES.some((m) => m.id === raw?.mode) ? raw.mode : "standard";
    const light = LIGHT_BANDS.some((b) => b.stop === raw?.light) ? raw.light : 100;
    return { mode, light };
  } catch {
    return { mode: "standard", light: 100 };
  }
}

const saved = load();

export const MODE = ref<ModeId>(saved.mode);
export const LIGHT = ref(saved.light);

watch([MODE, LIGHT], () => {
  localStorage.setItem(KEY, JSON.stringify({ mode: MODE.value, light: LIGHT.value }));
});

export const modeDef = computed<ModeDef>(() => MODES.find((m) => m.id === MODE.value) ?? MODES[0]!);
export const lightBand = computed<LightBand>(() => LIGHT_BANDS.find((b) => b.stop === LIGHT.value) ?? LIGHT_BANDS[0]!);

export function lightModOf(stop: number, mode: ModeId): { mAcc: number; mDmg: number; mCrit: number } {
  const i = LIGHT_BANDS.findIndex((b) => b.stop === stop);
  const mods = LIGHT_MODS[mode];
  return { mAcc: mods.acc[i]!, mDmg: mods.dmg[i]!, mCrit: mods.crit[i]! };
}

/** 百分比串加百分点:"92.5%" + 5 → "97.5%" */
export function addPct(v: string | undefined, pp: number): string {
  const n = parseFloat(String(v ?? "").replace(/%+$/, ""));
  if (Number.isNaN(n)) return v ?? "—";
  const out = n + pp;
  return `${Number.isInteger(out) ? out : out.toFixed(1).replace(/\.0$/, "")}%`;
}

/** 伤害加成 % → 乘数文案("1.1"/"1.175") */
export function pctMult(pct: number): string {
  return `×${Number((1 + pct / 100).toFixed(3))}`;
}

/** 亮度档悬浮说明(按当前游戏模式取值) */
export function lightTip(band: LightBand, mode: ModeId): string {
  const { mAcc, mDmg, mCrit } = lightModOf(band.stop, mode);
  const label = `火把 ${band.range[0]}${band.range[1] === band.range[0] ? "" : `–${band.range[1]}`}`;
  if (!mAcc && !mDmg && !mCrit) {
    return t(`${label}:怪物无修正`, `${label}: no monster modifiers`);
  }
  return t(
    `${label}:怪物命中 +${mAcc} · 伤害 +${mDmg}% · 暴击 +${mCrit}`,
    `${label}: monsters +${mAcc} ACC, +${mDmg}% DMG, +${mCrit} CRIT`,
  );
}

/** 游戏模式悬浮说明 */
export function modeTip(m: ModeDef): string {
  const head = t(`${m.zh}模式(游戏难度)`, `${m.en} mode`);
  if (m.hpMult === 1) return t(`${head}:怪物数值与默认相同`, `${head}: monster stats identical to Standard`);
  return t(
    `${head}:怪物生命 +20% · 暴击 +3(周数上限 ${m.weekLimit} · 英雄死亡上限 ${m.deathLimit})`,
    `${head}: monsters +20% HP, +3 CRIT (week limit ${m.weekLimit}, death limit ${m.deathLimit})`,
  );
}
