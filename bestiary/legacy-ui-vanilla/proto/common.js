/* ============================================================
 * PROTOTYPE —— 图鉴 UI 风格试验 · 共享假数据与工具(用完即弃)
 * 问题:图鉴类 UI 应该长什么样?三套结构性变体见 variant-a/b/c
 * 数据为演示用假数据,结构对齐真实 index.json / monsters/<id>.json;
 * 贴图引用真实立绘 public/img/<id>.png(corpse 故意无图,演示占位符)。
 * ============================================================ */
"use strict";

window.PROTO = (() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- 语言(默认中文;可切换,仅内存态) ---------- */
  let lang = "zh";
  const t = (zh, en) => (lang === "zh" ? zh : (en ?? zh));

  /* ---------- 分类骨架(参照 wiki 标签页,数据问题后续再解) ---------- */
  const GROUPS = [
    { id: "common",    zh: "常见的",       en: "Common" },
    { id: "crypts",    zh: "遗迹特有",     en: "Ruins" },
    { id: "warrens",   zh: "沃伦斯专属",   en: "Warrens" },
    { id: "weald",     zh: "威德特有",     en: "Weald" },
    { id: "cove",      zh: "海湾特有",     en: "Cove" },
    { id: "courtyard", zh: "庭院专属",     en: "Courtyard" },
    { id: "farmstead", zh: "农场",         en: "Farmstead" },
    { id: "boss",      zh: "首领",         en: "Bosses" },
    { id: "special",   zh: "召唤物 / 部件", en: "Summons" },
  ];
  const REGIONS = {
    crypts: { zh: "遗迹", en: "Ruins" }, warrens: { zh: "沃伦斯", en: "Warrens" },
    weald: { zh: "威德", en: "Weald" }, cove: { zh: "海湾", en: "Cove" },
    courtyard: { zh: "庭院", en: "Courtyard" }, farmstead: { zh: "农场", en: "Farmstead" },
    town: { zh: "城镇", en: "Town" }, darkestdungeon: { zh: "极暗地牢", en: "Darkest Dungeon" },
  };

  /* ---------- 假怪物数据(数值均非真实,仅演示) ---------- */
  const tierLabel = (k) => ({ A: ["学徒", "Apprentice"], B: ["精锐", "Veteran"], C: ["冠军", "Champion"], D: ["极暗", "Darkest"], E: ["周本", "Weekly"], F: ["无尽", "Endless"] }[k] ?? [k, k]);

  const M = [
    {
      id: "skeleton_common", group: "common",
      name: { zh: "骸骨暴民", en: "Bone Rabble" },
      type: { id: "unholy", zh: "邪秽", en: "Unholy" },
      size: 1, image: "img/skeleton_common.png", regions: ["crypts", "warrens", "town"],
      ability: { zh: "摇摇欲坠(死亡时碎裂)", en: "Falls apart" },
      lore: { zh: "从浅坟里爬出来的枯骨,连剑都握不稳,却从不疲倦。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 1,
        stats: { hp: 10 + k.charCodeAt(0) % 3 * 4, def: 5, prot: 0, spd: 2, res: { stun: "25%", poison: "40%", bleed: "20%", debuff: "10%", move: "20%" } },
        enemyType: { id: "unholy", zh: "邪秽" },
        skills: [
          { id: "slash", name: { zh: "挥砍", en: "Slash" }, type: "melee", atk: 82.5 + (k === "C" ? 12 : 0), dmg: "100%", crit: "2%", launch: [1, 2], target: [1, 2], effects: [] },
          { id: "boneshard", name: { zh: "骨片投掷", en: "Bone Shard" }, type: "ranged", atk: 72.5, dmg: "75%", crit: "1%", launch: [3, 4], target: [2, 3], effects: ["Bleed 1"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }, { pct: "25%", name: "宝石", cls: "gem" }],
        brain: { skillDesires: [{ skill: "slash", chance: 3 }, { type: "random_skill", chance: 1 }] },
      })),
    },
    {
      id: "skeleton_courtier", group: "crypts",
      name: { zh: "骸骨官僚", en: "Bone Courtier" },
      type: { id: "unholy", zh: "邪秽", en: "Unholy" },
      size: 1, image: "img/skeleton_courtier.png", regions: ["crypts", "town"],
      ability: { zh: "刺耳祝酒(压力爆发)", en: "Stress strike" },
      lore: { zh: "生前宴饮无度,死后仍举着永远斟不满的酒杯。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 14, def: 0, prot: 0, spd: 4, res: { stun: "20%", poison: "40%", bleed: "20%", debuff: "10%", move: "20%" } },
        enemyType: { id: "unholy", zh: "邪秽" },
        skills: [
          { id: "gaze", name: { zh: "恫吓目光", en: "Dreadful Gaze" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [3, 4], effects: ["Stress +10"] },
          { id: "boo", name: { zh: "嘲讽祝酒", en: "Boiling Brew" }, type: "ranged", atk: 72.5, dmg: "50%", crit: "1%", launch: [3, 4], target: [1, 2, 3, 4], effects: ["Minor Debuff"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "gaze", chance: 4 }, { skill: "boo", chance: 1 }] },
      }],
    },
    {
      id: "skeleton_arbalist", group: "crypts",
      name: { zh: "骸骨弩手", en: "Bone Arbalist" },
      type: { id: "unholy", zh: "邪秽", en: "Unholy" },
      size: 1, image: "img/skeleton_arbalist.png", regions: ["crypts", "town"],
      ability: { zh: "贯穿齐射", en: "Pierce" },
      lore: { zh: "弓弦早已朽烂,可它的弩依然指着你。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 17, def: 0, prot: 0, spd: 2, res: { stun: "20%", poison: "40%", bleed: "20%", debuff: "10%", move: "20%" } },
        enemyType: { id: "unholy", zh: "邪秽" },
        skills: [
          { id: "volley", name: { zh: "贯体重弩", en: "Body Piercer" }, type: "ranged", atk: 92.5, dmg: "125%", crit: "6%", launch: [3, 4], target: [2, 3], effects: [] },
          { id: "reload", name: { zh: "绞盘上弦", en: "Crank Up" }, type: "buff", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Self: +DMG Buff"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "volley", chance: 4 }] },
      }],
    },
    {
      id: "necromancer", group: "boss", bossRegion: "crypts",
      name: { zh: "死灵法师", en: "Necromancer" },
      type: { id: "unholy", zh: "邪秽", en: "Unholy" },
      size: 2, image: "img/necromancer.png", regions: ["crypts"],
      ability: { zh: "不断召唤骸骨", en: "Summons skeletons" },
      lore: { zh: "他切开坟墓的缝隙,把死亡当作军队来挥霍。", en: "" },
      deathClass: "corpse_large",
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 2,
        stats: { hp: 33 + k.charCodeAt(0) % 3 * 15, def: 10, prot: 10, spd: 0, res: { stun: "40%", poison: "60%", bleed: "20%", debuff: "60%", move: "40%" } },
        enemyType: { id: "boss", zh: "首领" },
        skills: [
          { id: "reap", name: { zh: "收割", en: "Reaping Stroke" }, type: "melee", atk: 82.5, dmg: "100%", crit: "0%", launch: [1, 2], target: [1, 2], effects: [] },
          { id: "summon", name: { zh: "亡者征募", en: "Hands from the Grave" }, type: "summon", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Summon Skeleton ×2"] },
          { id: "spellslice", name: { zh: "法刃", en: "Blade Scalpel" }, type: "ranged", atk: 102.5, dmg: "75%", crit: "2%", launch: [3, 4], target: [3, 4], effects: ["Bleed 2"] },
        ],
        loot: [{ pct: "100%", name: "传家宝 ×2", cls: "heirloom" }, { pct: "100%", name: "金冠", cls: "gem" }],
        brain: { skillDesires: [{ skill: "summon", chance: 3 }, { skill: "reap", chance: 2 }] },
      })),
    },
    {
      id: "maggot", group: "common",
      name: { zh: "蛆虫", en: "Maggot" },
      type: { id: "beast", zh: "野兽", en: "Beast" },
      size: 1, image: "img/maggot.png", regions: ["crypts", "weald", "warrens"],
      ability: { zh: "恶心蠕动", en: "Revolting" },
      lore: { zh: "它在所有腐烂的东西里都能安家——包括你。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 8, def: 0, prot: 0, spd: 5, res: { stun: "20%", poison: "80%", bleed: "20%", debuff: "20%", move: "20%" } },
        enemyType: { id: "beast", zh: "野兽" },
        skills: [{ id: "bite", name: { zh: "啃咬", en: "Gnaw" }, type: "melee", atk: 67.5, dmg: "75%", crit: "0%", launch: [1, 2], target: [1], effects: [] }],
        loot: [{ pct: "20%", name: "食物", cls: "pack" }],
        brain: null,
      }],
    },
    {
      id: "spider_webber", group: "common",
      name: { zh: "结网蛛", en: "Webber" },
      type: { id: "beast", zh: "野兽", en: "Beast" },
      size: 1, image: "img/spider_webber.png", regions: ["crypts", "weald", "warrens"],
      ability: { zh: "结网缠身", en: "Webs" },
      lore: { zh: "八只眼睛映着烛火,像一群小小的月亮。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 9, def: 0, prot: 0, spd: 6, res: { stun: "10%", poison: "40%", bleed: "60%", debuff: "10%", move: "40%" } },
        enemyType: { id: "beast", zh: "野兽" },
        skills: [
          { id: "web", name: { zh: "喷网", en: "Latch On" }, type: "ranged", atk: 77.5, dmg: "50%", crit: "0%", launch: [2, 3], target: [1, 2, 3], effects: ["Move -1", "Debuff SPD"] },
          { id: "bite", name: { zh: "毒噬", en: "Bite" }, type: "melee", atk: 82.5, dmg: "75%", crit: "2%", launch: [1, 2], target: [1], effects: ["Blight 2"] },
        ],
        loot: [],
        brain: null,
      }],
    },
    {
      id: "swine_reaver", group: "warrens",
      name: { zh: "猪人切割者", en: "Swine Chopper" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 1, image: "img/swine_reaver.png", regions: ["warrens"],
      ability: { zh: "血腥突进", en: "Cleaving charge" },
      lore: { zh: "屠刀与獠牙,哪个先落下全看心情。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 26, def: 0, prot: 10, spd: 1, res: { stun: "20%", poison: "40%", bleed: "80%", debuff: "20%", move: "20%" } },
        enemyType: { id: "man", zh: "人类" },
        skills: [
          { id: "cleave", name: { zh: "劈砍", en: "Cleave" }, type: "melee", atk: 82.5, dmg: "100%", crit: "0%", launch: [1, 2], target: [1, 2], effects: ["Bleed 1"] },
          { id: "charge", name: { zh: "冲锋", en: "Charge" }, type: "melee", atk: 92.5, dmg: "125%", crit: "3%", launch: [2, 3], target: [1, 2], effects: ["Self Move +2"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "charge", chance: 2 }, { skill: "cleave", chance: 2 }] },
      }],
    },
    {
      id: "swine_drummer", group: "warrens",
      name: { zh: "猪人鼓手", en: "Swine Drummer" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 1, image: "img/swine_drummer.png", regions: ["warrens"],
      ability: { zh: "战鼓增益同伴", en: "Drums of war" },
      lore: { zh: "鼓点越密,猪群越疯。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 20, def: 0, prot: 0, spd: 3, res: { stun: "40%", poison: "20%", bleed: "40%", debuff: "40%", move: "40%" } },
        enemyType: { id: "man", zh: "人类" },
        skills: [
          { id: "drum", name: { zh: "催战鼓", en: "Battle Drums" }, type: "buff", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Allies: +DMG Buff"] },
          { id: "squeal", name: { zh: "刺耳尖叫", en: "Squeal" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [1, 2, 3, 4], effects: ["Minor Stress"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "drum", chance: 3 }] },
      }],
    },
    {
      id: "swine_prince", group: "boss", bossRegion: "warrens",
      name: { zh: "猪人王子", en: "Swine Prince" },
      type: { id: "beast", zh: "野兽", en: "Beast" },
      size: 3, image: "img/swine_prince.png", regions: ["warrens"],
      ability: { zh: "随威尔伯的标记而狂暴", en: "Enraged by Wilbur's marks" },
      lore: { zh: "王冠早已锈死在獠牙之上,它记得的只有仇恨。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 3,
        stats: { hp: 65 + k.charCodeAt(0) % 3 * 25, def: 0, prot: 12, spd: 0, res: { stun: "60%", poison: "80%", bleed: "20%", debuff: "40%", move: "100%" } },
        enemyType: { id: "boss", zh: "首领" },
        skills: [
          { id: "obrubl", name: { zh: "橡木棒横扫", en: "Obliterate Body" }, type: "melee", atk: 92.5, dmg: "218%", crit: "0%", launch: [1], target: [1, 2, 3], effects: [] },
          { id: "confess", name: { zh: "忏悔重击", en: "Confession" }, type: "melee", atk: 102.5, dmg: "138%", crit: "0%", launch: [1], target: [1, 2, 3, 4], effects: ["vs Marked +200% DMG"] },
        ],
        loot: [{ pct: "100%", name: "传家宝 ×3", cls: "heirloom" }, { pct: "50%", name: "裸钢颈饰", cls: "trinket" }],
        brain: { skillDesires: [{ skill: "obrubl", chance: 4 }] },
      })),
    },
    {
      id: "virago_hateful", group: "weald",
      name: { zh: "林中恶妇", en: "Hateful Virago" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 1, image: "img/virago_hateful.png", regions: ["weald"],
      ability: { zh: "怨毒咒骂", en: "Hateful curses" },
      lore: { zh: "林子听久了咒骂,也学会了还嘴。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 18, def: 10, prot: 0, spd: 5, res: { stun: "20%", poison: "20%", bleed: "20%", debuff: "40%", move: "40%" } },
        enemyType: { id: "man", zh: "人类" },
        skills: [
          { id: "hex", name: { zh: "怨咒", en: "Hex" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [2, 3], effects: ["Major Debuff", "Mark"] },
          { id: "scratch", name: { zh: "抓挠", en: "Claw" }, type: "melee", atk: 77.5, dmg: "75%", crit: "2%", launch: [1, 2], target: [1, 2], effects: ["Bleed 1"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "hex", chance: 3 }] },
      }],
    },
    {
      id: "unclean_giant", group: "weald",
      name: { zh: "不洁巨人", en: "Unclean Giant" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 2, image: "img/unclean_giant.png", regions: ["weald", "cove"],
      ability: { zh: "呕吐毒雾", en: "Bile vomit" },
      lore: { zh: "他曾是护林人,如今林子绕着他走。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 2,
        stats: { hp: 47, def: 0, prot: 10, spd: 0, res: { stun: "40%", poison: "80%", bleed: "60%", debuff: "40%", move: "100%" } },
        enemyType: { id: "man", zh: "人类" },
        skills: [
          { id: "club", name: { zh: "树干挥击", en: "Crush" }, type: "melee", atk: 82.5, dmg: "150%", crit: "0%", launch: [1, 2], target: [1, 2], effects: ["Stun"] },
          { id: "bile", name: { zh: "喷吐胆汁", en: "Bile Spray" }, type: "ranged", atk: 72.5, dmg: "100%", crit: "0%", launch: [1, 2], target: [2, 3, 4], effects: ["Blight 3"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "bile", chance: 2 }, { skill: "club", chance: 2 }] },
      }],
    },
    {
      id: "hag", group: "boss", bossRegion: "weald",
      name: { zh: "巫媪", en: "Hag" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 3, image: "img/hag.png", regions: ["weald"],
      ability: { zh: "把英雄扔进大锅", en: "Throws heroes into the cauldron" },
      lore: { zh: "她的汤永远差一味——你。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 3,
        stats: { hp: 40 + k.charCodeAt(0) % 3 * 15, def: 10, prot: 0, spd: 8, res: { stun: "40%", poison: "60%", bleed: "20%", debuff: "40%", move: "100%" } },
        enemyType: { id: "boss", zh: "首领" },
        skills: [
          { id: "into_pot", name: { zh: "入锅", en: "Into the Pot!" }, type: "ranged", atk: 112.5, dmg: "—", crit: "0%", launch: [3], target: [1, 2, 3, 4], effects: ["Throw: 目标被投入锅中"] },
          { id: "season", name: { zh: "加料搅拌", en: "Season to Taste" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [3], target: [], effects: ["Heal Self", "Blight 4(锅中目标)"] },
          { id: "chop", name: { zh: "剁切", en: "Meat Cleaver" }, type: "melee", atk: 92.5, dmg: "125%", crit: "0%", launch: [3], target: [1, 2], effects: ["Bleed 2"] },
        ],
        loot: [{ pct: "100%", name: "传家宝 ×2", cls: "heirloom" }, { pct: "100%", name: "巫媪的提灯", cls: "trinket" }],
        brain: { skillDesires: [{ skill: "into_pot", chance: 2 }, { skill: "season", chance: 2 }] },
      })),
    },
    {
      id: "fishman_harpoon", group: "cove",
      name: { zh: "深渊群居者", en: "Pelagic Grouper" },
      type: { id: "eldritch", zh: "异魔", en: "Eldritch" },
      size: 1, image: "img/fishman_harpoon.png", regions: ["cove"],
      ability: { zh: "鱼叉钉刺", en: "Harpoon" },
      lore: { zh: "海面下的祈祷词,一句也听不得。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 16, def: 10, prot: 0, spd: 2, res: { stun: "20%", poison: "40%", bleed: "120%", debuff: "20%", move: "40%" } },
        enemyType: { id: "eldritch", zh: "异魔" },
        skills: [
          { id: "spear", name: { zh: "鱼叉突刺", en: "Spear" }, type: "melee", atk: 77.5, dmg: "100%", crit: "6%", launch: [1, 2], target: [1, 2], effects: [] },
          { id: "pull", name: { zh: "拖拽", en: "Joint Toss" }, type: "ranged", atk: 67.5, dmg: "50%", crit: "0%", launch: [3, 4], target: [2, 3], effects: ["Pull +1"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "spear", chance: 3 }] },
      }],
    },
    {
      id: "fishman_shaman", group: "cove",
      name: { zh: "深渊萨满", en: "Pelagic Shaman" },
      type: { id: "eldritch", zh: "异魔", en: "Eldritch" },
      size: 1, image: "img/fishman_shaman.png", regions: ["cove"],
      ability: { zh: "治疗与腐蚀祝祷", en: "Mending & blight" },
      lore: { zh: "潮水记得每一次献祭。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 14, def: 5, prot: 0, spd: 4, res: { stun: "20%", poison: "40%", bleed: "60%", debuff: "20%", move: "40%" } },
        enemyType: { id: "eldritch", zh: "异魔" },
        skills: [
          { id: "mend", name: { zh: "深海祝愈", en: "Deep Gunwale" }, type: "heal", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Heal Ally +25%"] },
          { id: "blast", name: { zh: "盐雾爆发", en: "Kelpinfliction" }, type: "ranged", atk: 72.5, dmg: "50%", crit: "0%", launch: [3, 4], target: [1, 2, 3], effects: ["Blight 2"] },
        ],
        loot: [{ pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "blast", chance: 2 }, { skill: "mend", chance: 2 }] },
      }],
    },
    {
      id: "siren", group: "boss", bossRegion: "cove",
      name: { zh: "海妖塞壬", en: "Siren" },
      type: { id: "eldritch", zh: "异魔", en: "Eldritch" },
      size: 2, image: "img/siren.png", regions: ["cove"],
      ability: { zh: "魅惑一名英雄为你而战", en: "Charms a hero" },
      lore: { zh: "她的歌不是给你听的,是给你的剑听的。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 2,
        stats: { hp: 30 + k.charCodeAt(0) % 3 * 12, def: 10, prot: 0, spd: 8, res: { stun: "60%", poison: "40%", bleed: "60%", debuff: "40%", move: "100%" } },
        enemyType: { id: "boss", zh: "首领" },
        skills: [
          { id: "song", name: { zh: "蛊惑之歌", en: "Song of Desire" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [1, 2, 3, 4], effects: ["Charm 1(魅惑一名英雄)"] },
          { id: "tide", name: { zh: "深渊之潮", en: "Gossamer Veil" }, type: "ranged", atk: 82.5, dmg: "100%", crit: "0%", launch: [3, 4], target: [2, 3], effects: ["Blight 3"] },
          { id: "splash", name: { zh: "尾浪横扫", en: "Acaoustic Blow" }, type: "melee", atk: 92.5, dmg: "125%", crit: "3%", launch: [1, 2], target: [1, 2], effects: ["Stun"] },
        ],
        loot: [{ pct: "100%", name: "传家宝 ×2", cls: "heirloom" }, { pct: "100%", name: "塞壬的鳞梳", cls: "trinket" }],
        brain: { skillDesires: [{ skill: "song", chance: 3 }, { skill: "tide", chance: 1 }] },
      })),
    },
    {
      id: "courtesan", group: "courtyard",
      name: { zh: "舞女", en: "Courtesan" },
      type: { id: "vampire", zh: "血裔", en: "Bloodsucker" },
      size: 1, image: "img/courtesan.png", regions: ["courtyard"],
      ability: { zh: "引血之吻", en: "Blood kiss" },
      lore: { zh: "她旋转时裙摆扬起,像一朵正在打开的伤口。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 18, def: 10, prot: 0, spd: 6, res: { stun: "20%", poison: "40%", bleed: "20%", debuff: "60%", move: "40%" } },
        enemyType: { id: "vampire", zh: "血裔" },
        skills: [
          { id: "waltz", name: { zh: "血色圆舞", en: "Crimson Waltz" }, type: "melee", atk: 87.5, dmg: "100%", crit: "6%", launch: [2, 3], target: [1, 2, 3, 4], effects: ["Bleed 2"] },
          { id: "diva", name: { zh: "高傲亮相", en: "Diva's Entrance" }, type: "buff", atk: 0, dmg: "—", crit: "0%", launch: [1, 2, 3, 4], target: [], effects: ["Self: Dodge Buff", "Self Move"] },
        ],
        loot: [{ pct: "100%", name: "晶尘", cls: "crystal" }],
        brain: { skillDesires: [{ skill: "waltz", chance: 4 }] },
      }],
    },
    {
      id: "chevalier", group: "courtyard",
      name: { zh: "骑士", en: "Chevalier" },
      type: { id: "vampire", zh: "血裔", en: "Bloodsucker" },
      size: 1, image: "img/chevalier.png", regions: ["courtyard"],
      ability: { zh: "礼剑突刺", en: "Courtly thrust" },
      lore: { zh: "宫廷早已腐烂,礼仪倒是完好无损。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 24, def: 5, prot: 10, spd: 2, res: { stun: "40%", poison: "40%", bleed: "20%", debuff: "40%", move: "20%" } },
        enemyType: { id: "vampire", zh: "血裔" },
        skills: [
          { id: "thrust", name: { zh: "致意突刺", en: "Saluting Thrust" }, type: "melee", atk: 82.5, dmg: "100%", crit: "3%", launch: [1, 2], target: [1, 2], effects: [] },
          { id: "riposte", name: { zh: "还礼", en: "Riposte" }, type: "buff", atk: 0, dmg: "—", crit: "0%", launch: [1, 2], target: [], effects: ["Riposte(受击反击)"] },
        ],
        loot: [{ pct: "100%", name: "晶尘", cls: "crystal" }],
        brain: { skillDesires: [{ skill: "thrust", chance: 3 }, { skill: "riposte", chance: 1 }] },
      }],
    },
    {
      id: "baron", group: "boss", bossRegion: "courtyard",
      name: { zh: "男爵", en: "Baron" },
      type: { id: "vampire", zh: "血裔", en: "Bloodsucker" },
      size: 1, image: "img/baron.png", regions: ["courtyard"],
      ability: { zh: "吞食仆从回复生命", en: "Feeds on courtiers" },
      lore: { zh: "宴会的最后,他把杯子也一起吃了。", en: "" },
      tiers: [
        { tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1, stats: null, skills: [], loot: [], brain: null }, /* 演示:游戏内无此档数据,UI 隐藏空档 */
        {
          tier: "B", label: { zh: "精锐", en: "Veteran" }, size: 1,
          stats: { hp: 60, def: 10, prot: 0, spd: 6, res: { stun: "80%", poison: "40%", bleed: "40%", debuff: "40%", move: "80%" } },
          enemyType: { id: "boss", zh: "首领" },
          skills: [
            { id: "feast", name: { zh: "血宴", en: "The Feast" }, type: "heal", atk: 0, dmg: "—", crit: "0%", launch: [1, 2], target: [], effects: ["Devour 1(吞噬一名仆从)"] },
            { id: "gust", name: { zh: "振翅突进", en: "Gusting Flight" }, type: "melee", atk: 92.5, dmg: "125%", crit: "3%", launch: [1, 2, 3, 4], target: [1, 2, 3], effects: ["Self Move"] },
            { id: "batcloud", name: { zh: "蝠群蔽日", en: "Bat Cloud" }, type: "ranged", atk: 72.5, dmg: "50%", crit: "0%", launch: [1, 2, 3, 4], target: [1, 2, 3, 4], effects: ["Bleed 1", "Debuff ACC"] },
          ],
          loot: [{ pct: "100%", name: "晶尘 ×5", cls: "crystal" }, { pct: "100%", name: "男爵的纹章", cls: "trinket" }],
          brain: { skillDesires: [{ skill: "feast", chance: 2 }, { skill: "gust", chance: 2 }] },
        },
      ],
    },
    {
      id: "farmer", group: "farmstead",
      name: { zh: "农场工人", en: "Farmhand" },
      type: { id: "husk", zh: "穅壳性", en: "Husk" },
      size: 1, image: "img/farmer.png", regions: ["farmstead"],
      ability: { zh: "晶化增生", en: "Crystalline growth" },
      lore: { zh: "他还在等收成,尽管田里长的已经是水晶。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 16, def: 0, prot: 0, spd: 2, res: { stun: "20%", poison: "60%", bleed: "40%", debuff: "20%", move: "20%" } },
        enemyType: { id: "husk", zh: "穅壳性" },
        skills: [
          { id: "sickle", name: { zh: "镰刀收割", en: "Sickle" }, type: "melee", atk: 77.5, dmg: "75%", crit: "0%", launch: [1, 2], target: [1, 2], effects: ["Blight 1"] },
          { id: "haul", name: { zh: "肩扛投掷", en: "Haul" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [2, 3], target: [3, 4], effects: ["Throw Ally(把同伴掷向敌阵)"] },
        ],
        loot: [{ pct: "100%", name: "水晶碎屑", cls: "crystal" }],
        brain: { skillDesires: [{ skill: "sickle", chance: 4 }] },
      }],
    },
    {
      id: "miller", group: "boss", bossRegion: "farmstead",
      name: { zh: "磨坊主", en: "Miller" },
      type: { id: "unfortunate_soul", zh: "堕落灵魂", en: "Poor Soul" },
      size: 2, image: "img/miller.png", regions: ["farmstead"],
      ability: { zh: "唤起磨坊之风", en: "Calls the mill wind" },
      lore: { zh: "磨盘转了一圈又一圈,磨碎的从来不是麦子。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 2,
        stats: { hp: 45 + k.charCodeAt(0) % 3 * 20, def: 10, prot: 8, spd: 4, res: { stun: "40%", poison: "60%", bleed: "40%", debuff: "60%", move: "40%" } },
        enemyType: { id: "boss", zh: "首领" },
        skills: [
          { id: "scythe", name: { zh: "长镰横扫", en: "Scythe Sweep" }, type: "melee", atk: 92.5, dmg: "150%", crit: "0%", launch: [1, 2], target: [1, 2, 3], effects: ["Bleed 2"] },
          { id: "wind", name: { zh: "唤风", en: "Call the Wind" }, type: "summon", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Summon 沉睡使者 ×1"] },
          { id: "grind", name: { zh: "磨盘碾压", en: "The Grind" }, type: "melee", atk: 82.5, dmg: "100%", crit: "0%", launch: [1, 2], target: [1], effects: ["Stun"] },
        ],
        loot: [{ pct: "100%", name: "水晶 ×3", cls: "crystal" }, { pct: "100%", name: "磨坊主的秤", cls: "trinket" }],
        brain: { skillDesires: [{ skill: "scythe", chance: 3 }, { skill: "wind", chance: 1 }] },
      })),
    },
    {
      id: "collector", group: "boss", bossRegion: "town",
      name: { zh: "收集者", en: "The Collector" },
      type: { id: "man", zh: "人类", en: "Human" },
      size: 1, image: "img/collector.png", regions: ["crypts", "weald", "warrens", "cove"],
      ability: { zh: "召唤被收集的头颅", en: "Summons collected heads" },
      lore: { zh: "他从不空手而归——你的头骨会是很好的收藏。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 1,
        stats: { hp: 40 + k.charCodeAt(0) % 3 * 20, def: 10, prot: 0, spd: 4, res: { stun: "40%", poison: "40%", bleed: "40%", debuff: "40%", move: "40%" } },
        enemyType: { id: "unholy", zh: "邪秽" },
        skills: [
          { id: "collect", name: { zh: "征集", en: "Collect" }, type: "summon", atk: 0, dmg: "—", crit: "0%", launch: [3, 4], target: [], effects: ["Summon 被收集者 ×1"] },
          { id: "showcase", name: { zh: "陈列斩", en: "Showcase" }, type: "melee", atk: 92.5, dmg: "150%", crit: "6%", launch: [1, 2], target: [1, 2], effects: ["Bleed 2"] },
          { id: "headtoss", name: { zh: "掷颅", en: "Head Toss" }, type: "ranged", atk: 82.5, dmg: "75%", crit: "0%", launch: [3, 4], target: [3, 4], effects: ["Stress +15"] },
        ],
        loot: [{ pct: "100%", name: "头颅战利品", cls: "trinket" }, { pct: "100%", name: "传家宝", cls: "heirloom" }],
        brain: { skillDesires: [{ skill: "collect", chance: 3 }, { skill: "showcase", chance: 2 }] },
      })),
    },
    {
      id: "shambler", group: "boss", bossRegion: "town",
      name: { zh: "跋行者", en: "Shambler" },
      type: { id: "eldritch", zh: "异魔", en: "Eldritch" },
      size: 2, image: "img/shambler.png", regions: ["crypts", "weald", "warrens", "cove"],
      ability: { zh: "与队伍交换站位", en: "Swaps positions" },
      lore: { zh: "不要在火把熄灭时停下脚步。", en: "" },
      tiers: ["A", "B", "C"].map((k) => ({
        tier: k, label: { zh: tierLabel(k)[0], en: tierLabel(k)[1] }, size: 2,
        stats: { hp: 60 + k.charCodeAt(0) % 3 * 25, def: 10, prot: 10, spd: 2, res: { stun: "80%", poison: "60%", bleed: "40%", debuff: "60%", move: "100%" } },
        enemyType: { id: "eldritch", zh: "异魔" },
        skills: [
          { id: "swaps", name: { zh: "虚实互换", en: "It's After Me!" }, type: "ranged", atk: 0, dmg: "—", crit: "0%", launch: [1, 2], target: [1, 2, 3, 4], effects: ["Swap 全队换位"] },
          { id: "tongue", name: { zh: "触鞭抽打", en: "Tongue Lash" }, type: "melee", atk: 92.5, dmg: "150%", crit: "0%", launch: [1, 2], target: [1, 2], effects: ["Bleed 3"] },
          { id: "chomp", name: { zh: "巨口吞噬", en: "Chomp" }, type: "melee", atk: 102.5, dmg: "200%", crit: "0%", launch: [1, 2], target: [1], effects: [] },
        ],
        loot: [{ pct: "100%", name: "徘徊者饰品", cls: "trinket" }],
        brain: { skillDesires: [{ skill: "swaps", chance: 2 }, { skill: "tongue", chance: 2 }] },
      })),
    },
    {
      id: "collector_battle", group: "special",
      name: { zh: "被收集的强盗", en: "Collected Highwayman" },
      type: { id: "unholy", zh: "邪秽", en: "Unholy" },
      size: 1, image: "img/collector_battle.png", regions: [],
      ability: { zh: "为主人而战", en: "Fights for its collector" },
      lore: { zh: "头颅与身体被重新缝合,忠诚也随之缝合。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 14, def: 0, prot: 0, spd: 4, res: { stun: "40%", poison: "40%", bleed: "40%", debuff: "40%", move: "60%" } },
        enemyType: { id: "unholy", zh: "邪秽" },
        skills: [{ id: "pistol", name: { zh: "燧发枪击", en: "Open Wound" }, type: "ranged", atk: 82.5, dmg: "100%", crit: "6%", launch: [1, 2, 3, 4], target: [2, 3], effects: ["Bleed 2"] }],
        loot: [],
        brain: null,
      }],
    },
    {
      id: "statue_shield", group: "special",
      name: { zh: "石盾", en: "Stone Shield" },
      type: { id: "stonework", zh: "石雕", en: "Stonework" },
      size: 1, image: "img/statue_shield.png", regions: ["courtyard"],
      ability: { zh: "守护血泉之源", en: "Guards the Fount" },
      lore: { zh: "石雕不会思考,只会挡在你和它的主人之间。", en: "" },
      tiers: [{
        tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1,
        stats: { hp: 20, def: 0, prot: 75, spd: 0, res: { stun: "100%", poison: "100%", bleed: "100%", debuff: "100%", move: "100%" } },
        enemyType: { id: "stonework", zh: "石雕" },
        skills: [{ id: "guard", name: { zh: "守御", en: "Guard" }, type: "buff", atk: 0, dmg: "—", crit: "0%", launch: [1, 2, 3, 4], target: [], effects: ["Guard 守护主人"] }],
        loot: [],
        brain: null,
      }],
    },
    {
      id: "corpse", group: "special",
      name: { zh: "尸骸", en: "Corpse" },
      type: { id: "corpse", zh: "尸骸", en: "Corpse" },
      size: 1, image: null, regions: [],
      ability: null,
      lore: { zh: "战斗留下的空壳,占着位置,不多不少。", en: "" },
      tiers: [{ tier: "A", label: { zh: "学徒", en: "Apprentice" }, size: 1, stats: null, skills: [], loot: [], brain: null }],
    },
  ];

  /* ---------- 常用工具 ---------- */
  const byId = (id) => M.find((m) => m.id === id);
  const listByGroup = (gid) => M.filter((m) => m.group === gid);
  const liveTiers = (m) => m.tiers.filter((t2) => t2.stats || t2.skills.length); // 隐藏空档(演示痛点4)

  const regionNames = (m) => (m.regions ?? []).map((r) => REGIONS[r]).filter(Boolean);
  const regionText = (m) => {
    const rs = regionNames(m);
    if (!rs.length) return t("—(召唤物/未收录)", "—");
    return rs.map((r) => t(r.zh, r.en)).join(" · ");
  };

  /* 效果文本中文化(启发式词典,UI 层临时方案,非游戏原文) */
  const FX_ZH = [
    ["vs Marked", "对标记目标"], ["On Miss", "未命中时"], ["On Hit", "命中时"], ["On Kill", "击杀时"],
    ["DMG", "伤害"], ["Minor", "轻度"], ["Medium", "中度"], ["Major", "重度"], ["Heavy", "沉重"],
    ["Bleed", "流血"], ["Blight", "腐蚀"], ["Stun", "眩晕"], ["Debuff", "减益"], ["Move", "位移"],
    ["Pull", "拉拽"], ["Knockback", "击退"], ["Throw", "投掷"], ["Mark", "标记"], ["Stress", "压力"],
    ["Horror", "恐怖"], ["Heal", "治疗"], ["Self", "自身:"], ["Riposte", "反击"], ["Guard", "守护"],
    ["Stealth", "隐匿"], ["Summon", "召唤"], ["Charm", "魅惑"], ["Swap", "换位"], ["Buff", "增益"],
    ["Allies", "全体队友"], ["All", "全体"], ["Dodge", "闪避"], ["ACC", "命中"],
  ];
  const fxZh = (s) => { if (lang !== "zh") return s; let o = String(s); for (const [a, b] of FX_ZH) o = o.split(a).join(b); return o; };

  const skillTypeZh = (ty) => ty === "melee" ? t("近战", "Melee") : ty === "ranged" ? t("远程", "Ranged") : ty === "heal" ? t("治疗", "Heal") : ty === "buff" ? t("增益", "Buff") : ty === "summon" ? t("召唤", "Summon") : (ty || "");

  /* 站位/打击点阵(4 格) */
  const rankCells = (digits, cls) => {
    let out = "";
    for (let i = 1; i <= 4; i++) out += `<div class="cell ${digits.includes(i) ? "on-" + cls : ""}">${i}</div>`;
    return `<div class="rank-cells">${out}</div>`;
  };

  /* 语言切换控件 */
  const langToggleHtml = () =>
    `<span class="proto-lang"><button data-l="zh" class="${lang === "zh" ? "on" : ""}" title="中文">中</button><button data-l="en" class="${lang === "en" ? "on" : ""}" title="English">EN</button></span>`;
  const bindLang = (root, rerender) => {
    for (const b of root.querySelectorAll(".proto-lang button")) {
      b.addEventListener("click", () => { lang = b.dataset.l; rerender(); });
    }
  };

  /* 大图灯箱(看原画) */
  let lightboxEl = null;
  const openLightbox = (src, title) => {
    closeLightbox();
    lightboxEl = document.createElement("div");
    lightboxEl.className = "proto-lightbox";
    lightboxEl.innerHTML = `<div class="pl-inner"><img src="${esc(src)}" alt=""><div class="pl-cap">${esc(title ?? "")}</div><div class="pl-hint">${t("点击任意处关闭", "click to close")}</div></div>`;
    lightboxEl.addEventListener("click", closeLightbox);
    document.body.appendChild(lightboxEl);
  };
  const closeLightbox = () => { lightboxEl?.remove(); lightboxEl = null; };

  /* 无图占位符(与正式版一致的 ☠ 方案) */
  const imgOrPlaceholder = (m, cls) => m.image
    ? `<img class="${cls}" src="${esc(m.image)}" loading="lazy" alt="" onerror="this.classList.add('noimg')">`
    : `<span class="${cls} img-ph" title="${t("暂无立绘", "no art")}">☠</span>`;

  return {
    esc, t, lang, GROUPS, REGIONS, M,
    byId, listByGroup, liveTiers, regionText, regionNames,
    fxZh, skillTypeZh, rankCells,
    langToggleHtml, bindLang, openLightbox, closeLightbox, imgOrPlaceholder,
  };
})();
