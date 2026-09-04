/* 怪物元信息覆盖层(消费端装饰,不改 darkest_mcp 数据本体):
 * - 首领分类:参考 dist 参考资料的分组(特殊/基本/庭院/农庄/极暗),未列出的按普通敌人处理
 * - 召唤关系:来自游戏 effects/*.darkest 的 .summon_monsters 全量扫描,双向链接由此推导
 * - 改名/区域修正:血肉四部件与男爵卵蛋在游戏内多档共用 ID,按战斗形态区分 */
export type BossCat = "special" | "basic" | "courtyard" | "farm" | "darkest";

export interface MonsterMeta {
  bossCat?: BossCat;
  summons?: string[];
  name?: { zh: string; en: string };
  regions?: string[];
}

export const BOSS_CATS: Array<{ id: BossCat; zh: string; en: string }> = [
  { id: "special", zh: "特殊", en: "Special" },
  { id: "basic", zh: "基本", en: "Basic" },
  { id: "courtyard", zh: "庭院", en: "Courtyard" },
  { id: "farm", zh: "农庄", en: "Farmstead" },
  { id: "darkest", zh: "极暗", en: "Darkest" },
];

export function bossCatZh(id: BossCat): string {
  return BOSS_CATS.find((c) => c.id === id)?.zh ?? id;
}

/** 非怪物与重复实体:不进图鉴(数据仍在 public/data,deep link 不再可达)
 * - corpse*:战斗尸体道具,无技能无数值,参考资料亦不收录
 * - seedling_grey/purple/red/yellow:五色种苗数值完全相同,仅保留黑色一种(同 dist「仅展示一种」)
 * - drowned_anchored:拉绳手抓握英雄后的状态体(无技能),由 drowned_anchor 覆盖
 * - com_*:CC 复制变体,D 档数值与本体现有 C 档完全一致(纯 ID 复制) */
export const HIDDEN_MONSTERS: ReadonlySet<string> = new Set([
  "corpse", "corpse_large",
  "seedling_grey", "seedling_purple", "seedling_red", "seedling_yellow",
  "drowned_anchored",
  "com_bulrush", "com_cattail", "com_crocodile",
]);

/** 召唤者 → 被召唤物(游戏效果原文:NecroSummon / Collect Call / Summon Aquatic 等) */
const SUMMONS: Record<string, string[]> = {
  necromancer: ["skeleton_common", "skeleton_militia", "skeleton_defender", "skeleton_captain"],
  skeleton_bearer: ["skeleton_common", "skeleton_militia"],
  siren: ["jellyfish", "fishman_harpoon", "octotank"],
  collector: ["collector_battle", "collector_protect", "collector_shaman"],
  shambler: ["shambler_tentacle"],
  thing: ["corpse_crystal"],
  cyst: ["cell_white"],
  miller: ["farmer", "scarecrow", "revenant"],
  brigand_cannon: ["brigand_fusilier", "brigand_cutthroat", "brigand_blood", "brigand_fuseman"],
  brigand_sapper: ["brigand_barrel", "brigand_raider"],
  ancestor_small: ["ancestor_perfect", "ancestor_flawed", "ancestor_nebula"],
  shuffler: ["cultist_shrouded", "totem_guard"],
  virago_hateful: ["virago_shroom"],
  castellan: ["sycophant"],
  baron: ["curtain"],
  drowned_captain: ["drowned_anchor"],
  ectoplasm: ["ectoplasm_large"],
  ectoplasm_large: ["ectoplasm"],
  spire: ["sprout"],
};

