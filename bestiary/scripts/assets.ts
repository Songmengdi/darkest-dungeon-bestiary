/**
 * bestiary 资产管线(纯文件操作,零游戏知识):
 * 1) 读 public/data/index.json(由 darkest_mcp `npm run export` 产出的入库数据);
 * 2) wiki 贴图接入:enemies.json + images/ → public/img/<id>.png(无匹配则无图);
 * 3) 把 image 路径回写进 index.json(消费端装饰字段)。
 * 数据本体(怪物 JSON/索引)永远来自 darkest_mcp 导出,本脚本不生成、不修改任何数据语义。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWikiIndex, resolveImage } from "../lib/wikiImages.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const IMG_DIR = path.join(ROOT, "public", "img");

interface IndexEntry {
  id: string;
  name: { zh?: string; en?: string };
  image?: string;
  [k: string]: unknown;
}

const indexPath = path.join(DATA_DIR, "index.json");
if (!fs.existsSync(indexPath)) {
  console.error(`缺少 ${indexPath} —— 请先在 darkest_mcp 运行 npm run export 产出图鉴数据。`);
  process.exit(1);
}
const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as { monsters: IndexEntry[] };

// 贴图目录整体清空重建:只保留 wiki 正图
fs.rmSync(IMG_DIR, { recursive: true, force: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const wiki = loadWikiIndex(ROOT);
let imgOverride = 0;
let imgByName = 0;
let imgNone = 0;
const usedWikiImages = new Set<string>();
for (const entry of index.monsters) {
  const hit = resolveImage(entry.id, entry.name?.en, wiki);
  if (!hit) {
    imgNone++;
    continue;
  }
  fs.copyFileSync(path.join(ROOT, hit.src), path.join(IMG_DIR, `${entry.id}.png`));
  entry.image = `img/${entry.id}.png`;
  usedWikiImages.add(hit.src);
  if (hit.how === "override") imgOverride++;
  else imgByName++;
}
const unusedWiki = [...new Set(wiki.all.map((e) => e.image))].filter((img) => !usedWikiImages.has(img));
console.log(`wiki 贴图: 别名表命中 ${imgOverride},名称匹配 ${imgByName},无图怪物 ${imgNone},未用 wiki 图 ${unusedWiki.length}`);
if (unusedWiki.length) console.log(`  未使用: ${unusedWiki.join(", ")}`);

fs.writeFileSync(indexPath, JSON.stringify(index, null, 1), "utf8");
console.log(`完成: ${index.monsters.length} 个怪物,wiki 贴图 ${imgOverride + imgByName} 张 -> public/`);
