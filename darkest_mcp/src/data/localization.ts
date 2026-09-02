import fs from "node:fs";
import path from "node:path";
import { parseLoc2, type Loc2Data } from "../core/loc2Parser.js";

export interface KeyLookupResult {
  key: string;
  hash: number;
  hits: { source: "xml" | "loc2"; lang: string; text: string }[];
}

export class Localization {
  readonly loc2 = new Map<string, Loc2Data>();
  readonly xmlByLang = new Map<string, Map<string, string>>();
  /** DLC 专用:英文文本 → 中文文本(DLC loc2 哈希与本体不同,无法按 key 直查,只能按文本对) */
  readonly zhByEn = new Map<string, string>();

  constructor(dataDir: string) {
    const locDir = path.join(dataDir, "localization");
    for (const f of fs.readdirSync(locDir)) {
      const full = path.join(locDir, f);
      if (f.endsWith(".loc2")) {
        try {
          const lang = f.slice(0, -5);
          this.loc2.set(lang, parseLoc2(fs.readFileSync(full), lang));
        } catch {
          // skip malformed pack
        }
      }
    }
    for (const f of fs.readdirSync(locDir)) {
      if (!f.endsWith(".string_table.xml")) continue;
      try {
        this.loadXml(path.join(locDir, f), fs.readFileSync(path.join(locDir, f), "utf8"));
      } catch {
        // skip malformed xml
      }
    }
    this.loadDlc(path.join(dataDir, "dlc"));
  }

  /**
   * DLC 本地化:
   * - *.string_table.xml 是明文键值(官方英文名的权威来源),按 lang=english 收进 xmlByLang;
   * - DLC 的 *_english.loc2 / *_schinese.loc2 的哈希与本体 ddHash 不同(已实测,反查不中),
   *   不能按 key 直查;但两个包的主索引按同一未知哈希升序排列,逐位对齐后可提取"英文本→中文本"映射。
   */
  private loadDlc(dlcRoot: string): void {
    let dlcs: string[] = [];
    try {
      dlcs = fs.readdirSync(dlcRoot);
    } catch {
      return;
    }
    for (const d of dlcs) {
      const locDir = path.join(dlcRoot, d, "localization");
      let entries: string[];
      try {
        entries = fs.readdirSync(locDir);
      } catch {
        continue;
      }
      for (const f of entries) {
        if (!f.endsWith(".string_table.xml")) continue;
        try {
          this.loadXml(path.join(locDir, f), fs.readFileSync(path.join(locDir, f), "utf8"));
        } catch {
          // skip malformed xml
        }
      }
      const enPack = entries.find((f) => f.endsWith("_english.loc2"));
      const zhPack = entries.find((f) => f.endsWith("_schinese.loc2"));
      if (enPack && zhPack) {
        try {
          this.alignDlcZh(path.join(locDir, enPack), path.join(locDir, zhPack));
        } catch {
          // 对齐失败只是缺中文名,不致命
        }
      }
    }
  }

  /** loc2 主索引:文件内最长的 "哈希升序且 type==1" 游程,返回 [hash, text] 序列。 */
  private static mainRun(file: string): { hash: number; text: string }[] {
    const buf = fs.readFileSync(file);
    const poolStart = buf.readUInt32LE(8);
    const strings = buf.slice(poolStart).toString("utf8").split("\x00");
    let bestStart = 4;
    let bestLen = 0;
    let runStart = 4;
    let runLen = 0;
    let prev = 0;
    for (let pos = 4; pos + 12 <= poolStart; pos += 12) {
      const h = buf.readUInt32LE(pos);
      const i = buf.readUInt32LE(pos + 4);
      const t = buf.readUInt32LE(pos + 8);
      if (t === 1 && i < strings.length && h >= prev) {
        if (runLen === 0) {
          runStart = pos;
          prev = h;
        } else {
          prev = h;
        }
        runLen++;
      } else if (runLen > 0) {
        if (runLen > bestLen) {
          bestLen = runLen;
          bestStart = runStart;
        }
        runLen = 0;
        prev = 0;
      }
    }
    if (runLen > bestLen) {
      bestLen = runLen;
      bestStart = runStart;
    }
    const out: { hash: number; text: string }[] = [];
    for (let k = 0; k < bestLen; k++) {
      const pos = bestStart + k * 12;
      const idx = buf.readUInt32LE(pos + 4);
      out.push({ hash: buf.readUInt32LE(pos), text: idx < strings.length ? strings[idx] : "" });
    }
    return out;
  }

