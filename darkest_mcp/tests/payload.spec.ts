/* src/export/payload.ts 的数据契约测试:锁死 .darkest 原始记录 → 图鉴 JSON 形状的翻译语义。
 * 前端 bestiary/src/types.ts 是这些形状的手工镜像 —— 这里红了,先改 payload,再对齐 types。 */
import { describe, expect, it } from "vitest";
import {
  asArray, brainPayload, lootPayload, prettyId, rankDigits, skillPayload, tierPayload, type NameLookup,
} from "../src/export/payload.js";
import type { TierData } from "../src/data/dataIndex.js";

const NO_NAMES: NameLookup = () => ({});
const rec = (type: string, params: Record<string, string | string[]>) => ({ type, params, line: 1 });

describe("rankDigits —— 站位串 → 有序数字", () => {
  it("提取 1..4 之外丢弃并升序", () => {
    expect(rankDigits("1234")).toEqual([1, 2, 3, 4]);
    expect(rankDigits("31")).toEqual([1, 3]);
    expect(rankDigits("1256")).toEqual([1, 2]); // 5/6 非法丢弃
    expect(rankDigits("0")).toEqual([]);
    expect(rankDigits(undefined)).toEqual([]);
  });
});

describe("skillPayload —— target 串语义(导出期判定,UI 只消费布尔)", () => {
  it("纯数字 = 敌方多选一:无 aoe/ally 标记(JSON.stringify 时键整个省略)", () => {
    const s = skillPayload({ id: "s1", target: "1234" }, NO_NAMES);
    expect(s.target).toEqual([1, 2, 3, 4]);
    expect(s.targetAoe).toBeUndefined();
    expect(s.targetAlly).toBeUndefined();
    expect(JSON.stringify(s)).not.toContain("targetAoe");
  });

  it("~ 前缀 = 范围打击(全体同时命中)", () => {
    const s = skillPayload({ id: "s1", target: "~1234" }, NO_NAMES);
    expect(s.targetAoe).toBe(true);
    expect(s.targetAlly).toBeUndefined();
  });

  it("@ 前缀 = 目标是怪物友方,数字仍升序", () => {
    const s = skillPayload({ id: "s1", target: "@4321" }, NO_NAMES);
    expect(s.targetAlly).toBe(true);
    expect(s.target).toEqual([1, 2, 3, 4]);
  });

  it("~@ 兼有 = 范围打击其友方(如侍妾午夜小步舞)", () => {
    const s = skillPayload({ id: "s1", target: "~@4321" }, NO_NAMES);
    expect(s.targetAoe).toBe(true);
    expect(s.targetAlly).toBe(true);
  });

  it("反引号是游戏数据噪音,剔除后不影响站位", () => {
    expect(skillPayload({ id: "s1", target: "`1234" }, NO_NAMES).target).toEqual([1, 2, 3, 4]);
  });

  it("名称回退链 zh → en → id;伤害区间格式化;effect 单串包装成数组", () => {
    const lookup: NameLookup = (key) => (key === "str_monster_skill_sk" ? { en: "Only EN" } : {});
    const s = skillPayload({ id: "sk", launch: "12", dmg: ["3", "8"], atk: "85", effect: "Bleed 1" }, lookup);
    expect(s.name).toEqual({ zh: "Only EN", en: "Only EN" });
    const noName = skillPayload({ id: "sk2" }, NO_NAMES);
    expect(noName.name).toEqual({ zh: "sk2", en: "sk2" });
    expect(s.dmg).toBe("3-8");
    expect(s.effects).toEqual(["Bleed 1"]);
    expect(skillPayload({ id: "x", dmg: "5" }, NO_NAMES).dmg).toBe("5");
    expect(skillPayload({ id: "x", effect: ["a", "b"] }, NO_NAMES).effects).toEqual(["a", "b"]);
  });

  it("JSON 形状契约:键序与省略规则稳定(前端 types.ts 的镜像来源)", () => {
    const json = JSON.stringify(skillPayload({ id: "sk", type: "melee", target: "~12", effect: "Stun 2" }, NO_NAMES));
    expect(json).toBe(
      '{"id":"sk","name":{"zh":"sk","en":"sk"},"type":"melee","launch":[],"target":[1,2],"targetAoe":true,"effects":["Stun 2"]}',
    );
  });
});

