/* 怪物数据 payload 构造 —— .darkest 原始记录 → 图鉴 JSON 形状的唯一翻译层。
 * 职责:rank/目标语义(~=全体 AOE、@=怪物友方、反引号=噪音)、伤害区间、
 *       档位/技能/掉落/AI 的 JSON 形状。纯函数、无 IO、无进程内状态;
 *       名称查找通过 lookupName 注入(build.ts 用游戏语言包实现,测试用桩)。
 * 契约:输出形状由 tests/payload.spec.ts 锁定,前端 src/types.ts 是它的手工镜像 ——
 *       改这里必跑测试,改 types.ts 必对齐这里。 */
import type { BrainDef, DataIndex, LootTable, MonsterDef, TierData } from "./dataIndex.ts";

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
export function skillPayload(s: Record<string, unknown>, lookupName: NameLookup) {
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
    effects: asArray(s["effect"]),
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
      chance: d["base_chance"],
      type: String(d["type"] ?? ""),
    };
  });
  const targetDesires = ((raw["target_selection_desires"] as Record<string, unknown>[]) ?? []).map((d) => {
    const data = d["data"] as Record<string, unknown> | undefined;
    return {
      type: String(d["type"] ?? ""),
      chance: d["base_chance"],
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
    skills: td.info.filter((r) => r.type === "skill").map((r) => skillPayload(r.params, lookupName)),
    loot: lootRec?.["code"] !== undefined ? lootPayload(idx, String(lootRec["code"])) : [],
    brain: brainRec?.["id"] !== undefined ? brainPayload(idx, String(brainRec["id"])) : undefined,
    deathClass: deathRec ? String(deathRec["monster_class_id"] ?? "") : undefined,
    lifeLink: lifeRec ? String(lifeRec["base_class"] ?? "") : undefined,
  };
}
