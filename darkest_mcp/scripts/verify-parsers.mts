import fs from "node:fs";
import { parseDarkest } from "../src/core/darkestParser.js";
import { parseLoc2 } from "../src/core/loc2Parser.js";
import { ddHash } from "../src/core/hash.js";

const DATA = "/Users/songmengdi/Library/Application Support/Steam/steamapps/common/DarkestDungeon/_osx/Darkest.app/Contents/Resources/data";

const info = fs.readFileSync(DATA + "/monsters/skeleton_courtier/skeleton_courtier_A/skeleton_courtier_A.info.darkest", "utf8");
const recs = parseDarkest(info);
console.log("记录数:", recs.length, "| 类型:", [...new Set(recs.map(r => r.type))].join(","));
console.log("stats:", JSON.stringify(recs.find(r => r.type === "stats")?.params));
console.log("skill:", JSON.stringify(recs.find(r => r.type === "skill")?.params));

const loc2 = parseLoc2(fs.readFileSync(DATA + "/localization/schinese.loc2"), "schinese");
console.log("schinese: 字符串", loc2.strings.length, "| hash条目", loc2.byHash.size, "| 碰撞", loc2.collisions);
console.log("B档怪名hash →", loc2.byHash.get(ddHash("str_monstername_skeleton_courtier_B")));

const en = parseLoc2(fs.readFileSync(DATA + "/localization/english.loc2"), "english");
console.log("english: 字符串", en.strings.length, "| hash条目", en.byHash.size, "| 碰撞", en.collisions);
console.log("english 怪名 →", en.byHash.get(ddHash("str_monstername_skeleton_courtier_B")));
