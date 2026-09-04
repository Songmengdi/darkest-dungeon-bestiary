/* 拼音搜索匹配:查询沿文本序列连续消耗即命中,每个字符可用 原字 / 任一读音 / 读音首字母。
 * 不做整句分词——分词对多音字的取读受上下文影响(「辟邪挂坠」接上属性串后,辟的读法
 * 会从 bì 漂移为 pì),逐字穷举全部读法则任何读法都能搜到。
 * 例:「土匪火枪手」可被 hq、tfhqs、huoqiang、土fei 命中。
 * 单字读法与整串读法序列均缓存,过滤函数在 computed 中反复调用时零重复开销。 */
import { pinyin } from "pinyin-pro";

const charWays = new Map<string, string[]>();

function ways(ch: string): string[] {
  let w = charWays.get(ch);
  if (!w) {
    const readings = pinyin(ch, { multiple: true, toneType: "none", type: "array" }).map((r) => r.toLowerCase());
    w = [...new Set([ch.toLowerCase(), ...readings, ...readings.map((r) => r[0])])];
    charWays.set(ch, w);
  }
  return w;
}

const seqCache = new Map<string, string[][]>();

function seq(haystack: string): string[][] {
  let s = seqCache.get(haystack);
  if (!s) {
    s = [...haystack]
      .map(ways)
      .filter((w) => !(w.length === 1 && !w[0].trim())); // 空白透明:两侧都不参与连续匹配
    seqCache.set(haystack, s);
  }
  return s;
}

export function hasMatch(haystack: string, query: string): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;
  if (haystack.toLowerCase().includes(raw)) return true;
  const q = raw.replace(/\s+/g, "");
  if (!q) return true;
  const s = seq(haystack);
  const memo = new Map<number, boolean>();
  const go = (i: number, j: number): boolean => {
    if (j === q.length) return true;
    if (i === s.length) return false;
    const key = i * q.length + j;
    let hit = memo.get(key);
    if (hit === undefined) {
      hit = false;
      for (const w of s[i]) {
        if (q.startsWith(w, j) && go(i + 1, j + w.length)) {
          hit = true;
          break;
        }
      }
      memo.set(key, hit);
    }
    return hit;
  };
  for (let i0 = 0; i0 < s.length; i0++) if (go(i0, 0)) return true;
  return false;
}
