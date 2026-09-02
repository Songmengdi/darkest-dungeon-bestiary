/** 探针:解析一个怪物的 .skel 并渲染 setup pose,输出 png 供人工目检。 */
import fs from "node:fs";
import path from "node:path";
import { resolveGame } from "../lib/config.ts";
import { parseSkeleton } from "../lib/spine21.ts";
import { parseAtlas, renderSkeleton } from "../lib/spine21.ts";
import { decodePng, encodePng, trimImage } from "../lib/png.ts";

const game = resolveGame();
const id = process.argv[2] ?? "skeleton_courtier";
const animDir = path.join(game.dataDir, "monsters", id, "anim");
const skelPath = path.join(animDir, `${id}.sprite.combat.skel`);
const atlasPath = path.join(animDir, `${id}.sprite.combat.atlas`);
const pngPath = path.join(animDir, `${id}.sprite.combat.png`);

const skel = parseSkeleton(fs.readFileSync(skelPath));
console.log(`version: ${skel.version}`);
console.log(`bones(${skel.bones.length}): ${skel.bones.map((b) => b.name).join(", ")}`);
console.log(`slots(${skel.slots.length}): ${skel.slots.map((s) => s.name).join(", ")}`);
console.log(`skins: ${skel.skins.map((s) => `${s.name}(${s.regions.length})`).join(", ")}`);

const { regions } = parseAtlas(atlasPath);
const page = decodePng(fs.readFileSync(pngPath));
const out = renderSkeleton(skel, page, regions, { maxHeight: 420, maxWidth: 420 });
if (!out) {
  console.log("渲染失败:无附件");
  process.exit(1);
}
const trimmed = trimImage(out) ?? out;
const outPath = path.join("..", "public", `probe_${id}.png`);
fs.writeFileSync(path.join(ROOT_DIR(), outPath), encodePng(trimmed));
console.log(`已输出: public/probe_${id}.png (${trimmed.width}x${trimmed.height})`);

function ROOT_DIR(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}
