/**
 * 暗黑地牢怪物图鉴 —— 数据构建脚本
 * 1) 解析全怪物数据(本体 + DLC)→ public/data/*.json
 * 2) 解析 dungeons/*.mash.darkest → 副本归属
 * 3) wiki 贴图接入:enemies.json + images/ → public/img/<id>.png(无匹配则无图)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex, type MonsterDef, type TierData } from "../lib/dataIndex.ts";
import { parseDarkest } from "../lib/darkestParser.ts";
import { Localization } from "../lib/localization.ts";
import { ddHash } from "../lib/hash.ts";
import { resolveGame } from "../lib/config.ts";
import { loadWikiIndex, resolveImage } from "../lib/wikiImages.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(PUBLIC, "data");
const IMG_DIR = path.join(PUBLIC, "img");

/* ---------------- 副本定义 ---------------- */
const REGION_ORDER = ["crypts", "weald", "warrens", "cove", "farmstead", "courtyard", "town", "darkestdungeon", "_shared"];
const REGION_LABELS: Record<string, { zh: string; en: string }> = {
  crypts: { zh: "遗迹", en: "Ruins" },
  weald: { zh: "荒野", en: "Weald" },
  warrens: { zh: "兽窟", en: "Warrens" },
  cove: { zh: "湾岸", en: "Cove" },
  farmstead: { zh: "农场", en: "Farmstead" },
  farm: { zh: "农场", en: "Farmstead" }, // 无光之境 DLC 的 mash 用 "farm"
  courtyard: { zh: "庭院", en: "Courtyard" },
  town: { zh: "城镇", en: "Town" },
  darkestdungeon: { zh: "黑暗地牢", en: "Darkest Dungeon" },
  _shared: { zh: "通用", en: "Shared" },
};
const TIER_LABELS: Record<string, { zh: string; en: string }> = {
  A: { zh: "学徒", en: "Apprentice" },
  B: { zh: "资深", en: "Veteran" },
  C: { zh: "冠军", en: "Champion" },
};

/* ---------------- 本地化 ---------------- */
interface Names {
  zh?: string;
  en?: string;
  ja?: string;
}
let loc: Localization;

function namesByKey(key: string): Names {
  const out: Names = {};
  for (const h of loc.byKey(key, ddHash).hits) {
    if (h.lang === "schinese" && !out.zh) out.zh = h.text;
    else if (h.lang === "english" && !out.en) out.en = h.text;
    else if (h.lang === "japanese" && !out.ja) out.ja = h.text;
  }
  // DLC 文本不在本体语言包里:DLC 英文名来自明文 XML;中文名用双包对齐得到的英→中映射回退
  if (!out.zh && out.en) {
    const z = loc.zhForEnglish(out.en);
    if (z) out.zh = z;
  }
  return out;
}

function rankDigits(v: unknown): number[] {
  return [...String(v ?? "")]
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4)
    .sort((a, b) => a - b);
}

