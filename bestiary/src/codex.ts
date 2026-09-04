/* 图鉴总集(卷册)共享层:codex 数据类型 + 加载器 + hash 路由解析。
 * 数据来自 public/codex/data/*.json(整理自「暗黑地牢资料库」静态包,图片在 public/codex/img/)。 */

/* ---------- 类型 ---------- */
export interface HeroOverviewLevel {
  speed: number; crit: number; critBonus: number | string; attack: string; hp: number; dodge: number;
  feature?: string;
}
export interface HeroAbility {
  name: string; img: string; type: string;
  rank: number[]; tar: number[];
  accuracy: number[]; crit: number[]; damage: (string | number)[];
  effectTar: string[]; effectSelf: string[]; limit?: number;
}
export interface HeroCampSkill { img: string; name: string; des: string }
export interface Hero {
  id: string; name: string; alias: string; portrait: string; art: string;
  overview: { name: string; alias?: string; level0: HeroOverviewLevel; level6: HeroOverviewLevel };
  hp: number[]; dodge: number[]; prot: number[]; spd: number[]; crt: number[]; dmg: string[];
  religious: string; resistances: string[];
  abilities: HeroAbility[]; camping: HeroCampSkill[];
}
export interface QuirkGroup {
  category: string;
  positive: { name: string; effect: string } | null;
  negative: { name: string; effect: string } | null;
}
export interface Curio { key: string; name: string; img: string; note: string }
export interface Trinket {
  img: string; name: string; attr: string; origin: string; note: string; labels: string[];
}
export interface Boss { current: string; name: string; h3: string; p: string; li: string[]; img: string }
export interface MapEntry { key: string; name: string; img: string }
export interface Building { title: string; stars: string; items: string[] }
export interface Lineup {
  applicability: string; feature: string; details: string[];
  href: string | null; href2: string | null;
  slots: (null | Hero)[][]; // 1→4 号位,空位为 null
}
export interface TownEvent { img: string; name: string; effect: string[]; note: string; tagImg: string }
export interface SupplyRow {
  difficulty: string | string[];
  food: number; shovel: number; antidote: number; bandage: number; herb: number;
  passkey: number; elixir: number; laudanum: number; torch: number; dust: number; blood: number; scale: number;
  note: string[];
}
export interface NoteSection { type: string; liD: string[] }
export interface Rating { title: string; stars: string; items: string[] }

/* ---------- 加载(带缓存) ---------- */
const cache = new Map<string, Promise<unknown>>();
function load<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    cache.set(file, fetch(`codex/data/${file}`).then((r) => {
      if (!r.ok) throw new Error(`${file} ${r.status}`);
      return r.json() as Promise<T>;
    }));
  }
  return cache.get(file) as Promise<T>;
}
export const loadHeroes = () => load<Hero[]>("heroes.json");
export const loadQuirks = () => load<QuirkGroup[]>("quirks.json");
export const loadCurios = () => load<Curio[]>("curios.json");
export const loadTrinkets = () => load<Trinket[]>("trinkets.json");
export const loadBosses = () => load<Boss[]>("bosses.json");
export const loadMaps = () => load<MapEntry[]>("maps.json");
export const loadBuildings = () => load<Building[]>("buildings.json");
export const loadLineups = () => load<Lineup[]>("lineups.json");
export const loadEvents = () => load<TownEvent[]>("events.json");
export const loadSupply = () => load<SupplyRow[]>("supply.json");
export const loadNotes = () => load<NoteSection[]>("notes.json");
export const loadRatings = () => load<Rating[]>("attributes.json");

/* ---------- 卷路由:hash '#/<volume>' 为卷,裸 '#<id>' 为怪物深链 ---------- */
export function parseHash(hash: string): { volume: string; monster: string } {
  if (hash.startsWith("#/")) {
    return { volume: decodeURIComponent(hash.slice(2)).split("/")[0] || "monsters", monster: "" };
  }
  return { volume: "monsters", monster: decodeURIComponent(hash.replace(/^#/, "")) };
}
