# wiki 贴图映射报告

日期:2026-09-02(接续 2026-09-02 交接文档的贴图攻坚)
数据源:`enemies.json`(自 [darkestdungeon.fandom.com](https://darkestdungeon.fandom.com/wiki/Enemies_(Darkest_Dungeon)) 整理,142 条 / 122 唯一怪)+ `images/*.png`(136 张)。

## 结果总览

| 指标 | 数值 |
|---|---|
| 怪物总数(本体 101 + DLC 52) | **153** |
| 有 wiki 正图的怪物 | **138**(别名表命中 33 + 名称匹配 105) |
| 无图怪物 | 15(全部是 wiki 抓取里本就没有的:尸骸×2、8磅炮、UNUSED 幕布、无尽周畸变 seed_*/seedling_* ×10、焦点怪) |
| 未使用的 wiki 图 | 7(重锤兵、 pulsating-egg、两个效果图标、fracture-2/3/4 灰晶簇) |

旧的 99 张 Spine 拼贴图已**全部删除**,`public/img/` 只保留 wiki 正图;每次 `npm run build` 都会清空重建该目录。

## 匹配方法(诚实汇报:哪些是实测、哪些是推测)

1. **名称自动匹配(105 个,实测可信)**:怪物官方英文名(本体来自 loc2 语言包,DLC 来自明文 XML 字符串表)归一化后与 wiki 名对齐。归一化规则:去 `the` 前缀、去标点、去空白(如 "Barrel 'o Bombs" ↔ "Barrel O' Bombs")。
2. **手动别名表 `lib/wikiImages.ts` OVERRIDES(33 个)**:
   - **游戏英文名 ≠ wiki 名**(实测,由官方本地化文本证实):necromancer(Necromancer Apprentice)、hag(Wizened Hag)、crow(Callous Shrieker)、drowned_captain(Sodden Crew)、drowned_anchor/anchored(Drowned Puller,wiki 名 Drowned Anchorman)、shambler_tentacle(Shambler Sycophant)、snake_big_adder(Death Adder);
   - **多部件怪共享完整图**(目检确认):formless_* ×4 → flesh.png;cauldron_* → cauldron.png;statue_hand/shield → garden-guardian-2/3(血泉/石盾,目检确认);prophet 的 pew_small/medium/large → prophet-2/3/4(按大小/破损度对应,目检);fanatic 的 pyre_* → the-fanatic-2(同一柴堆);
   - **多形态家族(目检 + 推测)**:ancestor_small → ancestor.png(人形)、ancestor_big → ancestor-2.png(触手形态);collector_battle/protect/shaman → the-collector-2/3/4(三个"被收集者"头部,**三者在英雄身份上的具体对应为推测**,按 wiki 抓取顺序分配);body_average/bloated → emaciated-body-2/3(**推测**);spire → fracture.png。

## DLC 数据层扩展(本次一并完成)

- `lib/dataIndex.ts`:怪物发现兼容三种布局——本体 `monsters/<id>/`、CoM/破盾者 `dlc/*/monsters/<id>/`、血色宫廷 `dlc/*/features/crimson_court/monsters/<id>/`。
- **重要实测发现:DLC 的 `.loc2` 语言包哈希与本体 ddHash 不同**(用 CC XML 全部 884 个键反向核对,只有 9 个哈希吻合),因此 DLC 无法按 key 直查 loc2。为此:
  - **英文**取自 DLC 明文 `*.string_table.xml`(`<language id="english">`,条目全为 CDATA,现有 XML 解析器直接兼容);
  - **中文**用"english/schinese 双包主索引按哈希升序逐位对齐"提取英→中文本映射(`lib/localization.ts` 的 `alignDlcZh`,偏移搜索 ±4)。已验证:Baron→男爵、castellan(Gatekeeper)→守门人、tick_zombie(Supplicant)→乞血者、steward(Manservant)→男仆、Galaxy(The Sleeper)→沉睡者等;技能名同样生效(baron:必要的管教/强迫演出/饥渴…)。
- 副本归属:DLC mash 路径自动识别(`farm` 区域已归并为 `farmstead`)。
- 探针留存:`scripts/probe-dlc-names.ts`(`node scripts/probe-dlc-names.ts`)可随时重查 DLC 怪物名表。

## 未使用 wiki 图的原因

| 图 | 原因 |
|---|---|
| brigand-pounder.png | 游戏数据中不存在独立的重锤兵怪物(weald boss mash = 大炮+点火兵等组合),无内部 id 可挂 |
| pulsating-egg.png | 男爵之卵无独立怪物定义 |
| buff-self-*.png、bleed-3.png | 技能效果图标,非怪物 |
| fracture-2/3/4.png | Fracture 战斗的其余碎块只有一个内部 id(`spire`),灰晶簇与 seedling_(未完成的畸变)从命名到形态都对不上,不强行配 |

## 已知边界

- countess 档位为 D/E/F、baron 为 A/B(忠实于游戏文件);UI 档位签对 D 以上显示"档位 X"。
- baron 档 A 在游戏文件里只有 art 没有 info,详情页该档为空面板(数据忠实)。
- DLC loc2 的未知哈希函数未逆向(不影响功能,`zhByEn` 对齐法已覆盖怪物名/技能名等主要文本;若个别中文缺失,前端回退显示英文)。
