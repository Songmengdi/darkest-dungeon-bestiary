import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../src/data/dataIndex.js";

function mk(root: string, rel: string, content: string): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

const INFO = 'display: .size 1\nenemy_type: .id "unholy"\nstats: .hp 10 .spd 1\n';
const ART = "display: .spawn_order 1\n";

/** 三种怪物目录布局的最小游戏目录(与真实 DD1 安装同构) */
function makeGameDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dd-idx-"));
  // 本体:monsters/<id>/<id>_<tier>/<file>
  mk(root, "monsters/ogre/ogre_A/ogre_A.info.darkest", INFO);
  mk(root, "monsters/ogre/ogre_B/ogre_B.info.darkest", INFO);
  mk(root, "monsters/ogre/ogre_A/ogre_A.art.darkest", ART);
  mk(root, "monsters/ogre/readme.txt", "非 .darkest 文件不应建怪");
  // DLC 布局一:dlc/<appid>_<name>/monsters/<id>/<id>_<tier>/...(CoM、破盾者)
  mk(root, "dlc/735730_color_of_madness/monsters/farmer/farmer_A/farmer_A.info.darkest", INFO);
  // DLC 布局二:dlc/<appid>_<name>/features/<feature>/monsters/<id>/<id>_<tier>.info.darkest(血色宫廷)
  mk(root, "dlc/580100_crimson_court/features/courtyard/monsters/baron/baron_A.info.darkest", INFO);
  mk(root, "dlc/580100_crimson_court/features/courtyard/monsters/baron/baron_B.info.darkest", INFO);
  return root;
}

describe("buildIndex 怪物发现(本体 + 两种 DLC 布局)", () => {
  it("发现三种布局的怪,dir/tier 正确,非 .darkest 忽略", () => {
    const root = makeGameDir();
    const idx = buildIndex(root);

    expect([...idx.monsters.keys()].sort()).toEqual(["baron", "farmer", "ogre"]);

    const ogre = idx.monsters.get("ogre")!;
    expect(ogre.dir).toBe("monsters/ogre");
    expect(ogre.tiers.map((t) => t.tier)).toEqual(["A", "B"]);
    expect(ogre.tiers[0].info).toHaveLength(3); // display / enemy_type / stats
    const stats = ogre.tiers[0].info.find((r) => r.type === "stats");
    expect(stats?.params).toMatchObject({ hp: "10", spd: "1" }); // parser 保留原始字符串
    expect(ogre.tiers[0].art).toHaveLength(1);

    const farmer = idx.monsters.get("farmer")!;
    expect(farmer.dir).toBe("dlc/735730_color_of_madness/monsters/farmer");
    expect(farmer.tiers.map((t) => t.tier)).toEqual(["A"]);

    const baron = idx.monsters.get("baron")!;
    expect(baron.dir).toBe("dlc/580100_crimson_court/features/courtyard/monsters/baron");
    expect(baron.tiers.map((t) => t.tier)).toEqual(["A", "B"]);

    fs.rmSync(root, { recursive: true, force: true });
  });
});
