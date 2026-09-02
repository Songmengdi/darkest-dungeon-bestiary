import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveGame } from "./config.js";
import { buildIndex, type DataIndex } from "./data/dataIndex.js";
import { Localization } from "./data/localization.js";
import {
  findEntity,
  monsterNames,
  renderBrain,
  renderEffect,
  renderHero,
  renderMonster,
  renderTrinket,
} from "./data/entities.js";
import { parseDarkest } from "./core/darkestParser.js";
import { SCHEMA_TOPICS } from "./schemaDocs.js";

interface Ctx {
  idx: DataIndex;
  loc: Localization;
}

let cached: Ctx | null = null;

function ctx(): Ctx {
  if (!cached) {
    const game = resolveGame();
    cached = { idx: buildIndex(game.dataDir), loc: new Localization(game.dataDir) };
  }
  return cached;
}

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    "dd_browse",
    {
      description:
        "浏览 Darkest Dungeon 数据目录。无参数列出顶层目录概览;给 subdir 列出该子目录的文件(相对路径)。",
      inputSchema: { subdir: z.string().optional() },
    },
    ({ subdir }) => {
      const { idx } = ctx();
      if (!subdir) {
        const top = new Map<string, number>();
        for (const f of idx.files) {
          const t = f.split("/")[0];
          top.set(t, (top.get(t) ?? 0) + 1);
        }
        return text(
          `数据目录: ${idx.dataDir}\n共 ${idx.files.length} 个文件\n\n` +
            [...top.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([d, n]) => `${d}/ (${n})`)
              .join("\n"),
        );
      }
      const prefix = subdir.replace(/\/+$/, "") + "/";
      const matches = idx.files.filter((f) => f.startsWith(prefix));
      if (matches.length === 0) return text(`子目录不存在: ${subdir}`);
      return text(`${prefix} 下 ${matches.length} 个文件:\n` + matches.slice(0, 200).join("\n") + (matches.length > 200 ? `\n…(其余 ${matches.length - 200} 个省略)` : ""));
    },
  );

  server.registerTool(
    "dd_search",
    {
      description:
        "按内部 ID 全库搜索游戏实体(怪物/英雄/饰品/效果/AI/掉落表/升级树)。返回类别、ID 与摘要。显示名请改用 dd_localization。",
      inputSchema: {
        query: z.string(),
        type: z.enum(["monster", "hero", "trinket", "effect", "brain", "loot", "upgrade"]).optional(),
      },
    },
    ({ query, type }) => {
      const { idx } = ctx();
      const q = query.toLowerCase();
      const sections: string[] = [];
      const want = (t: string) => !type || type === t;
      if (want("monster")) {
        const ms = [...idx.monsters.keys()].filter((k) => k.includes(q));
        if (ms.length) sections.push(`怪物(${ms.length}): ${ms.slice(0, 40).join(", ")}${ms.length > 40 ? " …" : ""}`);
      }
      if (want("hero")) {
        const hs = [...idx.heroes.keys()].filter((k) => k.includes(q));
        if (hs.length) sections.push(`英雄(${hs.length}): ${hs.slice(0, 40).join(", ")}${hs.length > 40 ? " …" : ""}`);
      }
      if (want("trinket")) {
        const ts = idx.trinkets.map((t) => t.id).filter((k) => k.toLowerCase().includes(q));
        if (ts.length) sections.push(`饰品(${ts.length}): ${ts.slice(0, 40).join(", ")}${ts.length > 40 ? " …" : ""}`);
      }
      if (want("effect")) {
        const es = [...idx.effects.keys()].filter((k) => k.toLowerCase().includes(q));
        if (es.length) sections.push(`效果(${es.length}): ${es.slice(0, 40).join(", ")}${es.length > 40 ? " …" : ""}`);
      }
      if (want("brain")) {
        const bs = [...idx.brains.keys()].filter((k) => k.toLowerCase().includes(q));
        if (bs.length) sections.push(`AI brain(${bs.length}): ${bs.slice(0, 30).join(", ")}${bs.length > 30 ? " …" : ""}`);
      }
      if (want("loot")) {
        const ls = idx.loot.map((t) => t.id).filter((k) => k.toLowerCase().includes(q));
        if (ls.length) sections.push(`掉落表(${ls.length}): ${ls.slice(0, 40).join(", ")}${ls.length > 40 ? " …" : ""}`);
      }
      if (want("upgrade")) {
        const us = idx.upgradeTrees.map((t) => t.id).filter((k) => k.toLowerCase().includes(q));
        if (us.length) sections.push(`升级树(${us.length}): ${us.slice(0, 30).join(", ")}${us.length > 30 ? " …" : ""}`);
      }
      return text(sections.length ? sections.join("\n\n") : `未找到 ID 含 "${query}" 的实体。`);
    },
  );

  server.registerTool(
    "dd_get_entity",
    {
      description:
        "获取一个实体的完整聚合数据(属性/技能/交叉引用/本地化名)。支持怪物 ID(如 skeleton_courtier)、英雄 ID、饰品 ID、效果 ID、AI brain ID。",
      inputSchema: { id: z.string(), type: z.enum(["monster", "hero", "trinket", "effect", "brain"]).optional() },
    },
    ({ id, type }) => {
      const { idx, loc } = ctx();
      const hit = type ? { kind: type, ref: id } : findEntity(id, idx);
      if (!hit) return text(`未找到实体 "${id}"。可先用 dd_search 搜索。`);
      switch (hit.kind) {
        case "monster": {
          const def = idx.monsters.get(hit.ref);
          if (!def) return text(`怪物不存在: ${hit.ref}`);
          const nameHint = monsterNames(hit.ref, "A", loc).find((n) => n.lang === "english");
          const head = nameHint ? `\n(英文显示名: ${nameHint.text})\n` : "";
          return text(renderMonster(def, idx, loc) + head);
        }
        case "hero": {
          const def = idx.heroes.get(hit.ref);
          return def ? text(renderHero(def, idx, loc)) : text(`英雄不存在: ${hit.ref}`);
        }
        case "trinket": {
          const r = renderTrinket(hit.ref, idx, loc);
          return r ? text(r) : text(`饰品不存在: ${hit.ref}`);
        }
        case "effect": {
          const r = renderEffect(hit.ref, idx);
          return r ? text(r) : text(`效果不存在: ${hit.ref}`);
        }
        case "brain": {
          const r = renderBrain(hit.ref, idx);
          return r ? text(r) : text(`brain 不存在: ${hit.ref}`);
        }
      }
    },
  );

  server.registerTool(
    "dd_read_file",
    {
      description:
        "读取数据文件。.darkest 文件默认返回解析后的记录列表(parsed=true),也可返回原文;json/xml/csv 直接返回原文。",
      inputSchema: { path: z.string(), parsed: z.boolean().optional() },
    },
    ({ path: rel, parsed }) => {
      const { idx } = ctx();
      const norm = rel.replace(/\\/g, "/").replace(/^\//, "");
      const abs = path.join(idx.dataDir, norm);
      if (!abs.startsWith(path.resolve(idx.dataDir))) return text(`路径越界: ${rel}`);
      if (!fs.existsSync(abs)) return text(`文件不存在: ${rel}`);
      const content = fs.readFileSync(abs, "utf8");
      if (norm.endsWith(".darkest") && parsed !== false) {
        const recs = parseDarkest(content);
        return text(
          `${norm} — ${recs.length} 条记录:\n` +
            recs
              .slice(0, 120)
              .map((r) => `L${r.line} [${r.type}] ${JSON.stringify(r.params)}`)
              .join("\n") +
            (recs.length > 120 ? `\n…(其余 ${recs.length - 120} 条省略)` : ""),
        );
      }
      return text(`${norm}:\n` + content.slice(0, 20000) + (content.length > 20000 ? "\n…(截断)" : ""));
    },
  );

  server.registerTool(
    "dd_localization",
    {
      description:
        "查询本地化。mode=key 按 key 查多语言(xml 散表 + loc2 hash 索引);mode=text 在语言包文本池中搜索(中文名等场景),lang 如 schinese/english/japanese。",
      inputSchema: {
        mode: z.enum(["key", "text"]),
        query: z.string(),
        lang: z.string().optional(),
      },
    },
    ({ mode, query, lang }) => {
      const { loc } = ctx();
      if (mode === "key") {
        const r = loc.byKey(query, (s) => {
          let h = 0;
          const bytes = Buffer.from(s, "utf8");
          for (const b of bytes) h = (Math.imul(h, 53) + b) | 0;
          return h >>> 0;
        });
        if (r.hits.length === 0) {
          return text(
            `key "${query}" 无结果。\n提示:显示名 key 形如 str_monstername_<id>_<档位>;中文若未命中,用 mode=text 搜索。`,
          );
        }
        return text(
          `key "${query}" (hash ${r.hash.toString(16)}):\n` +
            r.hits.map((h) => `- [${h.source}/${h.lang}] ${h.text}`).join("\n"),
        );
      }
      const hits = loc.searchText(query, lang);
      if (hits.length === 0) return text(`文本 "${query}" 无结果。`);
      const grouped = new Map<string, string[]>();
      for (const h of hits) {
        let arr = grouped.get(h.lang);
        if (!arr) grouped.set(h.lang, (arr = []));
        if (arr.length < 25) arr.push(h.text);
      }
      return text(
        `文本 "${query}" 命中:\n` +
          [...grouped.entries()].map(([l, arr]) => `- ${l}(${arr.length}): ${arr.map((s) => `「${s}」`).join(" ")}`).join("\n"),
      );
    },
  );

  server.registerTool(
    "dd_schema",
    {
      description:
        "获取数据格式知识文档(数据架构/文件格式/引用链/mod 结构)。无参数列出主题。",
      inputSchema: { topic: z.string().optional() },
    },
    ({ topic }) => {
      if (!topic) return text("可用主题:\n- " + Object.keys(SCHEMA_TOPICS).join("\n- "));
      const doc = SCHEMA_TOPICS[topic];
      return doc ? text(doc) : text(`未知主题 "${topic}"。可用: ${Object.keys(SCHEMA_TOPICS).join(", ")}`);
    },
  );

  server.registerTool(
    "dd_validate_mod",
    {
      description:
        "校验一个 DD1 mod 目录:路径合法性(是否为有效覆盖/新增)、.darkest 语法、报告与原版的关系。",
      inputSchema: { mod_path: z.string() },
    },
    ({ mod_path: modPath }) => {
      const { idx } = ctx();
      const abs = path.resolve(modPath);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        return text(`目录不存在: ${modPath}`);
      }
      const origSet = new Set(idx.files);
      const topDirs = new Set(idx.files.map((f) => f.split("/")[0]));
      const problems: string[] = [];
      const warnings: string[] = [];
      const overrides: string[] = [];
      const additions: string[] = [];
      const walk = (dir: string, rel = ""): void => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) {
            walk(path.join(dir, e.name), r);
            continue;
          }
          if (!topDirs.has(r.split("/")[0])) {
            problems.push(`未知顶层目录: ${r}`);
            continue;
          }
          if (origSet.has(r)) overrides.push(r);
          else additions.push(r);
          if (r.endsWith(".darkest")) {
            try {
              const recs = parseDarkest(fs.readFileSync(path.join(dir, e.name), "utf8"));
              if (recs.length === 0) warnings.push(`${r}: 未解析出任何记录(空文件或格式错误?)`);
            } catch (err) {
              problems.push(`${r}: 解析失败 (${String(err).slice(0, 100)})`);
            }
          }
        }
      };
      walk(abs);
      return text(
        `mod: ${modPath}\n` +
          `覆盖原版文件 ${overrides.length} 个;新增文件 ${additions.length} 个\n\n` +
          (overrides.length ? `覆盖(前 40):\n  ${overrides.slice(0, 40).join("\n  ")}\n\n` : "") +
          (additions.length ? `新增(前 40):\n  ${additions.slice(0, 40).join("\n  ")}\n\n` : "") +
          (warnings.length ? `警告:\n  ${warnings.slice(0, 30).join("\n  ")}\n\n` : "") +
          (problems.length ? `错误:\n  ${problems.slice(0, 30).join("\n  ")}` : "无错误。"),
      );
    },
  );
}
