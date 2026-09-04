# 暗黑地牢 · 图鉴总集 (DD1 Codex)

独立于 MCP 服务的本地 Web 应用。核心是**怪物图鉴**——数据**直接解析自本机游戏文件**(非 wiki 转载),覆盖本体 + 全部怪物类 DLC(血色宫廷 / 无光之境 / 破盾者),支持按副本分类浏览;另有 11 卷整理内容(英雄 / 阵容 / 饰品 / 怪癖 / 奇物 / 事件 / 魔头 / 秘境 / 建筑 / 补给 / 札记),整理自 B 站 UP 主[洛洛丶情愫](https://search.bilibili.com/all?keyword=%E6%B4%9B%E6%B4%9B%E4%B8%B6%E6%83%85%E6%84%AB)的《暗黑地牢资料库》静态包(见文末来源)。左侧书脊导航切卷,hash 路由 `#/<卷>`;裸 `#<怪物id>` 深链不变。

## 卷册

| 卷 | 内容 |
|---|---|
| 怪物 | 原怪物图鉴(卡片墙 + 档案弹层,游戏数据) |
| 英雄 | 19 名英雄图鉴(0→6 级成长 / 装备档属性 / 技能站位点阵 / 抗性 / 扎营)+ 属性评级卡;决斗家 / 逃离者为 Fire's Edge DLC 新英雄,数据取自本机游戏文件 + 官方 wiki,译名用官方简中本地化 |
| 阵容 | 16 套阵容的 4-3-2-1 号位阵图卡,附思路、详解与视频链接 |
| 饰品 | 392 枚饰品卡片墙,搜索 + 来源 / 标签筛选,属性正负染色 |
| 怪癖 | 137 组正 / 负特质对照书页,搜索高亮 + 分类页签 |
| 奇物 | 7 幅副本奇物互动图版,点击灯箱放大 |
| 事件 | 63 个城镇事件卡片 |
| 魔头 | 6 位特殊 BOSS 的生成条件与注意点,附立绘 |
| 秘境 | 9 张 BOSS 战地图(头狼 / 极暗地牢Ⅰ-Ⅳ / 庭院四战) |
| 建筑 | 11 座城镇建筑评级卡 |
| 补给 | 4 副本 × 9 档出征清单,数量可调并自动保存(localStorage) |
| 札记 | 亮度等机制速记 + 命中 95% 上限问答 + 数据来源致谢 |

## 怪物图鉴功能

- 两级分类:普通敌人(75)/ 首领(76);首领下按 **特殊 / 基本 / 庭院 / 农庄 / 极暗** 分页签(分组方式参考洛洛丶情愫《暗黑地牢资料库》),普通敌人按副本分类:遗迹 / 荒野 / 兽窟 / 湾岸 / 农场 / 庭院 / 城镇 / 黑暗地牢 / 通用(归属来自游戏 `dungeons/*.mash.darkest` 官方刷怪表,含 DLC 路径;出现在多个副本的怪物会同时挂多个副本徽章)
- 召唤关联:档案弹层内 **召唤 / 被召唤** 双向链接(如收集者 ⇄ 三颗头颅、死灵法师 ⇄ 骸骨、先祖 ⇄ 复制体),关系来自游戏 `effects/*.darkest` 的 `.summon_monsters` 全量扫描;死亡化形(先祖 → 孕育之心)同样可点击跳转
- 怪物贴图:来自 darkestdungeon.fandom.com 的官方立绘(`enemies.json` + `images/`,构建时按官方英文名 + 别名表匹配到内部 id;映射细节见 [WIKI-IMAGE-MAPPING.md](WIKI-IMAGE-MAPPING.md)。wiki 缺图的农场五色畸变 / 种苗 / 焦点怪取自 dist 参考资料包)。战斗尸体道具(尸骸)不作为怪物收录
- 每个怪物:多语言名(中/英/日;DLC 中文名经双语言包对齐提取)、类型、多难度档属性(HP/速度/闪避/防御)、彩色抗性、技能卡片(**站位 / 打击范围点阵** + 命中/伤害/暴击/效果)、AI 技能倾向、掉落表、特殊机制(化形/召唤联动);血肉 boss 四部件与男爵的颤动卵蛋按战斗形态区分命名
- 搜索(中文名/英文名/ID/类型,跨普通 / 首领全库);URL 直达(`#skeleton_courtier`)

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
src/        前端(Vue 3 + Vite + TS)
  codex.ts          卷册数据类型 / 加载器 / hash 路由解析
  App.vue           书脊导航 + 卷路由
  components/
    CodexRail.vue       书脊导航
    MonsterModal.vue    怪物档案弹层
    HeroModal.vue       英雄档案弹层(共用全局 pm-* 版式)
    volumes/            12 个卷组件(MonstersVolume 为原卡片墙整体平移)
  styles/
    main.css            羊皮纸图鉴主题(变量 / 卡片墙 / 灯箱)
    codex.css           卷册布局 + 档案弹层骨架(全局 pm-*)+ 各卷版式
public/
  data/ img/        怪物卷生成数据与 wiki 贴图(scripts/build.ts 产出,img/ 不入库)
  codex/
    data/            12 卷整理数据 JSON(入库,来源见下)
    img/             12 卷图片资产(入库;整理自资料库静态包,勿与生成的 public/img 混淆)
legacy-ui-vanilla/  旧版原生 JS 前端(已由 Vue 版取代,仅留档)
images/     wiki 立绘原图(源资产,勿删);enemies.json 为其清单
```

## 数据与图片来源

- 怪物数据:游戏文件解析(版权 Red Hook Studios);怪物贴图:darkestdungeon.fandom.com(CC BY-SA)
- 英雄 / 阵容 / 饰品 / 怪癖 / 奇物 / 事件 / 魔头 / 秘境 / 建筑 / 补给 / 札记等 11 卷:整理自 B 站 UP 主[洛洛丶情愫](https://search.bilibili.com/all?keyword=%E6%B4%9B%E6%B4%9B%E4%B8%B6%E6%83%85%E6%84%AB)《暗黑地牢资料库》离线包,数据经脚本归一化(图片路径重写、英雄概览/详档合并、阵容空位解析),仅作图鉴展示用途

## 已知边界

- 战斗尸体道具(尸骸)与纯重复实体不作为独立条目收录:四色种苗(与黑种苗数值完全相同)、拉绳手抓握状态体(drowned_anchored)、CC 复制变体(com_bulrush/cattail/crocodile,D 档数值与本体 C 档一致);狂信者木桩的空 / 满两状态与先祖人形 / 触手两形态保留并改名区分。图鉴现共 143 个条目,全部有图(wiki 为主,农场畸变系取自 dist 参考资料包)
- DLC `.loc2` 哈希与本体不同(实测),DLC 英文名取自明文 XML、中文名取自双包对齐;个别文本若缺失中文则回退英文
- 数据层只读静态文件;D 以上档位(countess D/E/F 等)也有收录,UI 档位签显示"档位 X"
- 原资料库的「怪物详览」表未整合:与怪物卷重叠且为手工整理,游戏数据版更全(其独有列"血量-血月"已由顶栏难度模式血月的 HP ×1.2 修正覆盖);整理数据仍保留在提取产物中,需要时可再补卷
- 整理卷内容为中文(源包即中文);界面框架文案随语言切换,卷内整理文案保持中文
