export interface DarkestRecord {
  type: string;
  params: Record<string, string | string[]>;
  line: number;
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && (ch === " " || ch === "\t")) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

export function parseDarkest(content: string): DarkestRecord[] {
  const records: DarkestRecord[] = [];
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const type = line.slice(0, colon).trim();
    const tokens = tokenize(line.slice(colon + 1));
    const params: Record<string, string | string[]> = {};
    let curKey: string | null = null;
    for (const t of tokens) {
      if (t.startsWith(".") && t.length > 1 && !/^\.?\d/.test(t.slice(1))) {
        curKey = t.slice(1);
        params[curKey] = [];
      } else if (curKey) {
        (params[curKey] as string[]).push(t);
      }
    }
    for (const k of Object.keys(params)) {
      const v = params[k] as string[];
      params[k] = v.length === 1 ? v[0] : v;
    }
    records.push({ type, params, line: i + 1 });
  }
  return records;
}
