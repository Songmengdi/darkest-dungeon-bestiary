/* effect.ts 的行为基线:
 * 1) parity:全部真实效果串(153 怪物 JSON 中提取的 733 条)与旧实现快照逐条比对;
 *    有意的行为修复登记在 INTENDED_DIFFS(附理由),其余零容忍。
 * 2) 单元:排序/包含/block/诚实无图标/语言切换等关键语义。
 * 快照由旧实现(fxicons.ts FX_RULES + data.ts FX_ZH,commit 79640ed 时点)生成。 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { interpretEffect } from "../src/effect";
import { setLang } from "../src/i18n";
import { FX_ICONS } from "../src/fxicons";

const EFFECTS: string[] = JSON.parse(fs.readFileSync("tests/fixtures/real-effects.json", "utf8"));
const SNAPSHOT: Record<string, { icons: string[]; text: string }> = JSON.parse(
  fs.readFileSync("tests/fixtures/effect-snapshot.json", "utf8"),
);

/* 有意偏离旧行为的串(附理由)。新增偏离必须先在这里登记理由,否则 parity 失败。 */
const INTENDED_DIFFS: Record<string, string> = {
  // 排序修复:旧 FX_ZH 中 Stress 先于 HealStress 替换,"HealStress" 被拆成「治疗压力」;
  // 新概念表把 HealStress 概念提前,渲染为正确的「压力治疗」。
  "Miller HealStress 3": "压力治疗 排序修复",
  "Miller HealStress 5": "压力治疗 排序修复",
  "Miller HealStress 7": "压力治疗 排序修复",
};

describe("interpretEffect — 与旧实现 parity(733 条真实效果串)", () => {
  it("快照与真实串集合一致(防 fixture 漂移)", () => {
    expect(Object.keys(SNAPSHOT).sort()).toEqual([...EFFECTS].sort());
  });

  it("icons 与 text 逐条等于旧实现(登记的有意修复除外)", () => {
    const diffs: string[] = [];
    for (const e of EFFECTS) {
      const got = interpretEffect(e);
      const want = SNAPSHOT[e];
      const same = got.icons.join(",") === want.icons.join(",") && got.text === want.text;
      if (!same && !INTENDED_DIFFS[e]) diffs.push(`${e}\n  旧: icons=${JSON.stringify(want.icons)} text=${JSON.stringify(want.text)}\n  新: icons=${JSON.stringify(got.icons)} text=${JSON.stringify(got.text)}`);
    }
    expect(diffs).toEqual([]);
  });

  it("有意修复的串确实偏离旧快照(防登记失效)", () => {
    for (const e of Object.keys(INTENDED_DIFFS)) {
      const got = interpretEffect(e);
      const want = SNAPSHOT[e];
      const changed = got.icons.join(",") !== want.icons.join(",") || got.text !== want.text;
      expect(changed, `${e} 应与旧快照不同(否则 INTENDED_DIFFS 登记已失效)`).toBe(true);
    }
  });
});

describe("interpretEffect — 语义单元", () => {
  it("压力治疗:block 掉 heal 与 stress,文本为「压力治疗」", () => {
    const v = interpretEffect("Miller HealStress 3");
    expect(v.icons).toEqual(["stress-heal"]);
    expect(v.text).toBe("Miller 压力治疗 3");
  });

  it("对标记的额外伤害:block 掉 mark 图标;文本逐词替换", () => {
    const v = interpretEffect("Damage Marked Target");
    expect(v.icons).toEqual(["extra-damage-vs-marked"]);
    expect(v.text).toBe("伤害 被标记 目标");
    expect(v.text).not.toContain("Mark"); // 无英文残留;Marked 优先于 Mark
  });

  it("猩红诅咒:block 掉 debuff,文本不残留英文 Curse", () => {
    const v = interpretEffect("Crimson Curse Debuff");
    expect(v.icons).toEqual(["crimson-curse"]);
    expect(v.text).toBe("猩红诅咒 减益");
  });

  it("诚实原则:首领专属机制串不带图标,但文本仍中文化", () => {
    for (const e of ["Ancestor Disrupt", "Crow Caw", "Wicked Surge", "Countess Terror"]) {
      expect(interpretEffect(e).icons, e).toEqual([]);
    }
    const v = interpretEffect("Ancestor Damage Marked");
    expect(v.icons).toEqual(["extra-damage-vs-marked"]);
  });

  it("图标上限 3,且全部命中 id 都在 FX_ICONS 元数据内", () => {
    for (const e of EFFECTS) {
      const { icons } = interpretEffect(e);
      expect(icons.length, e).toBeLessThanOrEqual(3);
      for (const id of icons) expect(FX_ICONS[id], `${e} -> ${id}`).toBeDefined();
    }
  });

  it("en 模式:文本保持原文,图标照常", () => {
    setLang("en");
    const v = interpretEffect("Miller HealStress 3");
    expect(v.text).toBe("Miller HealStress 3");
    expect(v.icons).toEqual(["stress-heal"]);
    setLang("zh");
  });
});
