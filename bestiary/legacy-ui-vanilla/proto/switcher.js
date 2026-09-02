/* PROTOTYPE —— 底部浮动切换条(用完即弃)
 * ‹ › 循环切换 ?variant=a|b|c;键盘 ← → 同效;样式刻意与页面反差。 */
(() => {
  const VARIANTS = [
    { k: "a", name: "甲 · 图鉴卡片墙" },
    { k: "b", name: "乙 · 羊皮纸图鉴页" },
    { k: "c", name: "丙 · 暗黑档案卷" },
  ];
  const cur = window.__PROTO_VARIANT;
  const idx = VARIANTS.findIndex((v) => v.k === cur);
  if (idx < 0) return;

  const bar = document.createElement("div");
  bar.id = "protoBar";
  bar.innerHTML = `
    <button class="pb-arrow" data-d="-1" title="上一个变体 (←)">‹</button>
    <span class="pb-label"></span>
    <button class="pb-arrow" data-d="1" title="下一个变体 (→)">›</button>`;
  const label = bar.querySelector(".pb-label");
  const paint = () => {
    const v = VARIANTS[idx];
    label.innerHTML = `<b>${v.k.toUpperCase()}</b> — ${v.name}`;
  };
  const go = (d) => {
    const next = VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length];
    const u = new URL(location.href);
    u.searchParams.set("variant", next.k);
    location.href = u.href; /* 保留 hash(当前怪物)与 lang */
  };
  for (const b of bar.querySelectorAll(".pb-arrow")) {
    b.addEventListener("click", () => go(Number(b.dataset.d)));
  }
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input,textarea,[contenteditable]")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
  paint();
  document.body.appendChild(bar);
})();
