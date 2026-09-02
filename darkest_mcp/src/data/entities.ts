import type { DataIndex, MonsterDef, HeroDef } from "./dataIndex.js";
import type { Localization } from "./localization.js";
import { ddHash } from "../core/hash.js";

export interface EntityNames {
  lang: string;
  text: string;
  source: string;
}

function namesFor(baseKey: string, loc: Localization): EntityNames[] {
  const out: EntityNames[] = [];
  const res = loc.byKey(baseKey, ddHash);
  const seenLangs = new Set<string>();
  for (const h of res.hits.filter((x) => x.source === "xml")) {
    seenLangs.add(h.lang);
    out.push({ lang: h.lang, text: h.text, source: h.source });
  }
  for (const h of res.hits.filter((x) => x.source === "loc2")) {
    if (!seenLangs.has(h.lang)) {
      seenLangs.add(h.lang);
      out.push({ lang: h.lang, text: h.text, source: h.source });
    }
  }
  return out;
}

export function monsterNames(id: string, tier: string, loc: Localization): EntityNames[] {
  const out = namesFor(`str_monstername_${id}_${tier}`, loc);
  // DLC 怪名不在本体语言包:英文来自明文 XML;中文用 DLC 双包对齐的英→中映射回退
  const hasZh = out.some((n) => n.lang === "schinese");
  const en = out.find((n) => n.lang === "english");
  if (!hasZh && en) {
    const z = loc.zhForEnglish(en.text);
    if (z) out.push({ lang: "schinese", text: z, source: "loc2" });
  }
  return out;
}

export function heroNames(id: string, loc: Localization): EntityNames[] {
  return namesFor(`str_hero_name_${id}`, loc);
}

function statsOf(records: { type: string; params: Record<string, unknown> }[]): Record<string, unknown> | undefined {
  return records.find((r) => r.type === "stats")?.params;
}

function skillsOf(records: { type: string; params: Record<string, unknown> }[]): Record<string, unknown>[] {
  return records.filter((r) => r.type === "skill").map((r) => r.params);
}

function refRecord(records: { type: string; params: Record<string, unknown> }[], type: string): Record<string, unknown> | undefined {
  return records.find((r) => r.type === type)?.params;
}

function fmtStats(s: Record<string, unknown> | undefined): string {
  if (!s) return "—";
  return Object.entries(s)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}

export function renderMonster(def: MonsterDef, idx: DataIndex, loc: Localization): string {
  const lines: string[] = [];
  lines.push(`# ${def.id}(怪物)`);
  for (const td of def.tiers) {
    const names = monsterNames(def.id, td.tier, loc);
    const en = names.find((n) => n.lang === "english");
    const zh = names.find((n) => n.lang === "schinese");
    const nameTag = [en?.text, zh ? `${zh.text}` : ""].filter(Boolean).join(" / ");
    lines.push("");
    lines.push(`## 难度档 ${td.tier}${nameTag ? ` — ${nameTag}` : ""}`);
    lines.push(`- stats: ${fmtStats(statsOf(td.info))}`);
    const et = refRecord(td.info, "enemy_type");
    if (et) lines.push(`- enemy_type: ${et["id"]}`);
    for (const s of skillsOf(td.info)) {
      lines.push(`- skill ${s["id"]}: type=${s["type"]} atk=${s["atk"]} dmg=${Array.isArray(s["dmg"]) ? s["dmg"].join("-") : s["dmg"]} crit=${s["crit"]} launch=${s["launch"]} target=${s["target"]}${s["effect"] ? ` effect=${JSON.stringify(s["effect"])}` : ""}`);
    }
    const loot = refRecord(td.info, "loot");
    if (typeof loot?.["code"] === "string") {
      const tables = idx.loot.filter((t) => t.id === loot["code"]);
      if (tables.length > 0) {
        for (const t of tables) {
          lines.push(`- loot "${loot["code"]}"(${t.file}): ${JSON.stringify(t.raw).slice(0, 400)}`);
        }
      } else {
        lines.push(`- loot code: ${loot["code"]}(loot.json 中未找到同名表)`);
      }
    }
    const brain = refRecord(td.info, "monster_brain");
    if (typeof brain?.["id"] === "string") {
      const b = idx.brains.get(brain["id"]);
      if (b) {
        lines.push(`- AI brain ${brain["id"]}: ${JSON.stringify(b.raw).slice(0, 500)}`);
      } else {
        lines.push(`- AI brain 引用: ${brain["id"]}(未在 raid/ai 索引中)`);
      }
    }
    for (const t of ["death_class", "life_link", "battle_modifier", "initiative", "personality"]) {
      const r = refRecord(td.info, t);
      if (r && Object.keys(r).length > 0) lines.push(`- ${t}: ${JSON.stringify(r)}`);
    }
    if (td.art.length > 0) {
      lines.push(`- art 记录类型: ${[...new Set(td.art.map((r) => r.type))].join(", ")}`);
    }
  }
  return lines.join("\n");
}

