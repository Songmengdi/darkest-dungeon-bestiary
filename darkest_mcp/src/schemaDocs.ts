export const SCHEMA_TOPICS: Record<string, string> = {
  overview: `# Darkest Dungeon 数据架构

- 引擎:Red Hook 自研 C++ 引擎(SDL2/OpenGL/FMOD),无脚本运行时,不可注入代码 mod。
- 全部游戏内容 = 数据文件,位于 <game>/darkestdungeon(Windows/Linux)或 <game>/_osx/Darkest.app/Contents/Resources/data(macOS)。
- mod = 按相同相对路径覆盖数据文件的目录,Steam Workshop 分发。
- 主要数据:heroes/ monsters/ trinkets/ effects/ loot/ upgrades/ raid/(含 ai/)campaign/ dungeons/ curios/ localization/。

关键事实:
- 怪物/英雄目录内按难度档分子目录 _A(学徒)/_B(精英)/_C(冠军)/_D(终极)。
- 显示名 ≠ 内部 ID:wiki 的 "Bone Courtier" 内部 ID 是 skeleton_courtier。`,
  "darkest-format": `# .darkest 文本格式

每行一条记录:record_type: .param value .param2 "quoted value" .multi v1 v2
- 值保留原始文本:百分比(112.5%)、整数、True/False、~12(取反)、"1234"(目标位串)。
- 一个参数可带多个值(.effect "A" "B" / .dmg 6 12)。
- 注释行以 // 或 # 开头。
- 文件编码 UTF-8,可能带 BOM。

解析器输出:每个记录 { type, params(参数→字符串或字符串数组), line }。`,
  "monster-files": `# 怪物数据

monsters/<id>/
  <id>_<tier>/ <id>_<tier>.info.darkest   属性/技能/引用(每档一块,display: .size 开头)
  <id>_<tier>.art.darkest                 武器/护甲外观与技能表现引用
  anim/ fx/ tint.png                      Spine 骨骼动画与特效

info.darkest 记录类型:
  display(enemy size) enemy_type(如 unholy) stats(hp/def/prot/spd/各抗性)
  skill(.id .type .atk .dmg .crit .launch .target .effect 引用效果名)
  loot(.code 引用 loot/loot.json 的表) monster_brain(.id 引用 raid/ai/base.monster_brains.json)
  death_class(尸体) life_link(如 necromancer 召唤) battle_modifier initiative personality

交叉引用链:info.darkest → effects/base.effects.darkest + loot/loot.json + raid/ai/base.monster_brains.json + localization。`,
  "hero-files": `# 英雄数据

heroes/<id>/<id>.info.darkest      resistances/crit/weapon×5/armour×5/combat_skill×N(每技能 .level 0-4)/tag
heroes/<id>/<id>.art.darkest       武器/护甲/皮肤外观引用
upgrades/heroes/<id>.upgrades.json 升级树 trees[](含 currency_cost 与前置)
heroes/<id>/<id>.tagments.json 等   特性/ companion 数据

技能 .launch/.target 是站位串:launch "21"=可在1、2位使用,target "12"=打1、2位,~ 取反,432 之类为多目标串。`,
  "trinket-files": `# 饰品数据

trinkets/base.entries.trinkets.json  entries[]: id/buffs[](引用效果 ID)/rarity/price/limit/hero_class_requirements
trinkets/base.rarities.trinkets.json 稀有度定义
效果本体在 effects/*.effects.darkest(按 buffs 数组里的 ID 查)。
显示名 key:str_inventory_title_<id>(xml 散表有英文)。`,
  localization: `# 本地化机制(实测)

- 语言包:localization/<lang>.loc2,二进制格式:
  header 12 字节(第 3 个 u32 = 字符串池起点)
  字符串池:nul 分隔 UTF-8 明文
  hash 索引:[hash u32][pool 序号 u32][类型=1],按 hash 升序
- key 哈希:h = h*53 + utf8字节(int32 回绕,社区已逆向)
- xml 散表:localization/*.string_table.xml,按 <language id> 分块,含明文 key(英文最全,是 modding 标准)。
- 已知限制:各语言 loc2 是独立构建的 key 集,hash 不能跨语言对齐;
  部分内部 key(如怪物显示名)的明文不在任何散表中,只能 hash 查询或文本搜索。
- 中英对照工作流:dd_localization mode=text 在 schinese 池里搜中文(如"骸骨"),英文显示名走 xml key。`,
  "mod-structure": `# mod 目录结构(官方)

mod 文件夹按 <data>/ 的相对路径组织,只放要覆盖/新增的文件:
  MyMod/
    heroes/mymod_hero/...           新英雄
    localization/english.loc2       语言包(mod 可带自己的 loc2)
    trinkets/base.entries.trinkets.json  (不推荐整文件覆盖,易冲突)
上传 Workshop 需要 .png 预览图与描述文件;本地测试把 mod 目录放入 <data>/mods/ 后在游戏内启用。

校验要点:路径必须在合法顶层目录内;.darkest 文件必须可解析;新 ID 避免与原版冲突;引用的效果/技能/图标必须存在或随 mod 提供。`,
};
