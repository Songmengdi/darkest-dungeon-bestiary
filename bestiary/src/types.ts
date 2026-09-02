/* 图鉴数据类型 —— 消费端镜像:形状由 darkest_mcp src/export/payload.ts(产出方)与其契约测试锁定,
 * image 字段由本仓库 scripts/assets.ts(资产管线)追加。改镜像必对齐产出方。 */

export interface Loc {
  zh?: string;
  en?: string;
  ja?: string;
}

export interface IndexRegion {
  id: string;
  zh: string;
  en: string;
}

export interface IndexType {
  id: string;
  zh: string;
  en?: string;
}

export interface IndexMonster {
  id: string;
  name: { zh: string; en: string };
  type?: IndexType;
  size: number;
  tiers: string[];
  regions?: string[];
  image?: string;
}

export interface IndexFile {
  count: number;
  regions: IndexRegion[];
  monsters: IndexMonster[];
}

export interface TierStats {
  hp: number | string;
  def: number | string;
  prot: number | string;
  spd: number | string;
  res: {
    stun: number | string;
    poison: number | string;
    bleed: number | string;
    debuff: number | string;
    move: number | string;
  };
}

export interface EffectRef {
  raw: string;
  chance?: string;
  duration?: number;
  stress?: string;
  dot?: { kind: "bleed" | "blight" | "stress"; amount: string; duration?: number };
  move?: { kind: "push" | "pull" | "shuffle"; amount?: string };
  stun?: string;
  heal?: string;
  healStress?: string;
  torch?: string;
  dmgMultiply?: string;
  stats?: Array<{ key: string; value: string }>;
  traits?: string[];
}

export interface Skill {
  id: string;
  name: { zh?: string; en?: string };
  type?: string;
  atk?: number | string;
  dmg?: string;
  crit?: string;
  launch: number[];
  target: number[];
  /** 原始 target 带 ~ 前缀:范围打击,同时命中所有列出的位置 */
  targetAoe?: boolean;
  /** 原始 target 带 @ 前缀:目标是怪物友方(增益 / 守护 / 治疗) */
  targetAlly?: boolean;
  effects: EffectRef[];
}

export interface LootEntry {
  type: string;
  chances?: number | string;
  data?: Record<string, unknown>;
}

export interface LootTable {
  file?: string;
  entries: LootEntry[];
}

export interface BrainDesire {
  type?: string;
  skill?: string;
  chance: number | string;
}

export interface Brain {
  skillDesires: BrainDesire[];
  targetDesires?: unknown[];
}

export interface Tier {
  tier: string;
  label?: Loc;
  displayName?: Loc;
  size: number;
  stats?: TierStats | null;
  enemyType?: IndexType;
  skills: Skill[];
  loot: LootTable[];
  brain?: Brain | null;
  deathClass?: string;
  lifeLink?: string;
}

export interface MonsterDetail {
  id: string;
  tiers: Tier[];
}
