/* PROTOTYPE UI 加载器(用完即弃)
 * URL 带 ?variant=a|b|c 时:给 body 打类名,注入对应变体 CSS/JS + 共享件 + 切换条;
 * 无参数时不做任何事(app.js 检查 __PROTO_VARIANT 决定是否启动正式 UI)。
 * 定稿后:删除 proto/ 目录、index.html 中本脚本引用、app.js 中的 guard 即可。 */
(() => {
  const v = new URLSearchParams(location.search).get("variant");
  if (!v || !"abc".includes(v)) return;
  window.__PROTO_VARIANT = v;
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("proto-on", "v-" + v);
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "proto/variant-" + v + ".css";
    document.head.appendChild(css);
    const switchCss = document.createElement("link");
    switchCss.rel = "stylesheet";
    switchCss.href = "proto/switcher.css";
    document.head.appendChild(switchCss);
    for (const f of ["common", "variant-" + v, "switcher"]) {
      const s = document.createElement("script");
      s.src = "proto/" + f + ".js";
      s.async = false; /* 保持执行顺序 */
      document.body.appendChild(s);
    }
  });
})();
