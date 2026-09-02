/* 图鉴数据仓储:抓取 public/data 下的 JSON 并缓存。
 * 只讲一件事:数据从哪来。索引小而全、详情按怪懒取;缓存为进程内 Map。 */
import type { IndexFile, MonsterDetail } from "./types";

export async function loadIndex(): Promise<IndexFile> {
  const r = await fetch("data/index.json");
  if (!r.ok) throw new Error(`index.json ${r.status}`);
  return (await r.json()) as IndexFile;
}

const detailCache = new Map<string, MonsterDetail>();

export async function loadMonster(id: string): Promise<MonsterDetail> {
  const hit = detailCache.get(id);
  if (hit) return hit;
  const r = await fetch(`data/monsters/${encodeURIComponent(id)}.json`);
  if (!r.ok) throw new Error(`${id} ${r.status}`);
  const j = (await r.json()) as MonsterDetail;
  detailCache.set(id, j);
  return j;
}