export function renderHero(def: HeroDef, idx: DataIndex, loc: Localization): string {
  const lines: string[] = [];
  lines.push(`# ${def.id}(英雄)`);
  const names = heroNames(def.id, loc);
  if (names.length > 0) {
    lines.push(`显示名: ${names.map((n) => `${n.lang}="${n.text}"`).join(", ")}`);
  }
  lines.push("");
  lines.push(`## 基础`);
  lines.push(`- resistances: ${JSON.stringify(refRecord(def.info, "resistances") ?? {})}`);
  const weapons = def.info.filter((r) => r.type === "weapon").map((r) => r.params);
  const armours = def.info.filter((r) => r.type === "armour").map((r) => r.params);
  if (weapons.length > 0) {
    lines.push("");
    lines.push(`## 武器(${weapons.length} 级)`);
    for (const w of weapons) lines.push(`- ${JSON.stringify(w)}`);
  }
  if (armours.length > 0) {
    lines.push("");
    lines.push(`## 护甲(${armours.length} 级)`);
    for (const a of armours) lines.push(`- ${JSON.stringify(a)}`);
  }
  const skills = new Map<string, Record<string, unknown>[]>();
  for (const r of def.info) {
    if (r.type !== "combat_skill") continue;
    const id = r.params["id"];
    if (typeof id !== "string") continue;
    let arr = skills.get(id);
    if (!arr) {
      arr = [];
      skills.set(id, arr);
    }
    arr.push(r.params);
  }
  if (skills.size > 0) {
    lines.push("");
    lines.push(`## 技能(${skills.size} 个)`);
    for (const [id, levels] of skills) {
      const l0 = levels[0];
      lines.push(`- ${id}: type=${l0["type"]} launch=${l0["launch"]} target=${l0["target"]}`);
      for (const l of levels) {
        lines.push(`  - lv${l["level"]}: atk=${l["atk"]} dmg=${l["dmg"]} crit=${l["crit"]}${l["effect"] ? ` effect=${JSON.stringify(l["effect"])}` : ""}`);
      }
    }
  }
  const trees = idx.upgradeTrees.filter((t) => t.id.startsWith(def.id + "."));
  if (trees.length > 0) {
    lines.push("");
    lines.push(`## 升级树(${trees.length})`);
    for (const t of trees) {
      const reqs = (t.raw["requirements"] as Record<string, unknown>[]) ?? [];
      lines.push(`- ${t.id}: ${reqs.length} 级升级(${t.file})`);
    }
  }
  return lines.join("\n");
}

export function renderTrinket(id: string, idx: DataIndex, loc: Localization): string | undefined {
  const t = idx.trinkets.find((x) => x.id === id);
  if (!t) return undefined;
  const lines: string[] = [];
  lines.push(`# ${id}(饰品)`);
  lines.push(`- 定义: ${JSON.stringify(t.raw)}`);
  const names = namesFor(`str_inventory_title_${id}`, loc);
  const en = names.find((n) => n.lang === "english");
  if (en) lines.push(`- 英文名: ${en.text}`);
  const buffs = t.raw["buffs"];
  if (Array.isArray(buffs)) {
    lines.push("");
    lines.push(`## 效果引用(${buffs.length})`);
    for (const b of buffs) {
      const e = idx.effects.get(String(b));
      if (e) {
        lines.push(`- ${b}: ${e.records.map((r) => JSON.stringify(r.params)).join(" | ").slice(0, 300)}`);
      } else {
        lines.push(`- ${b}: (effects 索引中未找到)`);
      }
    }
  }
  return lines.join("\n");
}

export function renderEffect(id: string, idx: DataIndex): string | undefined {
  const e = idx.effects.get(id);
  if (!e) return undefined;
  const lines: string[] = [];
  lines.push(`# ${id}(效果)`);
  lines.push(`- 定义于 ${e.file},${e.records.length} 条记录`);
  for (const r of e.records) {
    lines.push(`- [${r.type}] ${JSON.stringify(r.params)}`);
  }
  return lines.join("\n");
}

export function renderBrain(id: string, idx: DataIndex): string | undefined {
  const b = idx.brains.get(id);
  if (!b) return undefined;
  return `# ${id}(AI brain)\n${JSON.stringify(b.raw, null, 2)}`;
}

export function findEntity(
  id: string,
  idx: DataIndex,
): { kind: "monster" | "hero" | "trinket" | "effect" | "brain"; ref: string } | undefined {
  if (idx.monsters.has(id)) return { kind: "monster", ref: id };
  if (idx.heroes.has(id)) return { kind: "hero", ref: id };
  if (idx.trinkets.some((t) => t.id === id)) return { kind: "trinket", ref: id };
  if (idx.effects.has(id)) return { kind: "effect", ref: id };
  if (idx.brains.has(id)) return { kind: "brain", ref: id };
  return undefined;
}
