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
