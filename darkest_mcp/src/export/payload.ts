/* 怪物数据 payload 构造 —— .darkest 原始记录 → 图鉴 JSON 形状的唯一翻译层。
 * 职责:rank/目标语义(~=全体 AOE、@=怪物友方、反引号=噪音)、伤害区间、
 *       档位/技能/掉落/AI 的 JSON 形状。纯函数、无 IO、无进程内状态;
 *       名称查找通过 lookupName 注入(bestiary.ts 用游戏语言包实现,测试用桩)。
 * 契约:输出形状由 tests/payload.spec.ts 锁定,前端 bestiary/src/types.ts 是它的手工镜像 ——
 *       改这里必跑测试,改 types.ts 必对齐这里。 */
import type { BrainDef, DataIndex, LootTable, MonsterDef, TierData } from "../data/dataIndex.js";

export interface Names {
  zh?: string;
  en?: string;
  ja?: string;
}

/** 名称查找:按本地化 key 返回多语名(实现方决定语言包与回退策略) */
export type NameLookup = (key: string) => Names;

export const TIER_LABELS: Record<string, { zh: string; en: string }> = {
  A: { zh: "学徒", en: "Apprentice" },
  B: { zh: "资深", en: "Veteran" },
  C: { zh: "冠军", en: "Champion" },
};

export function rankDigits(v: unknown): number[] {
  return [...String(v ?? "")]
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4)
    .sort((a, b) => a - b);
}

