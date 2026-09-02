/* 暗黑地牢 · 怪物图鉴 —— 纯静态前端,数据来自游戏文件解析导出的 JSON */
"use strict";

let INDEX = null;
let TYPE_SET = new Set();
let REGION_LIST = []; // [{id, zh, en}]
let activeRegion = "";
let activeType = "";
let currentId = "";
let currentTier = 0;
const detailCache = new Map();

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function regionZh(id) {
  const r = REGION_LIST.find((x) => x.id === id);
  return r ? r.zh : id;
}

function imgTag(m, cls) {
  if (m.image) {
    return `<img class="${cls}" src="${esc(m.image)}" loading="lazy" alt="" onerror="this.classList.add('noimg')">`;
  }
  // 无 wiki 正图的怪物:显示占位符,不展示任何拼贴假图
  return `<span class="${cls} img-ph" title="暂无立绘">☠</span>`;
}

/* ---------- 侧栏 ---------- */
function renderRegionFilter() {
  const box = $("#regionFilter");
  box.innerHTML = "";
  const mk = (label, id) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.classList.toggle("on", activeRegion === id);
    b.addEventListener("click", () => {
      activeRegion = activeRegion === id ? "" : id;
      renderRegionFilter();
      renderList();
    });
    box.appendChild(b);
  };
  mk("全部", "");
  for (const r of REGION_LIST) mk(r.zh, r.id);
}

function renderTypeFilter() {
  const box = $("#typeFilter");
  box.innerHTML = "";
  const mk = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.classList.toggle("on", activeType === label);
    b.addEventListener("click", () => {
      activeType = activeType === label ? "" : label;
      renderTypeFilter();
      renderList();
    });
    box.appendChild(b);
  };
  mk("全部");
  for (const t of [...TYPE_SET].sort((a, b) => a.localeCompare(b, "zh"))) mk(t);
}

function matchRegion(m) {
  if (!activeRegion) return true;
  if (activeRegion === "none") return !m.regions || m.regions.length === 0;
  return (m.regions ?? []).includes(activeRegion);
}