describe("tierPayload —— 档位形状", () => {
  const def = { id: "skeleton", dir: "monsters/skeleton", tiers: [] };
  const emptyIdx = { loot: [], brains: new Map() };

  it("stats 记录映射到 res 五抗性;TIER_LABELS 提供中英档位名", () => {
    const td: TierData = {
      tier: "A",
      info: [
        rec("stats", { hp: "24", spd: "1", dodge: "0", stun_resist: "40%", bleed_resist: "20%" }),
        rec("display", { size: "2" }),
      ],
      art: [],
    };
    const t = tierPayload(emptyIdx, def, td, NO_NAMES);
    expect(t.label).toEqual({ zh: "学徒", en: "Apprentice" });
    expect(t.size).toBe(2);
    expect(t.stats).toMatchObject({ hp: "24", spd: "1", res: { stun: "40%", bleed: "20%" } });
    expect(t.stats!.res.debuff).toBeUndefined();
  });

  it("未知档位回退「档位 X」标签;无 stats 的档位 stats 为 undefined(尸体/装饰物)", () => {
    const td: TierData = { tier: "D", info: [], art: [] };
    const t = tierPayload(emptyIdx, def, td, NO_NAMES);
    expect(t.label).toEqual({ zh: "档位 D", en: "Tier D" });
    expect(t.stats).toBeUndefined();
    expect(t.loot).toEqual([]);
  });

  it("技能/掉落/大脑分别挂载", () => {
    const idx = {
      loot: [{ id: "LT1", file: "loot/a.json", raw: { entries: [{ type: "item", data: { id: "gold", amount: "2" } }] } }],
      brains: new Map([["brain1", { id: "brain1", raw: { skill_selection_desires: [{ type: "preferred_skill", base_chance: "1", data: { combat_skill_id: "sk" } }] } }]]),
    };
    const td: TierData = {
      tier: "B",
      info: [
        rec("skill", { id: "sk", target: "~123" }),
        rec("loot", { code: "LT1" }),
        rec("monster_brain", { id: "brain1" }),
      ],
      art: [],
    };
    const t = tierPayload(idx, def, td, NO_NAMES);
    expect(t.skills).toHaveLength(1);
    expect(t.skills[0].targetAoe).toBe(true);
    expect(t.loot[0].entries[0]).toEqual({ type: "item", chances: undefined, data: { id: "gold", amount: "2" } });
    expect(t.brain!.skillDesires).toEqual([{ skill: "sk", chance: "1", type: "preferred_skill" }]);
  });
});

describe("杂项纯函数", () => {
  it("lootPayload 按文件+内容去重", () => {
    const entries = [{ type: "gem" }];
    const out = lootPayload(
      { loot: [
        { id: "LT", file: "loot/a.json", raw: { entries } },
        { id: "LT", file: "loot/a.json", raw: { entries } },
        { id: "LT", file: "loot/b.json", raw: { entries } },
      ] },
      "LT",
    );
    expect(out.map((o) => o.file)).toEqual(["loot/a.json", "loot/b.json"]);
  });

  it("brainPayload 对缺失大脑返回 undefined", () => {
    expect(brainPayload({ brains: new Map() }, "nope")).toBeUndefined();
  });

  it("prettyId / asArray", () => {
    expect(prettyId("bone_defender")).toBe("Bone Defender");
    expect(asArray("x")).toEqual(["x"]);
    expect(asArray(["x", "y"])).toEqual(["x", "y"]);
    expect(asArray(undefined)).toEqual([]);
  });
});
