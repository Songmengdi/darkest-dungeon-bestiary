# CONTEXT.md — 领域词汇表与模块地图

暗黑地牢1 怪物图鉴 monorepo 的统一语言。讨论/提交/文档请使用这些词,不要另造同义词。

## 领域词汇

| 词汇 | 含义 |
|---|---|
| **怪物** (Monster) | 图鉴条目,按 `id` 唯一(如 `skeleton_courtier`);153 个 |
| **档位** (Tier) | 怪物的强度分级 A/B/C = 学徒/资深/冠军;部分怪只有部分档位(空档隐藏) |
| **技能** (Skill) | 档位下的攻击/增益/治疗行为,含站位格与打击格 |
| **站位/打击** (launch/target) | 1..4 的位置数字串;launch=怪站在哪,target=打哪里 |
| **范围打击** (AOE) | target 串带 `~` 前缀:同时命中所有列出位置(UI:格间贯穿连线) |
| **友方目标** | target 串带 `@` 前缀:目标是怪物友方(UI:蓝格 +「友方」标签) |
| **效果串** (Effect string) | 技能 effects 的原始英文串(如 `ShamblerBleed 1`);语义解释唯一入口见 `bestiary/src/effect.ts` |
| **状态图标** (Status icon) | wiki 状态图标(`src/assets/fx/*.png`),由效果串解释结果挂载 |
| **副本** (Region) | 遗迹/荒野/兽窟/湾岸/农场/庭院/城镇/黑暗地牢 + 通用/其他;归属由 mash 文件导出期判定 |
| **语言包** (Localization) | 游戏 `localization/` 下明文 XML 与二进制 `.loc2`;DLC 双包按哈希对齐得英→中映射(唯一实现在 darkest_mcp) |
| **数据契约** (Data contract) | 图鉴 JSON 形状;产出方 `darkest_mcp/src/export/payload.ts` 锁定,`bestiary/src/types.ts` 是消费端镜像 |
| **wiki 贴图** | `bestiary/images/`(43MB 源图,入库)+ `enemies.json` 别名表 → assets 管线拷入 `public/img/` 并回写 `image` 字段 |
| **灯箱** (Lightbox) | 点击纹章看原画大图的 UI 态(`src/lightbox.ts`) |

## 架构总纲

**darkest_mcp 是 DD1 游戏格式知识的唯一所有者**(ADR-0005),也是唯一依赖本机游戏安装的项目;
**bestiary 是纯 JSON 消费者**,仓库内无解析代码、部署不碰游戏。数据只朝一个方向流动:

```
游戏文件 → darkest_mcp npm run export → bestiary/public/data(入库) → bestiary 前端
                                                    └→ bestiary npm run build(assets:贴图装饰)
```

## 模块地图(bestiary,纯前端 + 自有资产)

```
lib/wikiImages.ts        wiki 贴图索引与匹配(自有资产知识,非游戏格式)
scripts/assets.ts        资产管线:读 index.json → 拷 public/img → 回写 image(零游戏知识)
scripts/serve.ts         静态服务器(dev/dist 双模式)
src/
  types.ts                图鉴 JSON 形状的消费端镜像(契约见 darkest_mcp/src/export/payload.ts)
  i18n.ts                 语言态(LANG/t)
  repo.ts                 数据抓取与缓存
  filter.ts               卡片墙过滤(纯函数)
  display.ts              展示辅助与词典
  effect.ts               效果串语义唯一入口(见 ADR-0001)
  fxicons.ts              状态图标资产与元数据
  lightbox.ts             灯箱 UI 态
  components/             App / MonsterCard / MonsterModal / RankCells / Lightbox
public/data/             生成但入库;产出方 = darkest_mcp npm run export(ADR-0003/0005)
public/img/              生成不入库,npm run build 整体清空重建(ADR-0002)
```

## 模块地图(darkest_mcp,格式知识唯一所有者)

```
src/core/                .darkest 行格式 tokenizer / .loc2 二进制解析 / ddHash
src/config.ts            DD_GAME_DIR/DD_DATA_DIR 解析 + Steam 注册表自动探测
src/data/dataIndex.ts    怪物发现(本体 + 两种 DLC 布局)与英雄/饰品/效果/AI/掉落/升级树索引
src/data/localization.ts 语言包装配(本体 + DLC)+ 双包英→中对齐(zhByEn)
src/data/entities.ts     MCP 查询展示层(实体渲染;DLC 怪名走 zhByEn 回退)
src/export/              图鉴导出:payload 形状契约 / regions 副本归属 / bestiary 装配
src/tools.ts             7 个 MCP 工具(browse/search/get_entity/read_file/localization/schema/validate_mod)
scripts/export.ts        CLI:npm run export -- [outDir](默认 bestiary/public/data)
scripts/smoke.mts        端到端冒烟:工具面 + DLC 断言 + 导出等价性比对
tests/                   vitest:三种布局索引 / loc2 双包对齐 / payload 契约
dist/                    tsc 产物(bin dd-mcp),不入库
```

## 数据再生成流程(游戏更新后)

1. darkest_mcp:`npm run build && npm test && npm run smoke && npm run export`
2. bestiary:`npm run build`(assets 装饰贴图)→ 肉眼过一遍数据 diff → 提交
3. bestiary 部署物 = `public/` + `vite build` 产物,全程不需要游戏安装
