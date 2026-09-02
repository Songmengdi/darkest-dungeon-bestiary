# ADR-0002 — `public/img` 是纯生成物;静态资产禁止放入

日期:2026-09-02 · 状态:已接受

## 决策

`bestiary/public/img/` 只存放构建期产物(wiki 贴图拷贝),每次 `npm run build`
**整体清空重建**(`fs.rmSync`)。任何手工放置的静态资产一律放 `bestiary/src/assets/`
(经 Vite 资源管线引用),并设 `assetsInlineLimit: 0` 防小图内联膨胀 JS。

## 理由

状态图标曾放在 `public/img/fx/`,一次数据重建把图标全部清空,事故排查后迁移至
`src/assets/fx/`。此决策把该事故固化为规则,避免未来任何人再把静态资产放回生成目录。
