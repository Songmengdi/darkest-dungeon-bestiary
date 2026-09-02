import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const client = new Client({ name: "smoke", version: "0.0.1" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.resolve("dist/index.js")],
  env: { ...process.env }, // SDK 默认只继承白名单环境变量,DD_GAME_DIR 必须显式透传
});
await client.connect(transport);
process.stderr.write("[smoke] connected\n");

const tools = await client.listTools();
console.log("工具列表:", tools.tools.map((t) => t.name).join(", "));
if (tools.tools.length !== 7) throw new Error(`期望 7 个工具,实际 ${tools.tools.length}`);

async function call(name: string, args: Record<string, unknown>): Promise<string> {
  const r = await client.callTool({ name, arguments: args });
  const content = r.content as { type: string; text: string }[];
  const t = content?.[0]?.text ?? "";
  console.log(`\n===== ${name} ${JSON.stringify(args).slice(0, 90)} =====`);
  console.log(t.slice(0, 900) + (t.length > 900 ? "\n…(截断)" : ""));
  return t;
}

const browse = await call("dd_browse", {});
if (!browse.includes("monsters/")) throw new Error("browse 缺少 monsters");

const search = await call("dd_search", { query: "skeleton_courtier" });
if (!search.includes("怪物")) throw new Error("search 未找到 skeleton_courtier");

const entity = await call("dd_get_entity", { id: "skeleton_courtier" });
for (const needle of ["难度档 A", "Bone Courtier", "tempting_goblet"]) {
  if (!entity.includes(needle)) throw new Error(`entity 输出缺少: ${needle}`);
}
if (!entity.includes("骸骨")) {
  console.log("  [info] entity 无中文怪名(xml 无 schinese 条目),中文走 dd_localization:");
  await call("dd_localization", { mode: "text", query: "骸骨官僚", lang: "schinese" });
}

const trinketSearch = await call("dd_search", { query: "crow_wingfeather", type: "trinket" });
if (!trinketSearch.includes("crow_wingfeather")) throw new Error("trinket 搜索失败");
await call("dd_get_entity", { id: "crow_wingfeather", type: "trinket" });

const loc = await call("dd_localization", { mode: "text", query: "骸骨", lang: "schinese" });
if (!loc.includes("骸骨贵族")) throw new Error("中文文本搜索失败");

await call("dd_localization", { mode: "key", query: "str_monstername_skeleton_courtier_B" });
await call("dd_read_file", { path: "monsters/skeleton_courtier/skeleton_courtier_A/skeleton_courtier_A.info.darkest", parsed: true });
await call("dd_schema", { topic: "monster-files" });

const tmpMod = fs.mkdtempSync(path.join(os.tmpdir(), "dd-mod-"));
fs.mkdirSync(path.join(tmpMod, "monsters", "my_monster"), { recursive: true });
fs.writeFileSync(
  path.join(tmpMod, "monsters", "my_monster", "my_monster.info.darkest"),
  'display: .size 1\nenemy_type: .id "unholy"\nstats: .hp 10 .spd 1\n',
);
fs.writeFileSync(path.join(tmpMod, "bogus.txt"), "bad");
const validation = await call("dd_validate_mod", { mod_path: tmpMod });
if (!validation.includes("未知顶层目录: bogus.txt")) throw new Error("mod 校验未发现非法路径");
if (!validation.includes("新增文件 1 个")) throw new Error("mod 校验新增文件计数错误");

await client.close();
console.log("\n[smoke] 全部通过 ✓");