  private alignDlcZh(enFile: string, zhFile: string): void {
    const en = Localization.mainRun(enFile);
    const zh = Localization.mainRun(zhFile);
    // 两包条目数可能差 1,做偏移搜索取哈希重合最多者
    let bestOff = 0;
    let bestMatch = -1;
    for (let off = -4; off <= 4; off++) {
      let m = 0;
      for (let i = 0; i < en.length; i++) {
        const j = i + off;
        if (j >= 0 && j < zh.length && en[i].hash === zh[j].hash) m++;
      }
      if (m > bestMatch) {
        bestMatch = m;
        bestOff = off;
      }
    }
    for (let i = 0; i < en.length; i++) {
      const j = i + bestOff;
      if (j < 0 || j >= zh.length) continue;
      if (en[i].hash !== zh[j].hash) continue;
      const e = en[i].text;
      const z = zh[j].text;
      if (e && z && !this.zhByEn.has(e)) this.zhByEn.set(e, z);
    }
  }

  /** 用英文文本反查 DLC 中文名(仅对 DLC 语言包覆盖的文本有效)。 */
  zhForEnglish(text: string): string | undefined {
    return this.zhByEn.get(text);
  }

  private loadXml(file: string, content: string): void {
    let lang = "unknown";
    const re =
      /<language id="([^"]+)"|<entry id="([^"]+)"><!\[CDATA\[([\s\S]*?)\]\]><\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1] !== undefined) {
        lang = m[1];
      } else if (m[2] !== undefined) {
        let byLang = this.xmlByLang.get(lang);
        if (!byLang) {
          byLang = new Map();
          this.xmlByLang.set(lang, byLang);
        }
        if (!byLang.has(m[2])) byLang.set(m[2], m[3]);
      }
    }
  }

  languages(): string[] {
    return [...new Set([...this.loc2.keys(), ...this.xmlByLang.keys()])].sort();
  }

  byKey(key: string, hashOf: (s: string) => number): KeyLookupResult {
    const h = hashOf(key);
    const hits: KeyLookupResult["hits"] = [];
    for (const [lang, byLang] of this.xmlByLang) {
      const t = byLang.get(key);
      if (t !== undefined) hits.push({ source: "xml", lang, text: t });
    }
    for (const [lang, data] of this.loc2) {
      const t = data.byHash.get(h);
      if (t !== undefined) hits.push({ source: "loc2", lang, text: t });
    }
    return { key, hash: h, hits };
  }

  searchText(text: string, lang?: string): { lang: string; text: string }[] {
    const out: { lang: string; text: string }[] = [];
    const needle = text.toLowerCase();
    for (const [l, data] of this.loc2) {
      if (lang && l !== lang) continue;
      for (const s of data.strings) {
        if (s.toLowerCase().includes(needle)) out.push({ lang: l, text: s });
        if (out.length >= 80) return out;
      }
    }
    for (const [l, byLang] of this.xmlByLang) {
      if (lang && l !== lang) continue;
      for (const s of byLang.values()) {
        if (s.toLowerCase().includes(needle)) out.push({ lang: l, text: s });
        if (out.length >= 80) return out;
      }
    }
    return out;
  }

  textFor(lang: string, key: string, hashOf: (s: string) => number): string | undefined {
    const xml = this.xmlByLang.get(lang)?.get(key);
    if (xml !== undefined) return xml;
    return this.loc2.get(lang)?.byHash.get(hashOf(key));
  }
}
