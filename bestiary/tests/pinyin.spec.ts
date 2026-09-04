/* 拼音搜索基线:
 * 1) 单元:「土匪火枪手」等固定样本的首字母(hq)、全拼(huoqiang)、中文、英文命中;
 * 2) 语料:全量真实数据(怪物索引 + 饰品/特质/事件卷)中,每条可搜索串用自己的
 *    首字母串与全拼串都必须命中 —— 防止拼接/分隔符/配置回归。 */
import fs from "node:fs";
import { pinyin } from "pinyin-pro";
import { describe, expect, it } from "vitest";
import { monsterMatchesQuery } from "../src/filter";
import { hasMatch } from "../src/pinyin";
import type { IndexMonster } from "../src/types";

const FULL = (s: string) => pinyin(s, { toneType: "none", type: "array", nonZh: "consecutive" }).join("").toLowerCase();
const FIRST = (s: string) => pinyin(s, { pattern: "first", toneType: "none", type: "array", nonZh: "consecutive" }).join("").toLowerCase();

describe("hasMatch — 拼音匹配语义", () => {
  it("首字母子串命中(hq → 土匪火枪手)", () => {
    expect(hasMatch("土匪火枪手", "hq")).toBe(true);
    expect(hasMatch("土匪火枪手", "tfhqs")).toBe(true);
    expect(hasMatch("土匪火枪手", "TF")).toBe(true);
  });
  it("全拼(含跨字连写)命中", () => {
    expect(hasMatch("土匪火枪手", "huoqiang")).toBe(true);
    expect(hasMatch("土匪火枪手", "tufeihuoqiangshou")).toBe(true);
  });
  it("原文命中(中文/英文/大小写)与空查询", () => {
    expect(hasMatch("土匪火枪手", "火枪")).toBe(true);
    expect(hasMatch("Brigand Fusilier", "fusi")).toBe(true);
    expect(hasMatch("土匪火枪手", "")).toBe(true);
    expect(hasMatch("土匪火枪手", "  ")).toBe(true);
  });
  it("不相关字母不误报", () => {
    expect(hasMatch("土匪火枪手", "hqx")).toBe(false);
    expect(hasMatch("土匪火枪手", "zzz")).toBe(false);
  });
  it("多音字:任一读法均可命中,且不受拼接上下文影响", () => {
    expect(hasMatch("重庆", "cq")).toBe(true);
    expect(hasMatch("重庆", "zhongqing")).toBe(true);
    expect(hasMatch("重甲兵", "zhongjiabing")).toBe(true);
    expect(hasMatch("辟邪挂坠", "bx")).toBe(true);
    expect(hasMatch("辟邪挂坠", "px")).toBe(true);
    expect(hasMatch("斩首长戟", "zscj")).toBe(true);
    expect(hasMatch("斩首长戟", "zszj")).toBe(true);
    expect(hasMatch("斩首长戟", "zsj")).toBe(false);
  });
  it("中英混打(逐字可用原字或读音)", () => {
    expect(hasMatch("土匪火枪手", "土fei")).toBe(true);
    expect(hasMatch("土匪火枪手", "土匪huoqiang")).toBe(true);
  });
  it("空白透明:带空格查询可命中,但字符顺序不可颠倒", () => {
    expect(hasMatch("+4 精准", "jz")).toBe(true);
    expect(hasMatch("+4 精准", "+4 jz")).toBe(true);
    expect(hasMatch("火枪手", "huo qiang")).toBe(true);
    expect(hasMatch("土匪火枪手", "fq")).toBe(false);
    expect(hasMatch("+4 精准", "%j")).toBe(false);
  });
  it("首字母需连续(非模糊跳字)", () => {
    expect(hasMatch("土匪火枪手", "tfqs")).toBe(false);
  });
});

describe("语料回归 — 全量真实数据逐条命中", () => {
  const index = JSON.parse(fs.readFileSync("public/data/index.json", "utf8")) as { monsters: IndexMonster[] };
  const trinkets = JSON.parse(fs.readFileSync("public/codex/data/trinkets.json", "utf8")) as Array<{ name: string; attr: string; labels: string[]; note: string }>;
  const quirks = JSON.parse(fs.readFileSync("public/codex/data/quirks.json", "utf8")) as Array<{ positive: { name: string; effect: string } | null; negative: { name: string; effect: string } | null }>;
  const events = JSON.parse(fs.readFileSync("public/codex/data/events.json", "utf8")) as Array<{ name: string; effect: string[]; note: string }>;

  it("每只怪物:首字母串与全拼串均通过 monsterMatchesQuery 命中", () => {
    const misses: string[] = [];
    for (const m of index.monsters) {
      if (!m.name.zh) continue;
      if (!monsterMatchesQuery(m, FIRST(m.name.zh))) misses.push(`${m.id} 首字母 ${FIRST(m.name.zh)}`);
      if (!monsterMatchesQuery(m, FULL(m.name.zh))) misses.push(`${m.id} 全拼 ${FULL(m.name.zh)}`);
    }
    expect(misses).toEqual([]);
  });

  it("饰品/特质/事件:首字母串均通过 hasMatch 命中", () => {
    const misses: string[] = [];
    for (const t of trinkets) if (t.name && !hasMatch(`${t.name}${t.attr}${t.labels.join()}${t.note}`, FIRST(t.name))) misses.push(`饰品 ${t.name}`);
    for (const g of quirks) for (const s of [g.positive, g.negative]) if (s && !hasMatch(`${s.name}${s.effect}`, FIRST(s.name))) misses.push(`特质 ${s.name}`);
    for (const e of events) if (e.name && !hasMatch(`${e.name}${e.effect.join()}${e.note}`, FIRST(e.name))) misses.push(`事件 ${e.name}`);
    expect(misses).toEqual([]);
  });

  it("样例怪物 hq 命中(用户场景)", () => {
    const m = index.monsters.find((x) => x.name.zh === "土匪火枪手");
    expect(m && monsterMatchesQuery(m, "hq")).toBe(true);
  });
});
