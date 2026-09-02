# 暗黑地牢 · 怪物图鉴 (DD1 Bestiary)

独立于 MCP 服务的本地 Web 应用。数据**直接解析自本机游戏文件**(非 wiki 转载),覆盖本体 + 全部怪物类 DLC(血色宫廷 / 无光之境 / 破盾者),支持按副本分类浏览。

## 功能

- 按副本分类:遗迹 / 荒野 / 兽窟 / 湾岸 / 农场 / 庭院 / 城镇 / 黑暗地牢 / 通用(归属来自游戏 `dungeons/*.mash.darkest` 官方刷怪表,含 DLC 路径;出现在多个副本的怪物会同时挂多个副本徽章,列表按主副本分组)
- 怪物贴图:来自 darkestdungeon.fandom.com 的官方立绘(`enemies.json` + `images/`,构建时按官方英文名 + 别名表匹配到内部 id;映射细节见 [WIKI-IMAGE-MAPPING.md](WIKI-IMAGE-MAPPING.md)。无正图的怪物(尸体、无尽周畸变等)显示占位符)
- 每个怪物:多语言名(中/英/日;DLC 中文名经双语言包对齐提取)、类型、多难度档属性(HP/速度/闪避/防御)、彩色抗性、技能卡片(**站位 / 打击范围点阵** + 命中/伤害/暴击/效果)、AI 技能倾向、掉落表、特殊机制(尸体/召唤联动)
- 搜索(中文名/英文名/ID/类型)+ 类型筛选;URL 直达(`#skeleton_courtier`)

## 使用

```bash
npm install        # 首次
npm run build      # 解析游戏数据 → public/data + public/img(需要 Node ≥ 23,原生运行 TS)

# 前端(Vue 3 + Vite + TS,羊皮纸图鉴 UI)
npm run dev        # 开发服务器,默认 http://127.0.0.1:5173(端口可用 BESTIARY_PORT 覆盖)
npm run ui-build   # 构建产物 → dist/(public/ 的 data、img 会一并拷入)
npm run serve-dist # 用静态服务器服务 dist/,默认 http://127.0.0.1:8899
```

游戏目录自动探测(Windows 注册表 + Steam libraryfolders.vdf);探测失败时设置环境变量 `DD_GAME_DIR` 指向游戏根目录。端口可用 `BESTIARY_PORT` 覆盖。

## 结构

```
lib/        游戏数据解析核心(.darkest 文本格式 / loc2 语言包(本体+DLC 对齐)/ DLC 明文 XML / 全库索引 / wiki 贴图匹配 / 目录探测)
scripts/    build.ts 数据构建 · serve.ts 静态服务器(BESTIARY_ROOT 可切换服务目录) · probe-spine/dlc-names 探针
index.html  Vite 入口
src/        前端(Vue 3 + Vite + TS):App.vue 卡片墙 + MonsterModal.vue 档案弹层(羊皮纸图鉴风,无滚动条,tabs 压缩信息)
public/     生成的 data/ 与 img/(vite publicDir,构建时随 dist 拷贝)
legacy-ui-vanilla/  旧版原生 JS 前端(已由 Vue 版取代,仅留档)
images/     wiki 立绘原图(源资产,勿删);enemies.json 为其清单
```

## 已知边界

- 无 wiki 正图的怪物(战斗尸体、8磅炮、无尽周畸变系等 15 个)显示 ☠ 占位符,不使用任何拼贴假图
- DLC `.loc2` 哈希与本体不同(实测),DLC 英文名取自明文 XML、中文名取自双包对齐;个别文本若缺失中文则回退英文
- 数据层只读静态文件;D 以上档位(countess D/E/F 等)也有收录,UI 档位签显示"档位 X"