export function asArray(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

export function prettyId(id: string): string {
  return id
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function monsterDisplayName(def: MonsterDef, tier: string, lookupName: NameLookup): Names {
  return lookupName(`str_monstername_${def.id}_${tier}`);
}

/* target 原始串的标记语义:纯数字=敌方多选一;~ 前缀=全体同时命中(AOE);
 * @ 前缀=目标是怪物友方(增益/守护/治疗);` 为个别游戏数据的噪音字符,剔除 */
export interface SkillPayload {
  id: string;
  name: Names;
  type: string;
  atk?: string;
  dmg?: string;
  crit?: string;
  launch: number[];
  target: number[];
  targetAoe?: boolean;
  targetAlly?: boolean;
  effects: EffectPayload[];
}

/** 技能效果的结构化视图:raw 未命中效果表时仅含 raw(UI 回退到原始串渲染)。
 *  语义字段均取自游戏效果定义(base/DLC .effects.darkest)的真实参数。 */
export interface EffectPayload {
  raw: string;
  chance?: string;
  /** 持续回合数(duration) */
  duration?: number;
  /** 一次性压力值(stress) */
  stress?: string;
  /** 持续伤害:dotBleed/dotPoison/dotStress,amount 为每回合值 */
  dot?: { kind: "bleed" | "blight" | "stress"; amount: string; duration?: number };
  move?: { kind: "push" | "pull" | "shuffle"; amount?: string };
  stun?: string;
  heal?: string;
  healStress?: string;
  torch?: string;
  dmgMultiply?: string;
  /** 战斗属性增减:attack/defense/speed/protection/crit(值含符号与 % 号) */
  stats?: Array<{ key: string; value: string }>;
  traits?: Array<
    "summon" | "guard" | "riposte" | "mark" | "disease" | "kill" | "capture" | "control" | "transform" |
    "cleanse" | "clear_guard" | "stealth" | "unstealth" | "steal_buff" | "instant"
  >;
}

const STAT_ADD_KEYS = [
  "attack_rating_add",
  "defense_rating_add",
  "speed_rating_add",
  "protection_rating_add",
  "crit_chance_add",
] as const;

function firstParam(p: Record<string, string | string[]>, key: string): string | undefined {
  const v = p[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s === undefined || s === "" ? undefined : String(s);
}

export function effectPayload(raw: string, idx: Pick<DataIndex, "effects">): EffectPayload | undefined {
  const out: EffectPayload = { raw };
  const rec = idx.effects.get(raw)?.records[0];
  if (!rec) return out;
  const p = rec.params;
  const dur = firstParam(p, "duration");
  const duration = dur !== undefined ? Number(dur) || undefined : undefined;
  out.chance = firstParam(p, "chance");
  if (duration !== undefined) out.duration = duration;
  const stress = firstParam(p, "stress");
  if (stress !== undefined) out.stress = stress;
  const dot =
    firstParam(p, "dotBleed") !== undefined ? { kind: "bleed" as const, amount: firstParam(p, "dotBleed")! }
      : firstParam(p, "dotPoison") !== undefined ? { kind: "blight" as const, amount: firstParam(p, "dotPoison")! }
        : firstParam(p, "dotStress") !== undefined ? { kind: "stress" as const, amount: firstParam(p, "dotStress")! }
          : undefined;
  if (dot) out.dot = { ...dot, duration };
  const push = firstParam(p, "push");
  const pull = firstParam(p, "pull");
  if (push !== undefined) out.move = { kind: "push", amount: push };
  else if (pull !== undefined) out.move = { kind: "pull", amount: pull };
  else if (p["shuffleparty"] !== undefined) out.move = { kind: "shuffle" };
  const stun = firstParam(p, "stun");
  if (stun !== undefined) out.stun = stun;
  const heal = firstParam(p, "heal");
  if (heal !== undefined) out.heal = heal;
  const healstress = firstParam(p, "healstress");
  if (healstress !== undefined) out.healStress = healstress;
  const torch = firstParam(p, "torch_decrease");
  if (torch !== undefined) out.torch = torch;
  const dlo = firstParam(p, "damage_low_multiply");
  const dhi = firstParam(p, "damage_high_multiply");
  if (dlo !== undefined || dhi !== undefined) out.dmgMultiply = dlo === dhi ? dlo : `${dlo ?? "?"}~${dhi ?? "?"}`;
  const stats = STAT_ADD_KEYS.filter((k) => p[k] !== undefined)
    .map((k) => ({ key: k, value: firstParam(p, k)! }));
  if (stats.length) out.stats = stats;
  const traits: EffectPayload["traits"] = [];
  if (p["summon_monsters"] !== undefined) traits.push("summon");
  if (p["guard"] !== undefined) traits.push("guard");
  if (p["riposte"] !== undefined) traits.push("riposte");
  if (firstParam(p, "keyStatus") === "tagged" || p["tag"] !== undefined) traits.push("mark");
  if (p["disease"] !== undefined) traits.push("disease");
  if (p["kill"] !== undefined) traits.push("kill");
  if (p["capture"] !== undefined) traits.push("capture");
  if (p["control"] !== undefined) traits.push("control");
  if (p["set_monster_class_id"] !== undefined || p["set_mode"] !== undefined) traits.push("transform");
  if (p["cure"] !== undefined) traits.push("cleanse");
  if (p["clearguarding"] !== undefined || p["clearguarded"] !== undefined) traits.push("clear_guard");
  if (p["stealth"] !== undefined) traits.push("stealth");
  if (p["destealth"] !== undefined) traits.push("unstealth");
  if (p["steal_buff_stat_type"] !== undefined) traits.push("steal_buff");
  if (p["skill_instant"] !== undefined) traits.push("instant");
  if (traits.length) out.traits = traits;
  // 纯台词效果(bark,无任何 gameplay 语义)不是玩家可读的战斗信息,不导出
  const noSemantics =
    !out.dot && !out.move && !out.stun && !out.stress && !out.heal && !out.healStress
    && !out.torch && !out.dmgMultiply && !out.stats && !out.traits;
  if (noSemantics && p["bark"] !== undefined) return undefined;
  return out;
}

export function skillPayload(s: Record<string, unknown>, lookupName: NameLookup, idx: Pick<DataIndex, "effects">): SkillPayload {
  const id = String(s["id"] ?? "");
  const n = lookupName(`str_monster_skill_${id}`);
  const rawTarget = String(s["target"] ?? "").replace(/`/g, "");
  return {
    id,
    name: { zh: n.zh ?? n.en ?? id, en: n.en ?? id },
    type: String(s["type"] ?? ""),
    atk: s["atk"] !== undefined ? String(s["atk"]) : undefined,
    dmg:
      Array.isArray(s["dmg"]) && s["dmg"].length >= 2
        ? `${String(s["dmg"][0])}-${String(s["dmg"][1])}`
        : s["dmg"] !== undefined
          ? String(s["dmg"])
          : undefined,
    crit: s["crit"] !== undefined ? String(s["crit"]) : undefined,
    launch: rankDigits(s["launch"]),
    target: rankDigits(rawTarget),
    targetAoe: rawTarget.includes("~") || undefined,
    targetAlly: rawTarget.includes("@") || undefined,
    effects: asArray(s["effect"])
      .map((e) => effectPayload(e, idx))
      .filter((e): e is EffectPayload => e !== undefined),
  };
}

export function lootPayload(idx: Pick<DataIndex, "loot">, code: string) {
  const tables = idx.loot.filter((t: LootTable) => t.id === code);
  const seen = new Set<string>();
  const out: { file: string; entries: Record<string, unknown>[] }[] = [];
  for (const t of tables) {
    const entries = (t.raw["entries"] as Record<string, unknown>[]) ?? [];
    const key = t.file + ":" + JSON.stringify(entries);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      file: t.file,
      entries: entries.map((e) => ({
        type: String(e["type"] ?? ""),
        chances: e["chances"],
        data: e["data"] as Record<string, unknown>,
      })),
    });
  }
  return out;
}

export function brainPayload(idx: Pick<DataIndex, "brains">, brainId: string) {
  const b = idx.brains.get(brainId) as BrainDef | undefined;
  if (!b) return undefined;
  const raw = b.raw as Record<string, unknown>;
  const skillDesires = ((raw["skill_selection_desires"] as Record<string, unknown>[]) ?? []).map((d) => {
    const data = d["data"] as Record<string, unknown> | undefined;
    return {
      skill: String(data?.["combat_skill_id"] ?? ""),
      chance: data?.["base_chance"],
      type: String(d["type"] ?? ""),
    };
  });
  const targetDesires = ((raw["target_selection_desires"] as Record<string, unknown>[]) ?? []).map((d) => {
    const data = d["data"] as Record<string, unknown> | undefined;
    return {
      type: String(d["type"] ?? ""),
      chance: data?.["base_chance"],
      skill: data?.["specific_combat_skill_id"] ? String(data["specific_combat_skill_id"]) : undefined,
    };
  });
  return { id: brainId, skillDesires, targetDesires };
}

export function tierPayload(idx: Pick<DataIndex, "loot" | "brains">, def: MonsterDef, td: TierData, lookupName: NameLookup) {
  const statsRec = td.info.find((r) => r.type === "stats")?.params;
  const etRec = td.info.find((r) => r.type === "enemy_type")?.params;
  const typeId = etRec ? String(etRec["id"]) : undefined;
  const typeNames = typeId ? lookupName(`enemy_type_name_${typeId}`) : undefined;
  const lootRec = td.info.find((r) => r.type === "loot")?.params;
  const brainRec = td.info.find((r) => r.type === "monster_brain")?.params;
  const deathRec = td.info.find((r) => r.type === "death_class")?.params;
  const lifeRec = td.info.find((r) => r.type === "life_link")?.params;
  const sizeRec = td.info.find((r) => r.type === "display")?.params;
  return {
    tier: td.tier,
    label: TIER_LABELS[td.tier] ?? { zh: `档位 ${td.tier}`, en: `Tier ${td.tier}` },
    displayName: monsterDisplayName(def, td.tier, lookupName),
    size: sizeRec?.["size"] !== undefined ? Number(sizeRec["size"]) : 1,
    stats: statsRec
      ? {
          hp: statsRec["hp"] !== undefined ? String(statsRec["hp"]) : undefined,
          def: statsRec["def"] !== undefined ? String(statsRec["def"]) : undefined,
          prot: statsRec["prot"] !== undefined ? String(statsRec["prot"]) : undefined,
          spd: statsRec["spd"] !== undefined ? String(statsRec["spd"]) : undefined,
          crit: statsRec["crit"] !== undefined ? String(statsRec["crit"]) : undefined,
          res: {
            stun: statsRec["stun_resist"] !== undefined ? String(statsRec["stun_resist"]) : undefined,
            poison: statsRec["poison_resist"] !== undefined ? String(statsRec["poison_resist"]) : undefined,
            bleed: statsRec["bleed_resist"] !== undefined ? String(statsRec["bleed_resist"]) : undefined,
            debuff: statsRec["debuff_resist"] !== undefined ? String(statsRec["debuff_resist"]) : undefined,
            move: statsRec["move_resist"] !== undefined ? String(statsRec["move_resist"]) : undefined,
          },
        }
      : undefined,
    enemyType: typeId ? { id: typeId, zh: typeNames?.zh ?? typeId, en: typeNames?.en ?? typeId } : undefined,
    skills: td.info.filter((r) => r.type === "skill").map((r) => skillPayload(r.params, lookupName, idx)),
    loot: lootRec?.["code"] !== undefined ? lootPayload(idx, String(lootRec["code"])) : [],
    brain: brainRec?.["id"] !== undefined ? brainPayload(idx, String(brainRec["id"])) : undefined,
    deathClass: deathRec ? String(deathRec["monster_class_id"] ?? "") : undefined,
    lifeLink: lifeRec ? String(lifeRec["base_class"] ?? "") : undefined,
  };
}
