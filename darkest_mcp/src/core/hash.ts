export function ddHash(s: string): number {
  let h = 0;
  const bytes = Buffer.from(s, "utf8");
  for (const b of bytes) {
    h = (Math.imul(h, 53) + b) | 0;
  }
  return h >>> 0;
}
