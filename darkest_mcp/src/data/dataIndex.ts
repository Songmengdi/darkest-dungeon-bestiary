import fs from "node:fs";
import path from "node:path";
import { parseDarkest, type DarkestRecord } from "../core/darkestParser.js";

export interface TierData {
  tier: string;
  info: DarkestRecord[];
  art: DarkestRecord[];
}

export interface MonsterDef {
  id: string;
  dir: string;
  tiers: TierData[];
}

export interface HeroDef {
  id: string;
  dir: string;
  info: DarkestRecord[];
  art: DarkestRecord[];
}

export interface TrinketDef {
  id: string;
  file: string;
  raw: Record<string, unknown>;
}

export interface LootTable {
  id: string;
  file: string;
  raw: Record<string, unknown>;
}

export interface BrainDef {
  id: string;
  raw: Record<string, unknown>;
}

export interface UpgradeTree {
  id: string;
  file: string;
  raw: Record<string, unknown>;
}

export interface EffectDef {
  id: string;
  file: string;
  records: DarkestRecord[];
}

export interface DataIndex {
  dataDir: string;
  files: string[];
  monsters: Map<string, MonsterDef>;
  heroes: Map<string, HeroDef>;
  trinkets: TrinketDef[];
  effects: Map<string, EffectDef>;
  brains: Map<string, BrainDef>;
  loot: LootTable[];
  upgradeTrees: UpgradeTree[];
}

function parseJsonLoose(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(content.replace(/,\s*([}\]])/g, "$1"));
  }
}

function listRelFiles(root: string, rel = ""): string[] {
  const out: string[] = [];
  const abs = path.join(root, rel);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const relChild = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listRelFiles(root, relChild));
    else out.push(relChild);
  }
  return out;
}

function readRecords(dataDir: string, rel: string): DarkestRecord[] {
  try {
    return parseDarkest(fs.readFileSync(path.join(dataDir, rel), "utf8"));
  } catch {
    return [];
  }
}

function readJson(dataDir: string, rel: string): unknown {
  try {
    return parseJsonLoose(fs.readFileSync(path.join(dataDir, rel), "utf8"));
  } catch {
    return undefined;
  }
}

function tierOf(dirName: string): string | null {
  const m = /_([A-F])$/.exec(dirName);
  return m ? m[1] : null;
}

function collectArraysDeep(node: unknown, pred: (o: Record<string, unknown>) => boolean, out: Record<string, unknown>[]): void {
  if (Array.isArray(node)) {
    for (const n of node) collectArraysDeep(n, pred, out);
    return;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (pred(o)) out.push(o);
    for (const v of Object.values(o)) collectArraysDeep(v, pred, out);
  }
}

export function buildIndex(dataDir: string): DataIndex {
  const files = listRelFiles(dataDir).sort();
  const idx: DataIndex = {
    dataDir,
    files,
    monsters: new Map(),
    heroes: new Map(),
    trinkets: [],
    effects: new Map(),
    brains: new Map(),
    loot: [],
    upgradeTrees: [],
  };

  for (const rel of files) {
    // 兼容本体 monsters/<id>/... 与 DLC 的两种布局:
    //   dlc/<appid>_<name>/monsters/<id>/...(CoM、破盾者)
    //   dlc/<appid>_<name>/features/<feature>/monsters/<id>/...(血色宫廷)
    const parts = rel.split("/");
    const mi = parts.lastIndexOf("monsters");
    if (mi === -1 || mi + 2 > parts.length - 1) continue;
    const id = parts[mi + 1];
    const fname = parts[parts.length - 1];
    if (!/\.(info|art)\.darkest$/.test(fname)) continue;
    const base = fname.replace(/\.(info|art)\.darkest$/, "");
    // 防误扫其他 modules 下的 monsters 目录:档位字母必须能从文件名或所在子目录推出
    const tier = tierOf(base) ?? (mi + 2 <= parts.length - 2 ? tierOf(parts[mi + 2]) : null);
    if (!tier) continue;
    let def = idx.monsters.get(id);
    if (!def) {
      def = { id, dir: parts.slice(0, mi + 2).join("/"), tiers: [] };
      idx.monsters.set(id, def);
    }
    let td = def.tiers.find((t) => t.tier === tier);
    if (!td) {
      td = { tier, info: [], art: [] };
      def.tiers.push(td);
    }
    if (rel.endsWith(".info.darkest")) td.info = readRecords(dataDir, rel);
    else if (rel.endsWith(".art.darkest")) td.art = readRecords(dataDir, rel);
  }
  for (const m of idx.monsters.values()) m.tiers.sort((a, b) => a.tier.localeCompare(b.tier));

  for (const rel of files) {
    if (!rel.startsWith("heroes/")) continue;
    const parts = rel.split("/");
    if (parts.length < 3) continue;
    const id = parts[1];
    const fname = parts[parts.length - 1];
    if (!fname.startsWith(id + ".")) continue;
    let def = idx.heroes.get(id);
    if (!def) {
      def = { id, dir: `heroes/${id}`, info: [], art: [] };
      idx.heroes.set(id, def);
    }
    if (fname === `${id}.info.darkest`) def.info = readRecords(dataDir, rel);
    else if (fname === `${id}.art.darkest`) def.art = readRecords(dataDir, rel);
  }

  for (const rel of files) {
    if (rel.startsWith("trinkets/") && rel.includes(".entries.trinkets.json")) {
      const obj = readJson(dataDir, rel) as { entries?: Record<string, unknown>[] } | undefined;
      for (const e of obj?.entries ?? []) {
        if (typeof e["id"] === "string") {
          idx.trinkets.push({ id: e["id"], file: rel, raw: e });
        }
      }
    } else if (rel.startsWith("raid/ai/") && rel.endsWith(".json")) {
      const obj = readJson(dataDir, rel);
      const arr: Record<string, unknown>[] = [];
      collectArraysDeep(obj, (o) => typeof o["id"] === "string" && "skill_selection_desires" in o, arr);
      for (const b of arr) idx.brains.set(b["id"] as string, { id: b["id"] as string, raw: b });
    } else if (rel.startsWith("loot/") && rel.endsWith(".json")) {
      const obj = readJson(dataDir, rel);
      const arr: Record<string, unknown>[] = [];
      collectArraysDeep(obj, (o) => typeof o["id"] === "string" && "entries" in o, arr);
      for (const t of arr) idx.loot.push({ id: t["id"] as string, file: rel, raw: t });
    } else if (rel.startsWith("upgrades/") && rel.endsWith(".json")) {
      const obj = readJson(dataDir, rel) as { trees?: Record<string, unknown>[] } | undefined;
      for (const t of obj?.trees ?? []) {
        if (typeof t["id"] === "string") {
          idx.upgradeTrees.push({ id: t["id"], file: rel, raw: t });
        }
      }
    } else if (rel.endsWith(".effects.darkest")) {
      // 效果定义不止 effects/ 根目录:DLC 在 dlc/*/effects/ 与 dlc/*/features/*/effects/,
      // 且游戏用 .name 命名(如 "Push 2A"),.id 仅少数 mode 文件使用
      for (const r of readRecords(dataDir, rel)) {
        const id = String(r.params["name"] ?? r.params["id"] ?? "");
        if (!id) continue;
        let def = idx.effects.get(id);
        if (!def) {
          def = { id, file: rel, records: [] };
          idx.effects.set(id, def);
        }
        def.records.push(r);
      }
    }
  }

  return idx;
}
