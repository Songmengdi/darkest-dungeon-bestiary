/**
 * 探针:反查 DLC(血色宫廷/无光之境/破盾者)全部怪物的官方英文名与中文名。
 * 用法: npx tsx scripts/probe-dlc-names.ts
 */
import fs from "node:fs";
import path from "node:path";
import { parseLoc2, type Loc2Data } from "../lib/loc2Parser.ts";
import { ddHash } from "../lib/hash.ts";

const GAME = process.env["DD_GAME_DIR"] ?? "D:\\software\\steam\\steamapps\\common\\DarkestDungeon";
const DLC = path.join(GAME, "dlc");

/** 收集 dlc 下所有 localization/*.loc2,按语言归并(后加载的不覆盖先加载的) */
function loadLoc2(): { english: Loc2Data[]; schinese: Loc2Data[] } {
  const english: Loc2Data[] = [];
  const schinese: Loc2Data[] = [];
  for (const dlc of fs.readdirSync(DLC)) {
    const locDir = path.join(DLC, dlc, "localization");
    if (!fs.existsSync(locDir)) continue;
    for (const f of fs.readdirSync(locDir)) {
      if (!f.endsWith(".loc2")) continue;
      const lang = f.endsWith("_english.loc2") ? "english" : f.endsWith("_schinese.loc2") ? "schinese" : null;
      if (!lang) continue;
      try {
        const data = parseLoc2(fs.readFileSync(path.join(locDir, f)), f);
        (lang === "english" ? english : schinese).push(data);
      } catch (e) {
        console.error(`  [skip] ${f}: ${e}`);
      }
    }
  }
  return { english, schinese };
}

function lookup(packs: Loc2Data[], key: string): string | undefined {
  const h = ddHash(key);
  for (const p of packs) {
    const t = p.byHash.get(h);
    if (t !== undefined) return t;
  }
  return undefined;
}

/** 三个 DLC 怪物根目录(CC 的 monsters 埋在 features 下) */
const MONSTER_ROOTS = [
  path.join(DLC, "580100_crimson_court", "features", "crimson_court", "monsters"),
  path.join(DLC, "735730_color_of_madness", "monsters"),
  path.join(DLC, "702540_shieldbreaker", "monsters"),
];

const { english, schinese } = loadLoc2();
console.error(`loc2 packs: english=${english.length} schinese=${schinese.length}`);

for (const root of MONSTER_ROOTS) {
  console.error(`--- ${root.replace(GAME, "")} ---`);
  for (const id of fs.readdirSync(root).sort()) {
    const dir = path.join(root, id);
    if (!fs.statSync(dir).isDirectory()) continue;
    let en: string | undefined;
    let zh: string | undefined;
    let tier = "";
    for (const t of ["A", "B", "C", "D", "E"]) {
      const key = `str_monstername_${id}_${t}`;
      const e = lookup(english, key);
      if (e !== undefined) {
        en = e;
        zh = lookup(schinese, key);
        tier = t;
        break;
      }
    }
    console.log(`${id}\t${tier}\t${en ?? "?"}\t${zh ?? "?"}`);
  }
}
