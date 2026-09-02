export interface Loc2Data {
  language: string;
  strings: string[];
  byHash: Map<number, string>;
  indexSize: number;
}

export function parseLoc2(buf: Buffer, language: string): Loc2Data {
  if (buf.length < 12) throw new Error(`loc2 too small: ${language}`);
  const poolStart = buf.readUInt32LE(8);
  if (poolStart <= 0 || poolStart >= buf.length) {
    throw new Error(`bad poolStart ${poolStart} in ${language}`);
  }
  const strings = buf
    .slice(poolStart)
    .toString("utf8")
    .split("\x00")
    .filter((s) => s.length > 0);

  const gridStart = findMainIndex(buf, poolStart, strings.length);
  const byHash = new Map<number, string>();
  for (let pos = gridStart; pos + 12 <= poolStart; pos += 12) {
    if (buf.readUInt32LE(pos + 8) !== 1) continue;
    const idx = buf.readUInt32LE(pos + 4);
    if (idx >= strings.length) continue;
    const h = buf.readUInt32LE(pos);
    if (!byHash.has(h)) byHash.set(h, strings[idx]);
  }
  return { language, strings, byHash, indexSize: byHash.size };
}

function findMainIndex(buf: Buffer, poolStart: number, poolCount: number): number {
  let bestStart = 4;
  let bestLen = 0;
  for (let phase = 4; phase < 16; phase += 4) {
    let runStart = phase;
    let runLen = 0;
    let prev = 0;
    for (let pos = phase; pos + 12 <= poolStart; pos += 12) {
      const h = buf.readUInt32LE(pos);
      const i = buf.readUInt32LE(pos + 4);
      const t = buf.readUInt32LE(pos + 8);
      if (t === 1 && i < poolCount && h >= prev) {
        if (runLen === 0) runStart = pos;
        runLen++;
        prev = h;
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
  }
  return bestStart;
}