function renderList() {
  const q = $("#search").value.trim().toLowerCase();
  const ul = $("#list");
  ul.innerHTML = "";
  let shown = 0;

  // 按主副本(第一个 region)分组;region 顺序沿用 meta(去重,none 只保留一个)
  const order = [...new Set([...REGION_LIST.map((r) => r.id), "none"])];
  const groups = new Map();
  for (const m of INDEX.monsters) {
    const primary = (m.regions ?? [])[0] ?? "none";
    if (!groups.has(primary)) groups.set(primary, []);
    groups.get(primary).push(m);
  }

  for (const rid of order) {
    const items = groups.get(rid);
    if (!items || !items.length) continue;
    const section = document.createElement("li");
    section.className = "region-header";
    section.textContent = rid === "none" ? "其他 / 未收录" : regionZh(rid);
    ul.appendChild(section);
    for (const m of items) {
      const hay = `${m.id} ${m.name.zh} ${m.name.en} ${m.type ? m.type.zh + " " + m.type.en : ""}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      if (!matchRegion(m)) continue;
      if (activeType && m.type?.zh !== activeType) continue;
      shown++;
      const li = document.createElement("li");
      li.dataset.id = m.id;
      if (m.id === currentId) li.classList.add("sel");
      const regionBadges = (m.regions ?? []).map((r) => `<span class="badge region">${esc(regionZh(r))}</span>`).join("");
      li.innerHTML = `
        ${imgTag(m, "m-img")}
        <div class="m-main">
          <span class="m-zh">${esc(m.name.zh)}</span>
          <span class="m-en">${esc(m.name.en)}</span>
        </div>
        <div class="m-side">
          <span class="badge">${esc(m.type ? m.type.zh : "—")}</span>
          <span class="m-tiers">${m.tiers.map((t) => `<span class="badge tier">${esc(t)}</span>`).join("")}</span>
          ${regionBadges}
        </div>`;
      li.addEventListener("click", () => (location.hash = "#" + m.id));
      ul.appendChild(li);
    }
  }
  $("#count").textContent = `共 ${INDEX.count} 个怪物 · 显示 ${shown} 个`;
}

/* ---------- 点阵 ---------- */
function rankCells(digits, cls) {
  let out = "";
  for (let i = 1; i <= 4; i++) {
    out += `<div class="cell ${digits.includes(i) ? "on-" + cls : ""}">${i}</div>`;
  }
  return `<div class="rank-cells">${out}</div>`;
}

/* ---------- 详情 ---------- */
function fmtPct(v) { return v === undefined || v === null ? "—" : esc(String(v)); }

function skillCard(s) {
  const chips = [];
  if (s.type) chips.push(`<span class="chip">${s.type === "melee" ? "近战" : s.type === "ranged" ? "远程" : esc(s.type)}</span>`);
  if (s.atk) chips.push(`<span class="chip">命中 <b>${esc(s.atk)}</b></span>`);
  if (s.dmg) chips.push(`<span class="chip">伤害 <b>${esc(s.dmg)}</b></span>`);
  if (s.crit) chips.push(`<span class="chip">暴击 <b>${esc(s.crit)}</b></span>`);
  for (const fx of s.effects) chips.push(`<span class="chip fx">${esc(fx)}</span>`);
  return `
  <div class="skill">
    <div>
      <div class="s-name">${esc(s.name.zh)}</div>
      <span class="s-id">${esc(s.name.en)} · ${esc(s.id)}</span>
      <div class="s-chips">${chips.join("")}</div>
    </div>
    <div class="ranks">
      <div class="rank-row"><span class="lbl">它的站位</span>${rankCells(s.launch, "launch")}</div>
      <div class="rank-row"><span class="lbl">打击范围</span>${rankCells(s.target, "target")}</div>
    </div>
    <div></div>
  </div>`;
}

function resBadge(name, color, v) {
  return `<div class="res"><span class="dot" style="background:${color}"></span><span class="name">${name}</span><span class="val">${fmtPct(v)}</span></div>`;
}

function tierPanel(t) {
  const s = t.stats;
  const resHtml = s ? `
    <div class="panel">
      <h3>抗性</h3>
      <div class="res-grid">
        ${resBadge("眩晕", "#c8892e", s.res.stun)}
        ${resBadge("腐蚀", "#86a03c", s.res.poison)}
        ${resBadge("流血", "#b03030", s.res.bleed)}
        ${resBadge("减益", "#9a5aa8", s.res.debuff)}
        ${resBadge("位移", "#4f7fa8", s.res.move)}
      </div>
    </div>` : "";

  const skillsHtml = `
    <div class="panel">
      <h3>技能 (${t.skills.length})</h3>
      <div class="legend">
        <span><span class="sw" style="background:var(--green)"></span>它的站位(可使用该技能的位置)</span>
        <span><span class="sw" style="background:var(--red)"></span>打击范围(可打到你的位置)</span>
      </div>
      ${t.skills.map(skillCard).join("") || '<span class="muted">无技能数据</span>'}
    </div>`;

  const statsHtml = s ? `
    <div class="panel">
      <h3>属性</h3>
      <div class="stats-row">
        <div class="stat"><span class="k">生命 HP</span><span class="v">${fmtPct(s.hp)}</span></div>
        <div class="stat"><span class="k">速度 SPD</span><span class="v spd">${fmtPct(s.spd)}</span></div>
        <div class="stat"><span class="k">闪避 DODGE</span><span class="v dodge">${fmtPct(s.def)}</span></div>
        <div class="stat"><span class="k">防御 PROT</span><span class="v prot">${fmtPct(s.prot)}</span></div>
        ${t.size > 1 ? `<div class="stat"><span class="k">体型</span><span class="v">${t.size} 格</span></div>` : ""}
      </div>
    </div>` : "";

  /* AI 倾向 */
  let brainHtml = "";
  if (t.brain && t.brain.skillDesires.length) {
    const DESIRE_ZH = {
      preferred_skill: "优先技能",
      random_skill: "随机技能",
      heal_skill: "治疗技能",
      specific_skill: "指定技能",
    };
    const maxChance = Math.max(...t.brain.skillDesires.map((d) => Number(d.chance) || 0), 1);
    const nameOf = (d) => {
      if (d.skill) {
        const sk = t.skills.find((x) => x.id === d.skill);
        return sk ? sk.name.zh : d.skill;
      }
      return DESIRE_ZH[d.type] ?? d.type;
    };
    brainHtml = `
    <div class="panel">
      <h3>AI 技能倾向</h3>
      ${t.brain.skillDesires.map((d) => {
        const c = Number(d.chance) || 0;
        return `<div class="brain-skill">
          <span style="min-width:110px">${esc(nameOf(d))}</span>
          <div class="brain-bar-wrap"><div class="brain-bar" style="width:${(c / maxChance) * 100}%"></div></div>
          <span class="brain-pct">权重 ${c}</span>
        </div>`;
      }).join("")}
    </div>`;
  }

  /* 掉落 */
  let lootHtml = "";
  if (t.loot.length) {
    const RARITY_ZH = {
      very_common: "极常见", common: "常见", uncommon: "罕见", rare: "稀有",
      very_rare: "极稀有", ancestral: "祖传", ancestral_shambler: "徘徊者", crystal: "水晶",
    };
    const TYPE_ZH = {
      nothing: "空", table: "掉落表", item: "物品", trinket: "饰品", gem: "传家宝石",
      heirloom: "传家宝", pack: "补给品", journal: "日志页", emblem: "徽记",
    };
    const rows = [];
    for (const tb of t.loot) {
      if (t.loot.length > 1) rows.push(`<div class="muted" style="margin:4px 0 2px">掉落表 ${esc(tb.file)}</div>`);
      for (const e of tb.entries) {
        const d = e.data ?? {};
        let desc = "";
        if (e.type === "table") desc = `→ 掉落表 ${esc(d.table ?? "")}`;
        else if (e.type === "item") desc = `${esc(d.id ?? "")} ×${esc(d.amount ?? 1)}`;
        else if (e.type === "trinket") desc = `饰品(${esc(RARITY_ZH[d.rarity] ?? d.rarity ?? "?")})`;
        else if (e.type in TYPE_ZH) desc = TYPE_ZH[e.type];
        else desc = esc(JSON.stringify(d));
        const label = TYPE_ZH[e.type] && e.type !== "nothing" && e.type !== "table" && e.type !== "item" && e.type !== "trinket" ? TYPE_ZH[e.type] + " " : "";
        rows.push(`<div class="loot-entry"><span class="pct">${esc(String(e.chances ?? ""))}%</span><span>${label}${desc}</span></div>`);
      }
    }
    lootHtml = `<div class="panel"><h3>掉落</h3>${rows.join("")}</div>`;
  }

  const specialHtml = t.deathClass || t.lifeLink ? `
    <div class="panel"><h3>特殊机制</h3><div class="kv-list">
      ${t.deathClass ? `<div class="kv"><span class="k">死亡后</span><span class="v">变为尸体 ${esc(t.deathClass)}</span></div>` : ""}
      ${t.lifeLink ? `<div class="kv"><span class="k">生命链接</span><span class="v">与 ${esc(t.lifeLink)} 联动(召唤机制)</span></div>` : ""}
    </div></div>` : "";

  return statsHtml + resHtml + skillsHtml + brainHtml + lootHtml + specialHtml;
}

function renderDetail(data, indexEntry) {
  const t0 = data.tiers[0];
  const names = t0?.displayName ?? {};
  const zh = names.zh ?? names.en ?? data.id;
  const subs = [];
  if (t0?.enemyType) subs.push(`<span class="badge big">${esc(t0.enemyType.zh)}</span>`);
  subs.push(`<span class="badge big">${esc(data.id)}</span>`);
  if (names.en && names.en !== zh) subs.push(`<span class="muted">${esc(names.en)}</span>`);
  if (names.ja) subs.push(`<span class="muted">${esc(names.ja)}</span>`);
  for (const r of indexEntry?.regions ?? []) subs.push(`<span class="badge big region-badge">${esc(regionZh(r))}</span>`);

  const tabs = data.tiers.map((t, i) =>
    `<button data-i="${i}" class="${i === currentTier ? "on" : ""}">${esc(t.label.zh)} ${esc(t.tier)}</button>`
  ).join("");

  const tier = data.tiers[currentTier] ?? data.tiers[0];

  $("#detail").innerHTML = `
    <div class="detail-head">
      ${imgTag(indexEntry ?? { id: data.id }, "d-img")}
      <div class="detail-head-text">
        <h2>${esc(zh)}</h2>
        <div class="sub">${subs.join("")}</div>
      </div>
    </div>
    <div class="tier-tabs">${tabs}</div>
    <div id="tierBody">${tierPanel(tier)}</div>`;

  for (const b of document.querySelectorAll(".tier-tabs button")) {
    b.addEventListener("click", () => {
      currentTier = Number(b.dataset.i);
      renderDetail(data, indexEntry);
    });
  }
}

async function openMonster(id) {
  currentId = id;
  currentTier = 0;
  renderList();
  const detail = $("#detail");
  if (!detailCache.has(id)) {
    detail.innerHTML = '<div class="loading">读取档案中…</div>';
    try {
      const r = await fetch(`data/monsters/${encodeURIComponent(id)}.json`);
      if (!r.ok) throw new Error(String(r.status));
      detailCache.set(id, await r.json());
    } catch (e) {
      detail.innerHTML = `<div class="loading">读取失败: ${esc(String(e))}</div>`;
      return;
    }
  }
  const indexEntry = INDEX.monsters.find((m) => m.id === id);
  renderDetail(detailCache.get(id), indexEntry);
}

/* ---------- 启动 ---------- */
async function boot() {
  INDEX = await (await fetch("data/index.json")).json();
  REGION_LIST = INDEX.regions ?? [];
  for (const m of INDEX.monsters) if (m.type?.zh) TYPE_SET.add(m.type.zh);
  renderRegionFilter();
  renderTypeFilter();
  renderList();

  $("#search").addEventListener("input", renderList);

  window.addEventListener("hashchange", onHash);
  onHash();
}

function onHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (id && INDEX.monsters.some((m) => m.id === id)) openMonster(id);
}

/* PROTOTYPE:?variant= 存在时由 proto/ 接管,不启动正式 UI */
if (!window.__PROTO_VARIANT) boot();
