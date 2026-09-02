/* PROTOTYPE 变体甲 —— 图鉴卡片墙
 * 结构:顶部标签页(常见/各副本/首领,参考 wiki) + 卡片网格;
 * 点卡片 → 全屏弹层档案(纹章框立绘 + 分档数据 + 战利品格子)。
 * 独立于变体乙/丙:布局、信息层级、主交互(网格+弹层)均为本变体私有。 */
(() => {
  const P = window.PROTO;
  const { esc, t, GROUPS, M, liveTiers, regionText, fxZh, skillTypeZh, rankCells, imgOrPlaceholder } = P;

  const state = { group: "common", q: "", sel: null, tier: 0 };

  const root = document.createElement("div");
  root.id = "protoRoot";
  document.body.appendChild(root);

  const resColors = { stun: "#c8892e", poison: "#86a03c", bleed: "#b03030", debuff: "#9a5aa8", move: "#4f7fa8" };
  const RES_ZH = { stun: ["眩晕", "Stun"], poison: ["腐蚀", "Blight"], bleed: ["流血", "Bleed"], debuff: ["减益", "Debuff"], move: ["位移", "Move"] };

  function render() {
    root.innerHTML = `
      <header class="pa-top">
        <h1 class="pa-title">${t("怪物图鉴", "Bestiary")}</h1>
        <div class="pa-tabs">${GROUPS.map((g) => {
          const n = M.filter((m) => m.group === g.id).length;
          return `<button class="pa-tab ${state.group === g.id ? "on" : ""}" data-g="${g.id}">${t(g.zh, g.en)}<span class="n">${n}</span></button>`;
        }).join("")}</div>
        <input class="pa-search" type="search" placeholder="${t("搜索…", "search…")}" value="${esc(state.q)}">
        ${P.langToggleHtml()}
        <span class="pa-count">${t("已收录", "Found")} ${M.length}/${M.length}</span>
      </header>
      <main class="pa-grid">${
        filtered().map(cardHtml).join("") ||
        `<div class="pa-empty">${t("没有匹配的怪物", "no match")}</div>`
      }</main>`;

    for (const b of root.querySelectorAll(".pa-tab"))
      b.addEventListener("click", () => { state.group = b.dataset.g; render(); });
    const s = root.querySelector(".pa-search");
    s.addEventListener("input", () => { state.q = s.value.trim().toLowerCase(); renderGridOnly(); });
    s.focus();
    P.bindLang(root, render);
    for (const c of root.querySelectorAll(".pa-card"))
      c.addEventListener("click", () => { state.sel = c.dataset.id; state.tier = 0; renderModal(); });
  }

  /* 搜索只重绘网格,避免输入框失焦 */
  let gridEl = null;
  function renderGridOnly() {
    gridEl = gridEl ?? root.querySelector(".pa-grid");
    gridEl.innerHTML = filtered().map(cardHtml).join("") || `<div class="pa-empty">${t("没有匹配的怪物", "no match")}</div>`;
    for (const c of gridEl.querySelectorAll(".pa-card"))
      c.addEventListener("click", () => { state.sel = c.dataset.id; state.tier = 0; renderModal(); });
  }

  function filtered() {
    return M.filter((m) => m.group === state.group)
      .filter((m) => {
        if (!state.q) return true;
        return `${m.id} ${m.name.zh} ${m.name.en} ${m.type.zh} ${m.type.en}`.toLowerCase().includes(state.q);
      });
  }

  function cardHtml(m) {
    return `
    <div class="pa-card" data-id="${m.id}">
      <div class="pa-art">${imgOrPlaceholder(m, "")}</div>
      <div class="nm">${t(m.name.zh, m.name.en)}</div>
      ${P.lang === "zh" ? `<span class="en">${esc(m.name.en)}</span>` : ""}
      <div class="tags">
        <span class="pa-chip type">${t(m.type.zh, m.type.en)}</span>
        ${m.size > 1 ? `<span class="pa-chip size">${t("体型", "Size")} ${m.size}</span>` : ""}
        <span class="pa-chip">${m.tiers.map((x) => x.tier).join("/")}</span>
      </div>
    </div>`;
  }

  /* ---------- 弹层档案 ---------- */
  function renderModal() {
    document.querySelector(".pa-modal")?.remove();
    if (!state.sel) return;
    const m = P.byId(state.sel);
    const tiers = liveTiers(m); /* 隐藏空档 */
    if (state.tier >= tiers.length) state.tier = 0;
    const tier = tiers[state.tier] ?? null;

    const modal = document.createElement("div");
    modal.className = "pa-modal";
    modal.innerHTML = `
      <div class="pa-sheet">
        <button class="pa-close" title="${t("关闭", "close")}">✕</button>
        <div class="pa-sheet-main">
          <div class="pa-portrait" title="${t("点击查看原画", "view art")}">${imgOrPlaceholder(m, "")}</div>
          <div class="pa-headline">
            <h2>${t(m.name.zh, m.name.en)}</h2>
            ${P.lang === "zh" ? `<span class="en-name">${esc(m.name.en)}</span>` : ""}
            <div><span class="pa-seal">${t(m.type.zh, m.type.en)} · ${t("体型", "Size")} ${m.size}</span></div>
            <dl class="pa-kv">
              <div><dt>${t("出现副本", "Found in")}</dt><dd>${esc(regionText(m))}</dd></div>
              ${m.ability ? `<div><dt>${t("特殊能力", "Ability")}</dt><dd>${t(m.ability.zh, m.ability.en)}</dd></div>` : ""}
            </dl>
            ${m.lore ? `<p class="pa-lore">${t(m.lore.zh, m.lore.en)}</p>` : ""}
          </div>
        </div>
        ${tiers.length > 1 ? `
        <div class="pa-tierbar">${tiers.map((x, i) =>
          `<button class="${i === state.tier ? "on" : ""}" data-i="${i}"><b>${x.tier}</b>${t(x.label.zh, x.label.en)}</button>`).join("")}
        </div>` : ""}
        ${tierBody(tier)}
      </div>`;

    modal.querySelector(".pa-close").addEventListener("click", () => { modal.remove(); state.sel = null; });
    modal.addEventListener("click", (e) => { if (e.target === modal) { modal.remove(); state.sel = null; } });
    for (const b of modal.querySelectorAll(".pa-tierbar button"))
      b.addEventListener("click", () => { state.tier = Number(b.dataset.i); renderModal(); });
    modal.querySelector(".pa-portrait").addEventListener("click", () => m.image && P.openLightbox(m.image, t(m.name.zh, m.name.en)));
    document.body.appendChild(modal);
  }

  function tierBody(tier) {
    const s = tier?.stats;
    if (!tier || (!s && !tier.skills.length)) return `<div class="pa-empty">${t("无战斗数据(尸体/装饰)", "no combat data")}</div>`;
    let out = "";
    if (s) {
      out += `
      <div class="pa-panel-title">${t("属性", "Stats")}</div>
      <div class="pa-stats">
        <div class="pa-stat"><span class="k">HP</span><span class="v">${s.hp}</span></div>
        <div class="pa-stat"><span class="k">SPD</span><span class="v g">${s.spd}</span></div>
        <div class="pa-stat"><span class="k">DODGE</span><span class="v b">${s.def}%</span></div>
        <div class="pa-stat"><span class="k">PROT</span><span class="v">${s.prot}%</span></div>
      </div>
      <div class="pa-panel-title">${t("抗性", "Resistances")}</div>
      <div class="pa-res">${Object.entries(s.res).map(([k, v]) => {
        const num = parseInt(String(v), 10) || 0;
        return `<div class="pa-res-row">
          <span class="dot" style="background:${resColors[k]}"></span>
          <span style="width:28px;color:var(--pa-muted)">${t(RES_ZH[k][0], RES_ZH[k][1])}</span>
          <span class="bar"><i style="width:${Math.min(100, Math.max(4, num))}%;background:${num >= 80 ? resColors[k] : "rgba(0,0,0,0)"}"></i></span>
          <span class="pc">${esc(String(v))}</span>
        </div>`;
      }).join("")}</div>`;
    }
    if (tier.skills.length) {
      out += `
      <div class="pa-panel-title">${t("技能", "Skills")} ${tier.skills.length}</div>
      ${tier.skills.map((sk) => `
      <div class="pa-skill">
        <div>
          <div class="sn">${t(sk.name.zh, sk.name.en)}</div>
          <div class="st">${skillTypeZh(sk.type)}</div>
          <div class="sc">
            ${sk.atk ? `<span class="pa-chip">${t("命中", "ACC")} ${sk.atk}</span>` : ""}
            ${sk.dmg && sk.dmg !== "—" ? `<span class="pa-chip">${t("伤害", "DMG")} <b>${esc(sk.dmg)}</b></span>` : ""}
            ${sk.crit && sk.crit !== "0%" ? `<span class="pa-chip">${t("暴击", "CRIT")} ${esc(sk.crit)}</span>` : ""}
            ${sk.effects.map((f) => `<span class="pa-chip fx">${esc(fxZh(f))}</span>`).join("")}
          </div>
        </div>
        <div class="pa-ranks">
          ${sk.launch.length ? `<span class="rr"><span class="rl">${t("站位", "Pos")}</span>${rankCells(sk.launch, "launch").replaceAll("cell", "cellz").replaceAll("rank-cells", "")}</span>` : ""}
          ${sk.target.length ? `<span class="rr"><span class="rl">${t("打击", "Hits")}</span>${rankCells(sk.target, "target").replaceAll("cell", "cellz").replaceAll("rank-cells", "")}</span>` : ""}
        </div>
        <div></div>
      </div>`).join("")}`;
    }
    if (tier.loot.length) {
      out += `
      <div class="pa-panel-title">${t("战利品", "Loot")}</div>
      <div class="pa-loot">${tier.loot.map((l) => `
        <div class="pa-tile">
          <div class="bx ${esc(l.cls)}">${esc(l.name.slice(0, 2))}</div>
          <div class="pc">${esc(l.pct)}</div>
          <div class="ln">${esc(l.name)}</div>
        </div>`).join("")}</div>`;
    }
    if (tier.brain?.skillDesires?.length) {
      const max = Math.max(...tier.brain.skillDesires.map((d) => d.chance), 1);
      const nameOf = (d) => d.skill ? (tier.skills.find((x) => x.id === d.skill)?.name ?? { zh: d.skill, en: d.skill }) : { zh: t("随机技能", "Random"), en: "Random" };
      out += `
      <div class="pa-panel-title">${t("AI 倾向", "AI")}</div>
      <div class="pa-brain">${tier.brain.skillDesires.map((d) => `
        <div class="pa-brain-row">
          <span class="nm">${t(nameOf(d).zh, nameOf(d).en)}</span>
          <span class="bar"><i style="width:${(d.chance / max) * 100}%"></i></span>
          <span class="w">×${d.chance}</span>
        </div>`).join("")}</div>`;
    }
    return out;
  }

  render();
})();
