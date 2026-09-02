import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Localization } from "../src/data/localization.js";
import { ddHash } from "../src/core/hash.js";

/**
 * 合成最小 .loc2 语言包(与真实格式同构):
 * 16 字节头(poolStart u32 @8)+ n × 12 字节条目(hash u32, stringIndex u32, type u32=1)+ NUL 分隔字符串池。
 * 条目从 offset 16 起 —— 主索引扫描按 "offset 4 + 12k" 步进,网格必须与之对齐;
 * 条目哈希须升序;stringIndex 是字符串池分割后的数组下标(非字节偏移)。
 */
function makeLoc2(pairs: { hash: number; text: string }[]): Buffer {
  const encoded = pairs.map((p) => Buffer.from(p.text, "utf8"));
  let cursor = 0;
  const offsets = encoded.map((b) => {
    const o = cursor;
    cursor += b.length + 1; // 含结尾 NUL
    return o;
  });
  const poolStart = 16 + 12 * pairs.length;
  const buf = Buffer.alloc(poolStart + cursor); // alloc 零填充,天然补齐末尾 NUL
  buf.writeUInt32LE(poolStart, 8);
  pairs.forEach((p, k) => {
    const pos = 16 + 12 * k;
    buf.writeUInt32LE(p.hash, pos);
    buf.writeUInt32LE(k, pos + 4); // stringIndex:池分割后的数组下标
    buf.writeUInt32LE(1, pos + 8);
    encoded[k].copy(buf, poolStart + offsets[k]); // 字符串仍按顺序紧密排列
  });
  return buf;
}

function mk(root: string, rel: string, content: string | Buffer): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function makeGameDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dd-loc-"));
  // 本体:明文 xml 散表(英文)+ loc2(key 直查)
  mk(
    root,
    "localization/english.string_table.xml",
    '<language id="english"><entry id="str_monstername_skeleton_A"><![CDATA[Skeleton]]></entry></language>',
  );
  mk(root, "localization/schinese.loc2", makeLoc2([{ hash: ddHash("k_skel"), text: "骷髅" }]));
  // DLC:明文 xml(英文名权威来源)+ 英/中双包(哈希与本体不同,须按文本对齐)
  mk(
    root,
    "dlc/580100_test/localization/crimson_english.string_table.xml",
    '<language id="english"><entry id="str_monstername_baron_A"><![CDATA[Baron]]></entry></language>',
  );
  mk(
    root,
    "dlc/580100_test/localization/crimson_english.loc2",
    makeLoc2([
      { hash: 10, text: "Baron" },
      { hash: 20, text: "Viscount" },
    ]),
  );
  mk(
    root,
    "dlc/580100_test/localization/crimson_schinese.loc2",
    makeLoc2([
      { hash: 10, text: "男爵" },
      { hash: 20, text: "子爵" },
    ]),
  );
  return root;
}

describe("Localization(本体 + DLC 双包对齐)", () => {
  it("本体:xml 按 key 直查,loc2 按哈希反查", () => {
    const root = makeGameDir();
    const loc = new Localization(root);

    const xml = loc.byKey("str_monstername_skeleton_A", ddHash);
    expect(xml.hits).toContainEqual({ source: "xml", lang: "english", text: "Skeleton" });

    const loc2 = loc.byKey("k_skel", ddHash);
    expect(loc2.hits).toContainEqual({ source: "loc2", lang: "schinese", text: "骷髅" });

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("DLC:双包按哈希升序对齐出 英→中 映射", () => {
    const root = makeGameDir();
    const loc = new Localization(root);

    expect(loc.zhForEnglish("Baron")).toBe("男爵");
    expect(loc.zhForEnglish("Viscount")).toBe("子爵");
    expect(loc.zhForEnglish("不存在")).toBeUndefined();

    // DLC 明文 xml 也进了按 key 查询面
    const r = loc.byKey("str_monstername_baron_A", ddHash);
    expect(r.hits).toContainEqual({ source: "xml", lang: "english", text: "Baron" });

    fs.rmSync(root, { recursive: true, force: true });
  });
});
