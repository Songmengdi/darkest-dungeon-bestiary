/* PROTOTYPE 变体丙 —— 暗黑档案卷
 * 顶部副本页签(仿 wiki) + 英雄档案式主区(左通高立绘 / 右数据列)
 * + 底部胶片条切换怪物。一屏看全,无弹层;立绘点击看原画。 */
(() => {
  const P = window.PROTO;
  const { esc, t, GROUPS, M, liveTiers, regionNames, fxZh, skillTypeZh, rankCells, imgOrPlaceholder } = P;

  const state = { group: "boss", sel: "swine_prince", tier: 0, q: "" };
  const resColors = { stun: "#c8892e", poison: "#86a03c", bleed: "#b03030", debuff: "#9a5aa8", move: "#4f7fa8" };
  const RES_ZH = { stun: ["眩晕", "Stun"], poison: ["腐蚀", "Blight"], bleed: ["流血", "Bleed"], debuff: ["减益", "Debuff"], move: ["位移", "Move"] };

  const root = document.createElement("div");
  root.id = "protoRoot";
  document.body.appendChild(root);

  function render() {
    root.innerHTML = `
      <nav class="pc-tabs">${GROUPS.map((g) => {
        const n = M.filter((m) => m.group === g.id).length;
        return `<button class="pc-tab ${state.group === g.id ? "on" : ""}" data-g="${g.id}">${t(g.zh, g.en)}<span class="n">${n}</span></button>`;
      }).join("")}</nav>
      <div class="pc-topline">
        <input class="pc-search" type="search" placeholder="${t("搜索…", "search…")}" value="${esc(state.q)}">
        ${P.langToggleHtml()}
      </div>
      <main class="pc-main" id="pcMain"></main>
      <footer class="pc-strip" id="pcStrip"></footer>`;

    for (const b of root.querySelectorAll(".pc-tab"))
      b.addEventListener("click", () => {
        state.group = b.dataset.g;
        const first = stripItems()[0];
        state.sel = (first ?? M[0]).id;
        state.tier = 0;
        render();
      });
    root.querySelector(".pc-search").addEventListener("input", (e) => { state.q = e.target.value.trim(); renderStripOnly(); });
    P.bindLang(root, render);
    renderMain();
    renderStrip();
  }

  function stripItems() {
    const q = state.q.toLowerCase();
    return M.filter((m) => m.group === state.group)
      .filter((m) => !q || `${m.id} ${m.name.zh} ${m.name.en}`.toLowerCase().includes(q));
  }

  /* ---------- 主档案 ---------- */
  function renderMain() {
    const m = P.byId(state.sel) ?? M[0];
    const tiers = liveTiers(m);
    if (state.tier >= tiers.length) state.tier = 0;
    const tier = tiers[state.tier] ?? null;
    const main = root.querySelector("#pcMain");

    main.innerHTML = `
      <section class="pc-hero">
        <div class="pc-hero-art" title="${t("点击查看原画", "view art")}">${imgOrPlaceholder(m, "")}</div>
        <div class="pc-nameplate">
          <h2>${t(m.name.zh, m.name.en)}</h2>
          ${P.lang === "zh" ? `<div class="sub">${esc(m.name.en)}</div>` : ""}
          <div class="badges">
            <span class="pc-badge red">${t(m.type.zh, m.type.en)}</span>
            <span class="pc-badge">${t("体型", "Size")} ${m.size}</span>
            ${regionNames(m).map((r) => `<span class="pc-badge">${t(r.zh, r.en)}</span>`).join("")}
          </div>
        </div>
      </section>
      <section class="pc-data">
        ${m.lore ? `<div class="pc-lore">${t(m.lore.zh, m.lore.en)}</div>` : ""}
        ${tiers.length > 1 ? `<div class="pc-sec">${t("档位", "Tier")}</div>
        <div class="pc-tabs" style="border:none;padding:0;gap:6px">${tiers.map((x, i) =>
          `<button class="pc-tab ${i === state.tier ? "on" : ""}" data-i="${i}" style="padding:6px 14px;font-size:13px">${x.tier} · ${t(x.label.zh, x.label.en)}</button>`).join("")}</div>` : ""}
        ${tierBody(tier)}
      </section>`;

    main.querySelector(".pc-hero-art").addEventListener("click", () => m.image && P.openLightbox(m.image, t(m.name.zh, m.name.en)));
    for (const b of main.querySelectorAll(".pc-tab[data-i]"))
      b.addEventListener("click", () => { state.tier = Number(b.dataset.i); renderMain(); });
  }

  function tierBody(tier) {
    const s = tier?.stats;
    if (!tier || (!s && !tier.skills.length)) return `<div class="pc-empty" style="padding:20px 0">${t("无战斗数据(尸体 / 装饰物)", "no combat data")}</div>`;
    let out = "";

    if (s) {
      out += `
      <div class="pc-sec">${t("基础属性", "Stats")}</div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="v">${s.hp}</div><div class="k">HP</div></div>
        <div class="pc-stat"><div class="v g">${s.spd}</div><div class="k">SPD</div></div>
        <div class="pc-stat"><div class="v b">${s.def}%</div><div class="k">DODGE</div></div>
        <div class="pc-stat"><div class="v">${s.prot}%</div><div class="k">PROT</div></div>
      </div>
      <div class="pc-sec">${t("抗性", "Resistances")}</div>
      <div class="pc-res">${Object.entries(s.res).map(([k, v]) => {
        const num = parseInt(String(v), 10) || 0;
        return `<div class="pc-rescell">
          <div class="nm">${t(RES_ZH[k][0], RES_ZH[k][1])}</div>
          <div class="bar"><i style="width:${Math.min(100, Math.max(4, num))}%;background:${resColors[k]}"></i></div>
          <div class="pc">${esc(String(v))}</div>
        </div>`;
      }).join("")}</div>`;
    }

    if (tier.skills.length) {
      out += `<div class="pc-sec">${t("技能", "Skills")} · ${tier.skills.length}</div>`;
      out += tier.skills.map((sk) => `
      <div class="pc-skill">
        <div>
          <div class="sn">${t(sk.name.zh, sk.name.en)}</div>
          <div class="st">${skillTypeZh(sk.type)}</div>
          <div class="sc">
            ${sk.atk ? `<span class="pc-chip">${t("命中", "ACC")} <b>${sk.atk}</b></span>` : ""}
            ${sk.dmg && sk.dmg !== "—" ? `<span class="pc-chip">${t("伤害", "DMG")} <b>${esc(sk.dmg)}</b></span>` : ""}
            ${sk.crit && sk.crit !== "0%" ? `<span class="pc-chip">${t("暴击", "CRIT")} <b>${esc(sk.crit)}</b></span>` : ""}
            ${sk.effects.map((f) => `<span class="pc-chip fx">${esc(fxZh(f))}</span>`).join("")}
          </div>
        </div>
        <div class="pc-ranks">
          ${sk.launch.length ? `<div class="pc-rank"><span class="lbl">${t("站位", "POS")}</span><span class="rr">${rankCells(sk.launch, "launch").replaceAll("cell ", "cellz ").replaceAll("rank-cells", "rr")}</span></div>` : ""}
          ${sk.target.length ? `<div class="pc-rank"><span class="lbl">${t("打击", "HIT")}</span><span class="rr">${rankCells(sk.target, "target").replaceAll("cell ", "cellz ").replaceAll("rank-cells", "rr")}</span></div>` : ""}
        </div>
        <div></div>
      </div>`).join("");
    }

    const brainHtml = tier.brain?.skillDesires?.length ? (() => {
      const max = Math.max(...tier.brain.skillDesires.map((d) => d.chance), 1);
      const nameOf = (d) => d.skill ? (tier.skills.find((x) => x.id === d.skill)?.name ?? { zh: d.skill, en: d.skill }) : { zh: t("随机技能", "Random"), en: "Random" };
      return `
      <div class="pc-sec">${t("AI 倾向", "AI")}</div>
      ${tier.brain.skillDesires.map((d) => `
        <div class="pc-brain-row">
          <span class="nm">${t(nameOf(d).zh, nameOf(d).en)}</span>
          <span class="bar"><i style="width:${(d.chance / max) * 100}%"></i></span>
          <span class="w">×${d.chance}</span>
        </div>`).join("")}`;
    })() : "";

    const lootHtml = tier.loot.length ? `
      <div class="pc-sec">${t("掉落", "Loot")}</div>
      <div class="pc-lootline">${tier.loot.map((l) => `
        <div class="pc-lootrow"><span class="pct">${esc(l.pct)}</span><span class="ln">${esc(l.name)}</span></div>`).join("")}</div>` : "";

    if (brainHtml || lootHtml) out += `<div class="pc-duo">${brainHtml ? `<div>${brainHtml}</div>` : "<div></div>"}${lootHtml ? `<div>${lootHtml}</div>` : "<div></div>"}</div>`;
    return out;
  }

  /* ---------- 底部胶片 ---------- */
  function renderStrip() {
    root.querySelector("#pcStrip").innerHTML = stripItems().map((m) => `
      <div class="pc-cell ${m.id === state.sel ? "sel" : ""}" data-id="${m.id}">
        ${imgOrPlaceholder(m, "")}
        <div class="nm">${t(m.name.zh, m.name.en)}</div>
      </div>`).join("");
    for (const c of root.querySelectorAll(".pc-cell"))
      c.addEventListener("click", () => { state.sel = c.dataset.id; state.tier = 0; renderMain(); renderStrip(); });
  }

  function renderStripOnly() {
    const strip = root.querySelector("#pcStrip");
    strip.innerHTML = "";
    renderStrip();
  }

  render();
})();
