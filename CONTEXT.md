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
| **副本** (Region) | 遗迹/荒野/兽窟/湾岸/农场/庭院/城镇/黑暗地牢 + 通用/其他 |
| **语言包** (Localization) | 游戏 `localization/` 下明文 XML 与二进制 `.loc2`;DLC 双包按哈希对齐得英→中映射 |
| **wiki 贴图** | `bestiary/images/`(43MB 源图,入库)+ `enemies.json` 别名表 → 构建期拷入 `public/img/` |
| **灯箱** (Lightbox) | 点击纹章看原画大图的 UI 态(`src/lightbox.ts`) |

## 模块地图(bestiary)

```
lib/                    解析核心(无 UI 知识)
  darkestParser.ts        .darkest 行格式 tokenizer
  loc2Parser/localization 语言包解析 + DLC 英→中对齐
  dataIndex.ts            怪物发现(本体 + 两种 DLC 布局)/loot/brain 索引
  payload.ts              原始记录 → 图鉴 JSON 形状的唯一翻译层(纯函数,契约见 tests/)
  config.ts               DD_GAME_DIR/DD_DATA_DIR + Steam 自动探测
scripts/build.ts         构建编排:装配依赖 → 跑流程 → 写盘(无形状知识)
src/
  types.ts                图鉴 JSON 形状的前端镜像(payload.ts 契约的消费者)
  i18n.ts                 语言态(LANG/t)
  repo.ts                 数据抓取与缓存
  filter.ts               卡片墙过滤(纯函数)
  display.ts              展示辅助与词典
  effect.ts               效果串语义唯一入口(见 ADR-0001)
  fxicons.ts              状态图标资产与元数据
  components/             App / MonsterCard / MonsterModal / RankCells / Lightbox
public/data/             生成但入库(为 diff 可读性,见 ADR-0003)
public/img/              生成不入库,构建时整体清空重建(见 ADR-0002)
```

## 已知未决

- `bestiary/lib/{darkestParser,hash,loc2Parser,config}.ts` 与 `darkest_mcp/src/` 存在字节级相同副本,
  `dataIndex.ts` 已漂移分叉(mcp 缺 DLC 布局)。归一为 monorepo workspace 包是候选方案,未实施。
