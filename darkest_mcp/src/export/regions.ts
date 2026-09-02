/* 副本归属:解析 dungeons/*.mash.darkest(dlc 内的 mash 亦然),把怪物 id 映射到副本。 */
import fs from "node:fs";
import path from "node:path";
import { parseDarkest } from "../core/darkestParser.js";
import type { DataIndex } from "../data/dataIndex.js";
import { asArray } from "./payload.js";

export const REGION_ORDER = ["crypts", "weald", "warrens", "cove", "farmstead", "courtyard", "town", "darkestdungeon", "_shared"];
export const REGION_LABELS: Record<string, { zh: string; en: string }> = {
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

export function regionRank(r: string): number {
  const i = REGION_ORDER.indexOf(r);
  return i === -1 ? REGION_ORDER.length : i;
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

export function scanRegions(idx: DataIndex): Map<string, string[]> {
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