const BOSSES: Record<BossCat, string[]> = {
  special: [
    "collector", "collector_battle", "collector_protect", "collector_shaman",
    "shambler", "shambler_tentacle", "thing", "crow", "nest",
    "brigand_sapper", "brigand_barrel", "brigand_raider", "brigand_hunter",
    "fanatic", "pyre_empty", "pyre_full",
  ],
  basic: [
    "necromancer", "prophet", "pew_small", "pew_medium", "pew_large",
    "hag", "cauldron_empty", "cauldron_full",
    "brigand_cannon", "brigand_fuseman",
    "swine_prince", "swine_piglet",
    "formless_weak", "formless_melee", "formless_ranged", "formless_guard",
    "siren", "drowned_captain", "drowned_anchor", "drowned_anchored",
  ],
  courtyard: [
    "crocodile", "com_crocodile", "baron", "curtain",
    "viscount", "body_average", "body_bloated", "body_emaciated",
    "countess", "statue_head", "statue_hand", "statue_shield",
    "com_bulrush", "com_cattail",
  ],
  farm: [
    "miller", "cocoon", "corpse_crystal", "sprout", "spire",
    "seedling_black", "seedling_grey", "seedling_purple", "seedling_red", "seedling_yellow",
    "seed_black", "seed_grey", "seed_purple", "seed_red", "seed_yellow",
    "galaxy",
  ],
  darkest: [
    "ancestor_small", "ancestor_big", "ancestor_flawed", "ancestor_nebula", "ancestor_perfect",
    "ancestor_pod", "ancestor_heart", "shuffler", "templar_melee_mb", "templar_ranged_mb", "cyst",
  ],
};

const META: Record<string, MonsterMeta> = {};
for (const [cat, ids] of Object.entries(BOSSES) as Array<[BossCat, string[]]>) {
  for (const id of ids) META[id] = { ...META[id], bossCat: cat };
}
for (const [id, summons] of Object.entries(SUMMONS)) {
  META[id] = { ...META[id], summons };
}
Object.assign(META, {
  // 血肉 boss 四部件(游戏 ID 同名「未成之血肉」,按战斗技能区分:治疗=心 / 生吞=头 / 畸变突袭=臀 / 骨椎=骨)
  formless_weak: { ...META.formless_weak, name: { zh: "血肉之心", en: "Flesh Heart" } },
  formless_melee: { ...META.formless_melee, name: { zh: "血肉之头", en: "Flesh Head" } },
  formless_ranged: { ...META.formless_ranged, name: { zh: "血肉之臀", en: "Flesh Butt" } },
  formless_guard: { ...META.formless_guard, name: { zh: "血肉之骨", en: "Flesh Bone" } },
  // 男爵战斗实体(A-C 档为开发残留未使用,E/F 档为卵蛋本体)
  curtain: { ...META.curtain, name: { zh: "颤动的卵蛋", en: "Pulsating Egg" } },
  // 狂信者木桩的空 / 满两状态(满=绑着英雄,18 点血可打碎救人),沿用官方「大锅(空/满)」命名惯例
  pyre_empty: { ...META.pyre_empty, name: { zh: "木桩(空)", en: "Pyre (Empty)" } },
  pyre_full: { ...META.pyre_full, name: { zh: "木桩(满)", en: "Pyre (Full)" } },
  // 先祖两种形态:极暗Ⅰ的召唤幻象人形 / 极暗Ⅳ的触手真身
  ancestor_small: { ...META.ancestor_small, name: { zh: "先祖 · 人形", en: "Ancestor (Human form)" } },
  ancestor_big: { ...META.ancestor_big, name: { zh: "先祖 · 触手", en: "Ancestor (Tentacled form)" } },
  // 索引区域扫描为空的普通怪,按实际所属副本归位
  gatekeeper: { ...META.gatekeeper, regions: ["farmstead"] },
  revenant: { ...META.revenant, regions: ["farmstead"] },
  scarecrow: { ...META.scarecrow, regions: ["farmstead"] },
  foreman: { ...META.foreman, regions: ["farmstead"] },
  virago_shroom: { ...META.virago_shroom, regions: ["weald"] },
});

export function metaOf(id: string): MonsterMeta | undefined {
  return META[id];
}

/** 被召唤物 → 召唤者(反向索引) */
const BY: Record<string, string[]> = {};
for (const [from, ids] of Object.entries(SUMMONS)) {
  for (const to of ids) (BY[to] ??= []).push(from);
}

export function summonedByOf(id: string): string[] {
  return BY[id] ?? [];
}
