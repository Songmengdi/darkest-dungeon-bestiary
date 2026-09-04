/**
 * wiki 贴图接入:读取 enemies.json(自 darkestdungeon.fandom.com 整理),
 * 把 images/*.png 匹配到怪物内部 id。
 *
 * 匹配顺序:
 *   1) OVERRIDES 手动别名表(游戏英文名与 wiki 名不一致的 / 多部件怪共享一图的)
 *   2) 按官方英文名归一化后自动匹配
 *   3) 匹配不到 → 无图(前端显示占位符,绝不用旧拼贴假图)
 */
import fs from "node:fs";
import path from "node:path";

interface WikiEntry {
  name: string;
  category: string;
  image: string;
  wiki: string | null;
}

/** 手动别名表:id → images/ 下的相对路径 */
const OVERRIDES: Record<string, string> = {
  // —— 游戏英文名 ≠ wiki 名 ——
  necromancer: "images/necromancer.png", // 游戏名 "Necromancer Apprentice"
  hag: "images/hag.png", // "Wizened Hag"
  crow: "images/the-shrieker.png", // "Callous Shrieker"
  drowned_captain: "images/drowned-crew.png", // "Sodden Crew"
  drowned_anchor: "images/drowned-anchorman.png", // "Drowned Puller"(wiki 名 Drowned Anchorman)
  drowned_anchored: "images/drowned-anchorman.png",
  shambler_tentacle: "images/shambler-tentacle.png", // "Shambler Sycophant"
  snake_big_adder: "images/adder.png", // "Death Adder"
  brigand_cannon: "images/brigand-pounder.png", // 游戏名 "Brigand 8-Pounder"
  curtain: "images/pulsating-egg.png", // 战斗档位(E/F)为"颤动的卵蛋",A-C 为未使用残留
  // —— 农场五色畸变:wiki 无图,取自 dist 参考资料包(按技能效果配对颜色) ——
  seed_black: "public/codex/img/Cultist-Crystal-finished-aberration-1.webp", // 恐惧 + 治疗削减
  seed_grey: "public/codex/img/Cultist-Crystal-finished-aberration-2.webp", // 守护
  seed_purple: "public/codex/img/Cultist-Crystal-finished-aberration-3.webp", // 眩晕
  seed_red: "public/codex/img/Cultist-Crystal-finished-aberration-4.webp", // 攻击回血
  seed_yellow: "public/codex/img/Cultist-Crystal-finished-aberration-5.webp", // 腐蚀
  // 五色种苗同形异色,参考资料仅收录一图,共用
  seedling_black: "public/codex/img/Cultist-Seedling_black.webp",
  seedling_grey: "public/codex/img/Cultist-Seedling_black.webp",
  seedling_purple: "public/codex/img/Cultist-Seedling_black.webp",
  seedling_red: "public/codex/img/Cultist-Seedling_black.webp",
  seedling_yellow: "public/codex/img/Cultist-Seedling_black.webp",
  sprout: "public/codex/img/Cultist-Crystal-focus-point.webp",
  // —— 多部件怪共享一张完整图 ——
  formless_guard: "images/flesh.png", // 血肉怪四部件共用
  formless_melee: "images/flesh.png",
  formless_ranged: "images/flesh.png",
  formless_weak: "images/flesh.png",
  cauldron_full: "images/cauldron.png",
  cauldron_empty: "images/cauldron.png",
  // —— 多形态家族(目检分配;置信度见 WIKI-IMAGE-MAPPING.md) ——
  ancestor_small: "images/ancestor.png", // 人形形态
  ancestor_big: "images/ancestor-2.png", // 触手形态
  collector: "images/the-collector.png",
  collector_battle: "images/the-collector-2.png", // 三个"被收集者"头之间具体对应为推测
  collector_protect: "images/the-collector-3.png",
  collector_shaman: "images/the-collector-4.png",
  prophet: "images/prophet.png",
  pew_small: "images/prophet-2.png", // Dashed Pew(最小残块)
  pew_medium: "images/prophet-3.png", // Fractured Pew
  pew_large: "images/prophet-4.png", // Pew Blockade(路障)
  fanatic: "images/the-fanatic.png",
  pyre_full: "images/the-fanatic-2.png",
  pyre_empty: "images/the-fanatic-2.png", // 同一柴堆,未点燃态无独立图
  statue_head: "images/garden-guardian.png", // 花园守卫本体(完整石像)
  statue_hand: "images/garden-guardian-2.png", // Blood Fount
  statue_shield: "images/garden-guardian-3.png", // Stone Shield
  body_average: "images/emaciated-body-2.png", // "Body"(推测)
  body_bloated: "images/emaciated-body-3.png", // "Bloodstuffed Body"(推测)
  spire: "images/fracture.png", // Fracture 本体
};

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/['’.,]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export interface WikiIndex {
  /** 归一化英文名 → 图片相对路径(同名取第一条) */
  byNorm: Map<string, string>;
  /** 归一化名 → 用到的条目数(用于报告) */
  hitCount: Map<string, number>;
  all: WikiEntry[];
}

export function loadWikiIndex(repoRoot: string): WikiIndex {
  const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, "enemies.json"), "utf8")) as {
    enemies: WikiEntry[];
  };
  const byNorm = new Map<string, string>();
  const hitCount = new Map<string, number>();
  const all: WikiEntry[] = [];
  for (const e of raw.enemies) {
    all.push(e);
    const img = path.posix.normalize(e.image);
    if (!fs.existsSync(path.join(repoRoot, img))) continue;
    const k = normalizeName(e.name);
    if (!byNorm.has(k)) byNorm.set(k, img);
    hitCount.set(k, 0);
  }
  return { byNorm, hitCount, all };
}

export interface ImageResolution {
  src: string; // images/ 下的源文件
  how: "override" | "name";
}

/** 解析一个怪物的贴图;返回 null 表示无图。 */
export function resolveImage(id: string, enName: string | undefined, wiki: WikiIndex): ImageResolution | null {
  const ov = OVERRIDES[id];
  if (ov && fs.existsSync(path.join(process.cwd(), ov))) {
    return { src: ov, how: "override" };
  }
  if (enName) {
    const k = normalizeName(enName);
    const hit = wiki.byNorm.get(k);
    if (hit) {
      wiki.hitCount.set(k, (wiki.hitCount.get(k) ?? 0) + 1);
      return { src: hit, how: "name" };
    }
  }
  return null;
}
