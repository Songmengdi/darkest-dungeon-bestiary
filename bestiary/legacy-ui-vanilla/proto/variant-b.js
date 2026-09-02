/* PROTOTYPE 变体乙 —— 羊皮纸图鉴页
 * 左窄索引列(按 wiki 分类分组) + 右侧整页卷轴档案:
 * 大标题 → 纹章框立绘 + 出现副本/特殊能力 → 图鉴描述 → 档位书页签 →
 * 属性 → 抗性 → 技能 → 战利品格子阵 → AI 倾向。立绘点击看原画。 */
(() => {
  const P = window.PROTO;
  const { esc, t, GROUPS, M, liveTiers, regionNames, fxZh, skillTypeZh, rankCells, imgOrPlaceholder } = P;

  const state = { q: "", sel: M.find((m) => m.id === "swine_prince").id, tier: 0 };
  const resColors = { stun: "#c8892e", poison: "#86a03c", bleed: "#b03030", debuff: "#9a5aa8", move: "#4f7fa8" };
  const RES_ZH = { stun: ["眩晕", "Stun"], poison: ["腐蚀", "Blight"], bleed: ["流血", "Bleed"], debuff: ["减益", "Debuff"], move: ["位移", "Move"] };

  const root = document.createElement("div");
  root.id = "protoRoot";
  document.body.appendChild(root);

  function render() {
    const q = state.q.toLowerCase();
    root.innerHTML = `
      <aside class="pb-index">
        <div class="pb-idx-head">
          <h1>${t("怪物图鉴", "Bestiary")}</h1>
          ${P.langToggleHtml()}
        </div>
        <input class="pb-search" type="search" placeholder="${t("搜索怪物…", "search…")}" value="${esc(state.q)}">
        <div class="pb-list">${GROUPS.map((g) => {
          const items = M.filter((m) => m.group === g.id)
            .filter((m) => !q || `${m.id} ${m.name.zh} ${m.name.en}`.toLowerCase().includes(q));
          if (!items.length) return "";
          return `<div class="pb-group">${t(g.zh, g.en)}</div>` + items.map((m) => `
            <div class="pb-item ${m.id === state.sel ? "sel" : ""}" data-id="${m.id}">
              ${imgOrPlaceholder(m, "")}
              <div style="min-width:0">
                <span class="nm">${t(m.name.zh, m.name.en)}</span>
                ${P.lang === "zh" ? `<span class="en">${esc(m.name.en)}</span>` : ""}
              </div>
            </div>`).join("");
        }).join("")}</div>
      </aside>
      <main class="pb-stage"><div class="pb-page" id="pbPage"></div></main>`;

    root.querySelector(".pb-search").addEventListener("input", (e) => {
      state.q = e.target.value.trim();
      renderIndexOnly();
    });
    P.bindLang(root, render);
    bindIndex(root);
    renderPage();
  }

  function renderIndexOnly() { /* 搜索时只重绘列表,保持输入框焦点 */
    const stage = root.querySelector(".pb-stage");
    const scroll = stage.scrollTop;
    const q = state.q.toLowerCase();
    root.querySelector(".pb-list").innerHTML = GROUPS.map((g) => {
      const items = M.filter((m) => m.group === g.id)
        .filter((m) => !q || `${m.id} ${m.name.zh} ${m.name.en}`.toLowerCase().includes(q));
      if (!items.length) return "";
      return `<div class="pb-group">${t(g.zh, g.en)}</div>` + items.map((m) => `
        <div class="pb-item ${m.id === state.sel ? "sel" : ""}" data-id="${m.id}">
          ${imgOrPlaceholder(m, "")}
          <div style="min-width:0">
            <span class="nm">${t(m.name.zh, m.name.en)}</span>
            ${P.lang === "zh" ? `<span class="en">${esc(m.name.en)}</span>` : ""}
          </div>
        </div>`).join("");
    }).join("");
    bindIndex(root.querySelector(".pb-list"));
    stage.scrollTop = scroll;
  }

  function bindIndex(scope) {
    for (const el of scope.querySelectorAll(".pb-item")) {
      el.addEventListener("click", () => { state.sel = el.dataset.id; state.tier = 0; renderIndexOnly(); renderPage(); });
    }
  }

  /* ---------- 图鉴页 ---------- */
  function renderPage() {
    const m = P.byId(state.sel);
    const tiers = liveTiers(m);
    if (state.tier >= tiers.length) state.tier = 0;
    const tier = tiers[state.tier] ?? null;
    const page = root.querySelector("#pbPage");

    page.innerHTML = `
      <span class="pb-corner tl">❦</span><span class="pb-corner tr">❦</span>
      <span class="pb-corner bl">❦</span><span class="pb-corner br">❦</span>

      <h2 class="pb-name">${t(m.name.zh, m.name.en)}</h2>
      ${P.lang === "zh" ? `<div class="pb-sub">${esc(m.name.en)}</div>` : ""}
      <div class="pb-rule"><span class="gem">◆</span></div>

      <div class="pb-crest-row">
        <div class="pb-crest" title="${t("点击查看原画", "view art")}">${imgOrPlaceholder(m, "")}</div>
        <div class="pb-info">
          <div class="row"><span class="k">${t("出现副本", "Found in")}</span>
            <span class="v">${regionNames(m).map((r) => `<span class="rbadge">${t(r.zh, r.en)}</span>`).join("") || t("—(召唤物 / 未收录)", "—")}</span></div>
          <div class="row"><span class="k">${t("种属", "Type")}</span><span class="v">${t(m.type.zh, m.type.en)} · ${t("体型", "Size")} ${m.size}</span></div>
          <div class="row"><span class="k">${t("特殊能力", "Ability")}</span><span class="v">${m.ability ? t(m.ability.zh, m.ability.en) : t("无", "None")}</span></div>
          <div class="row"><span class="k">${t("档位", "Tiers")}</span><span class="v">${m.tiers.map((x) => esc(x.tier)).join(" / ")}</span></div>
        </div>
      </div>

      ${m.lore ? `<p class="pb-lore">${t(m.lore.zh, m.lore.en)}</p>` : ""}

      ${tiers.length > 1 ? `
      <div class="pb-tiers">${tiers.map((x, i) =>
        `<button class="${i === state.tier ? "on" : ""}" data-i="${i}">${x.tier} · ${t(x.label.zh, x.label.en)}</button>`).join("")}</div>` : ""}
      <div class="pb-tierbody">${tierBody(tier)}</div>`;

    page.querySelector(".pb-crest").addEventListener("click", () => m.image && P.openLightbox(m.image, t(m.name.zh, m.name.en)));
    for (const b of page.querySelectorAll(".pb-tiers button"))
      b.addEventListener("click", () => { state.tier = Number(b.dataset.i); renderPage(); });
  }

  function tierBody(tier) {
    const s = tier?.stats;
    if (!tier || (!s && !tier.skills.length)) return `<div class="pb-empty">${t("无战斗数据(尸体 / 装饰物)", "no combat data")}</div>`;
    let out = "";

    if (s) {
      out += `
      <div class="pb-sec"><span class="dia">❖</span>${t("属性", "Stats")}<span class="dia">❖</span></div>
      <div class="pb-statrow">
        <div class="pb-stat"><div class="v">${s.hp}</div><div class="k">HP</div></div>
        <div class="pb-stat"><div class="v g">${s.spd}</div><div class="k">SPD</div></div>
        <div class="pb-stat"><div class="v b">${s.def}%</div><div class="k">DODGE</div></div>
        <div class="pb-stat"><div class="v">${s.prot}%</div><div class="k">PROT</div></div>
      </div>
      <div class="pb-sec"><span class="dia">❖</span>${t("抗性", "Resistances")}<span class="dia">❖</span></div>
      <div class="pb-resrow">${Object.entries(s.res).map(([k, v]) => `
        <div class="pb-res"><span class="dot" style="background:${resColors[k]}"></span>
        ${t(RES_ZH[k][0], RES_ZH[k][1])} <span class="val">${esc(String(v))}</span></div>`).join("")}</div>`;
    }

    if (tier.skills.length) {
      out += `<div class="pb-sec"><span class="dia">❖</span>${t("技能", "Skills")} · ${tier.skills.length}<span class="dia">❖</span></div>`;
      out += tier.skills.map((sk) => `
      <div class="pb-skill">
        <div>
          <div class="sn">${t(sk.name.zh, sk.name.en)}</div>
          <div class="st">${skillTypeZh(sk.type)}</div>
          <div class="pb-chips">
            ${sk.atk ? `<span class="pb-chip">${t("命中", "ACC")} <b>${sk.atk}</b></span>` : ""}
            ${sk.dmg && sk.dmg !== "—" ? `<span class="pb-chip">${t("伤害", "DMG")} <b>${esc(sk.dmg)}</b></span>` : ""}
            ${sk.crit && sk.crit !== "0%" ? `<span class="pb-chip">${t("暴击", "CRIT")} <b>${esc(sk.crit)}</b></span>` : ""}
            ${sk.effects.map((f) => `<span class="pb-chip fx">${esc(fxZh(f))}</span>`).join("")}
          </div>
        </div>
        <div class="pb-ranks">
          ${sk.launch.length ? `<div class="pb-rank"><span class="lbl">${t("站位", "Pos")}</span><span class="rr">${rankCells(sk.launch, "launch").replaceAll("cell ", "cellz ").replaceAll("rank-cells", "rr")}</span></div>` : ""}
          ${sk.target.length ? `<div class="pb-rank"><span class="lbl">${t("打击", "Hits")}</span><span class="rr">${rankCells(sk.target, "target").replaceAll("cell ", "cellz ").replaceAll("rank-cells", "rr")}</span></div>` : ""}
        </div>
        <div></div>
      </div>`).join("");
    }

    if (tier.loot.length) {
      out += `
      <div class="pb-sec"><span class="dia">❖</span>${t("战利品", "Loot")}<span class="dia">❖</span></div>
      <div class="pb-loot">${tier.loot.map((l) => `
        <div class="pb-tile">
          <div class="bx ${esc(l.cls)}">${esc(l.name.slice(0, 2))}</div>
          <div class="ln">${esc(l.name)}</div>
          <div class="pc">${esc(l.pct)}</div>
        </div>`).join("")}</div>`;
    }

    if (tier.brain?.skillDesires?.length) {
      const max = Math.max(...tier.brain.skillDesires.map((d) => d.chance), 1);
      const nameOf = (d) => d.skill ? (tier.skills.find((x) => x.id === d.skill)?.name ?? { zh: d.skill, en: d.skill }) : { zh: t("随机技能", "Random"), en: "Random" };
      out += `
      <div class="pb-sec"><span class="dia">❖</span>${t("行为 · AI 倾向", "AI Desires")}<span class="dia">❖</span></div>
      <div class="pb-kvlist">${tier.brain.skillDesires.map((d) => `
        <div class="pb-kv">
          <span class="k">${t(nameOf(d).zh, nameOf(d).en)}</span>
          <span class="bar"><i style="width:${(d.chance / max) * 100}%"></i></span>
          <span class="w">×${d.chance}</span>
        </div>`).join("")}</div>`;
    }
    return out;
  }

  render();
})();
