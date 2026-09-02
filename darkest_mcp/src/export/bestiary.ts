/* 图鉴数据导出 —— darkest_mcp 作为 DD1 格式知识唯一所有者的产出端。
 * assembleBestiary:纯装配(索引 + 语言包 → 图鉴 JSON 字符串),可单测;
 * exportBestiary:编排(探测游戏 → 建索引/语言包 → 装配 → 写盘)。
 * 消费端是 bestiary(纯 JSON 消费者):monsters/<id>.json + index.json,
 * wiki 贴图由 bestiary 自己的资产管线(scripts/assets.ts)附加。 */
import fs from "node:fs";
import path from "node:path";
import { buildIndex, type DataIndex } from "../data/dataIndex.js";
import { Localization } from "../data/localization.js";
import { ddHash } from "../core/hash.js";
import { resolveGame } from "../config.js";
import { prettyId, tierPayload, type NameLookup, type Names } from "./payload.js";
import { REGION_LABELS, REGION_ORDER, regionRank, scanRegions } from "./regions.js";

export interface BestiaryData {
  count: number;
  /** monsters/<id>.json 的磁盘字节(无尾随换行) */
  monsterFiles: { id: string; json: string }[];
  /** index.json 的磁盘字节(无尾随换行;不含机器专属 game 字段) */
  indexJson: string;
}

/** 名称查找 adapter:本体语言包按 key 直查(xml/loc2);DLC 名用双包对齐的英→中映射回退。 */
export function namesLookup(loc: Localization): NameLookup {
  return (key: string): Names => {
    const out: Names = {};
    for (const h of loc.byKey(key, ddHash).hits) {
      if (h.lang === "schinese" && !out.zh) out.zh = h.text;
      else if (h.lang === "english" && !out.en) out.en = h.text;
      else if (h.lang === "japanese" && !out.ja) out.ja = h.text;
    }
    if (!out.zh && out.en) {
      const z = loc.zhForEnglish(out.en);
      if (z) out.zh = z;
    }
    return out;
  };
}

/** 纯装配:索引 + 语言包 → 图鉴 JSON 字节。输出形状由 tests/payload.spec.ts 与消费端 types.ts 锁定。 */
export function assembleBestiary(idx: DataIndex, loc: Localization): BestiaryData {
  const names = namesLookup(loc);
  const regionMap = scanRegions(idx);

  const monsterFiles: { id: string; json: string }[] = [];
  const indexEntries: Record<string, unknown>[] = [];
  for (const def of idx.monsters.values()) {
    const full = {
      id: def.id,
      dir: def.dir,
      tiers: def.tiers.map((td) => tierPayload(idx, def, td, names)),
    };
    monsterFiles.push({ id: def.id, json: JSON.stringify(full, null, 1) });

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
  }

  indexEntries.sort((a, b) => String(a["id"]).localeCompare(String(b["id"])));
  const meta = {
    count: indexEntries.length,
    regions: [...REGION_ORDER.map((id) => ({ id, ...REGION_LABELS[id] })), { id: "none", zh: "其他", en: "Other" }],
    monsters: indexEntries,
  };
  return { count: indexEntries.length, monsterFiles, indexJson: JSON.stringify(meta, null, 1) };
}

/** 编排:探测游戏 → 建索引与语言包 → 装配 → 写盘到 outDir(monsters/*.json + index.json)。 */
export function exportBestiary(outDir: string, dataDir?: string): BestiaryData {
  const game = resolveGame();
  const src = dataDir ?? game.dataDir;
  console.log(`游戏数据: ${src}`);
  const idx = buildIndex(src);
  const loc = new Localization(src);
  console.log(`怪物总数: ${idx.monsters.size}`);

  const data = assembleBestiary(idx, loc);
  fs.mkdirSync(path.join(outDir, "monsters"), { recursive: true });
  let done = 0;
  for (const m of data.monsterFiles) {
    fs.writeFileSync(path.join(outDir, "monsters", `${m.id}.json`), m.json, "utf8");
    done++;
    if (done % 20 === 0) console.log(`  进度 ${done}/${data.count}`);
  }
  fs.writeFileSync(path.join(outDir, "index.json"), data.indexJson, "utf8");
  console.log(`完成: ${data.count} 个怪物 -> ${outDir}(wiki 贴图请运行 bestiary 的资产管线)`);
  return data;
}
