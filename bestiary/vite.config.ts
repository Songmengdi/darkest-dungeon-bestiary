import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 图鉴前端(Vue3)。数据与贴图走 public/(data/ 与 img/ 由 scripts/build.ts 生成,勿手改)。
export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.BESTIARY_PORT ?? 5173),
    host: "127.0.0.1",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // 状态图标(src/assets/fx/*.png)不内联进 JS:独立文件按需加载,JS 保持小巧
    assetsInlineLimit: 0,
  },
});
