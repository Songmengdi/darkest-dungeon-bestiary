/**
 * 暗黑地牢怪物图鉴 —— 数据构建脚本(编排层)
 * 1) 解析全怪物数据(本体 + DLC)→ public/data/*.json
 * 2) 解析 dungeons/*.mash.darkest → 副本归属
 * 3) wiki 贴图接入:enemies.json + images/ → public/img/<id>.png(无匹配则无图)
 * payload 形状的翻译逻辑在 lib/payload.ts(纯函数,可单测);
 * .darkest/语言包/wiki 索引的解析在 lib/*。本文件只做:装配依赖 → 跑流程 → 写盘。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex, type MonsterDef } from "../lib/dataIndex.ts";
import { parseDarkest } from "../lib/darkestParser.ts";
import { Localization } from "../lib/localization.ts";
import { ddHash } from "../lib/hash.ts";
import { resolveGame } from "../lib/config.ts";
import { loadWikiIndex, resolveImage } from "../lib/wikiImages.ts";
import { asArray, prettyId, tierPayload, type Names, type NameLookup } from "../lib/payload.ts";

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

/* ---------------- 本地化(名称查找 adapter:注入给 payload 层)---------------- */
let loc: Localization;

const namesByKey: NameLookup = (key: string): Names => {
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
};

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
    tiers: def.tiers.map((td) => tierPayload(idx, def, td, namesByKey)),
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
// 盘符大小写归一:注册表可能返回 d:\ 或 D:\,tracked 的 index.json 不该因此产生噪音 diff
const gameLabel = game.gameRoot.replace(/^[a-zA-Z]:/, (m) => m[0].toUpperCase() + ":");
const meta = {
  game: gameLabel,
  count: indexEntries.length,
  regions: [...REGION_ORDER.map((id) => ({ id, ...REGION_LABELS[id] })), { id: "none", zh: "其他", en: "Other" }],
  monsters: indexEntries,
};
fs.writeFileSync(path.join(DATA_DIR, "index.json"), JSON.stringify(meta, null, 1), "utf8");
console.log(`完成: ${indexEntries.length} 个怪物,wiki 贴图 ${imgOverride + imgByName} 张 -> ${PUBLIC}`);