function asArray(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function prettyId(id: string): string {
  return id
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function monsterDisplayName(def: MonsterDef, tier: string): Names {
  const out: Names = {};
  for (const h of loc.byKey(`str_monstername_${def.id}_${tier}`, ddHash).hits) {
    if (h.lang === "schinese" && !out.zh) out.zh = h.text;
    else if (h.lang === "english" && !out.en) out.en = h.text;
    else if (h.lang === "japanese" && !out.ja) out.ja = h.text;
  }
  if (!out.zh && out.en) {
    const z = loc.zhForEnglish(out.en);
    if (z) out.zh = z;
  }
  return out;
}

/* ---------------- 副本归属 ---------------- */
function scanRegions(idx: ReturnType<typeof buildIndex>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const add = (monster: string, region: string) => {
    let arr = map.get(monster);
    if (!arr) map.set(monster, (arr = []));
    if (!arr.includes(region)) arr.push(region);
  };
  for (const rel of idx.files) {
    if (!rel.endsWith(".mash.darkest")) continue;
    const parts = rel.split("/");
    let region: string;
    if (parts[0] === "dungeons") {
      region = parts[1];
    } else {
      // DLC 等路径内含 dungeons/<副本> 段(如 dlc/735730_color_of_madness/dungeons/weald/x.mash)
      const di = parts.indexOf("dungeons");
      region = di !== -1 && di + 1 <= parts.length - 2 ? parts[di + 1] : parts[0];
      if (di === -1) console.log(`  [region] 未识别副本的 mash: ${rel} -> ${region}`);
    }
    let records;
    try {
      records = parseMash(path.join(idx.dataDir, rel));
    } catch {
      continue;
    }
    for (const types of records) {
      for (const t of types) add(t.replace(/_[A-F]$/, ""), region);
    }
  }
  return map;
}

function parseMash(file: string): string[][] {
  const out: string[][] = [];
  const records = parseDarkest(fs.readFileSync(file, "utf8"));
  for (const r of records) {
    const t = r.params["types"];
    if (t === undefined) continue;
    out.push(asArray(t));
  }
  return out;
}

function regionRank(r: string): number {
  const i = REGION_ORDER.indexOf(r);
  return i === -1 ? REGION_ORDER.length : i;
}

/* ---------------- 怪物数据 ---------------- */
function skillPayload(s: Record<string, unknown>) {
  const id = String(s["id"] ?? "");
  const n = namesByKey(`str_monster_skill_${id}`);
  // target 原始串的标记语义:纯数字=敌方多选一;~ 前缀=全体同时命中(AOE);
  // @ 前缀=目标是怪物友方(增益/守护/治疗);` 为个别游戏数据的噪音字符,剔除
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

function lootPayload(idx: ReturnType<typeof buildIndex>, code: string) {
  const tables = idx.loot.filter((t) => t.id === code);
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

function brainPayload(idx: ReturnType<typeof buildIndex>, brainId: string) {
  const b = idx.brains.get(brainId);
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

function tierPayload(idx: ReturnType<typeof buildIndex>, def: MonsterDef, td: TierData) {
  const statsRec = td.info.find((r) => r.type === "stats")?.params;
  const etRec = td.info.find((r) => r.type === "enemy_type")?.params;
  const typeId = etRec ? String(etRec["id"]) : undefined;
  const typeNames = typeId ? namesByKey(`enemy_type_name_${typeId}`) : undefined;
  const lootRec = td.info.find((r) => r.type === "loot")?.params;
  const brainRec = td.info.find((r) => r.type === "monster_brain")?.params;
  const deathRec = td.info.find((r) => r.type === "death_class")?.params;
  const lifeRec = td.info.find((r) => r.type === "life_link")?.params;
  const sizeRec = td.info.find((r) => r.type === "display")?.params;
  return {
    tier: td.tier,
    label: TIER_LABELS[td.tier] ?? { zh: `档位 ${td.tier}`, en: `Tier ${td.tier}` },
    displayName: monsterDisplayName(def, td.tier),
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
    skills: td.info.filter((r) => r.type === "skill").map((r) => skillPayload(r.params)),
    loot: lootRec?.["code"] !== undefined ? lootPayload(idx, String(lootRec["code"])) : [],
    brain: brainRec?.["id"] !== undefined ? brainPayload(idx, String(brainRec["id"])) : undefined,
    deathClass: deathRec ? String(deathRec["monster_class_id"] ?? "") : undefined,
    lifeLink: lifeRec ? String(lifeRec["base_class"] ?? "") : undefined,
  };
}

/* ---------------- 主流程 ---------------- */
const game = resolveGame();
const idx = buildIndex(game.dataDir);
loc = new Localization(game.dataDir);

fs.mkdirSync(DATA_DIR, { recursive: true });
// 贴图目录整体清空重建:旧 Spine 拼贴图全部作废,只保留 wiki 正图
fs.rmSync(IMG_DIR, { recursive: true, force: true });
fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, "monsters"), { recursive: true });

console.log(`游戏数据: ${game.dataDir}`);
console.log(`怪物总数: ${idx.monsters.size}`);

const regionMap = scanRegions(idx);

const indexEntries: Record<string, unknown>[] = [];
let done = 0;
for (const def of idx.monsters.values()) {
  const full = {
    id: def.id,
    dir: def.dir,
    tiers: def.tiers.map((td) => tierPayload(idx, def, td)),
  };
  fs.writeFileSync(path.join(DATA_DIR, "monsters", `${def.id}.json`), JSON.stringify(full, null, 1), "utf8");

  const regionsRaw = (regionMap.get(def.id) ?? []).map((r) => (r === "farm" ? "farmstead" : r)); // CoM 的 "farm" 即农场副本
  const regions = regionsRaw.sort((a, b) => regionRank(a) - regionRank(b));
  const t0 = full.tiers[0];
  const name = t0?.displayName ?? {};
  indexEntries.push({
    id: def.id,
    name: {
      zh: name.zh ?? name.en ?? prettyId(def.id),
      en: name.en ?? prettyId(def.id),
    },
    type: t0?.enemyType ? { id: t0.enemyType.id, zh: t0.enemyType.zh, en: t0.enemyType.en } : undefined,
    size: t0?.size ?? 1,
    tiers: full.tiers.map((t) => t.tier),
    regions,
  });

  done++;
  if (done % 20 === 0) console.log(`  进度 ${done}/${idx.monsters.size}`);
}

/* ---------------- wiki 贴图接入 ---------------- */
const wiki = loadWikiIndex(ROOT);
let imgOverride = 0;
let imgByName = 0;
let imgNone = 0;
const usedWikiImages = new Set<string>();
for (const entry of indexEntries) {
  const id = String(entry["id"]);
  const en = (entry["name"] as Names).en;
  const hit = resolveImage(id, en, wiki);
  if (!hit) {
    imgNone++;
    continue;
  }
  fs.copyFileSync(path.join(ROOT, hit.src), path.join(IMG_DIR, `${id}.png`));
  entry["image"] = `img/${id}.png`;
  usedWikiImages.add(hit.src);
  if (hit.how === "override") imgOverride++;
  else imgByName++;
}
const unusedWiki = [...new Set(wiki.all.map((e) => e.image))].filter((img) => !usedWikiImages.has(img));
console.log(`wiki 贴图: 别名表命中 ${imgOverride},名称匹配 ${imgByName},无图怪物 ${imgNone},未用 wiki 图 ${unusedWiki.length}`);
if (unusedWiki.length) console.log(`  未使用: ${unusedWiki.join(", ")}`);

indexEntries.sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
const meta = {
  game: game.gameRoot,
  count: indexEntries.length,
  regions: [...REGION_ORDER.map((id) => ({ id, ...REGION_LABELS[id] })), { id: "none", zh: "其他", en: "Other" }],
  monsters: indexEntries,
};
fs.writeFileSync(path.join(DATA_DIR, "index.json"), JSON.stringify(meta, null, 1), "utf8");
console.log(`完成: ${indexEntries.length} 个怪物,wiki 贴图 ${imgOverride + imgByName} 张 -> ${PUBLIC}`);
