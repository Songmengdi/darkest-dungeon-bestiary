# darkest-dungeon-mcp

给 AI Agent 用的 **Darkest Dungeon(一代)** MCP 服务器。把游戏的全部数据文件解析成结构化知识,帮助 Agent 快速理解游戏数据、验证 mod 开发。纯外部进程,不改游戏文件,macOS / Windows / Linux 全平台兼容。

## 能力

| 工具 | 说明 |
|---|---|
| `dd_browse` | 浏览数据目录结构(约 1.3 万个文件) |
| `dd_search` | 按内部 ID 全库搜索:怪物/英雄/饰品/效果/AI brain/掉落表/升级树 |
| `dd_get_entity` | 实体聚合:属性/技能/难度档/交叉引用(loot、AI、效果)/多语言显示名 |
| `dd_read_file` | 读数据文件,`.darkest` 自定义格式自动解析成记录 |
| `dd_localization` | 多语言查询:key→12 种语言显示名(含简中);或文本池搜索 |
| `dd_schema` | 内置数据格式知识库(架构/格式/引用链/mod 结构) |
| `dd_validate_mod` | 校验 mod 目录:路径合法性、`.darkest` 语法、覆盖/新增报告 |

典型查询:`skeleton_courtier`(wiki 显示名 Bone Courtier / 骸骨官僚)→ 三个难度档的完整属性、技能、掉落表、AI 决策、12 语言名称。

## 前置要求

- Node.js ≥ 18
- 已安装 Darkest Dungeon(Steam 版;GOG 等亦可,手动指定目录即可)

游戏目录自动探测(Steam 常见安装路径;Windows 下额外读取注册表 + `libraryfolders.vdf`,非默认盘的 Steam 库也能找到。macOS/Windows/Linux 全平台)。探测失败时设置环境变量 `DD_GAME_DIR` 指向游戏根目录:

```
# Windows 示例
DD_GAME_DIR=C:\Program Files (x86)\Steam\steamapps\common\DarkestDungeon
# macOS 示例(通常无需设置)
DD_GAME_DIR=~/Library/Application Support/Steam/steamapps/common/DarkestDungeon
```

## 构建

```bash
npm install
npm run build     # 产出 dist/
npm run smoke     # 可选:对真实游戏数据跑协议级冒烟测试
```

## 接入

### Claude Code

```bash
claude mcp add dd-mcp -- node /绝对路径/darkest_dungeon_mod/dist/index.js
# Windows 如需指定游戏目录:
claude mcp add dd-mcp --env DD_GAME_DIR="C:\Program Files (x86)\Steam\steamapps\common\DarkestDungeon" -- node C:\绝对路径\darkest_dungeon_mod\dist\index.js
```

### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dd-mcp": {
      "command": "node",
      "args": ["/绝对路径/darkest_dungeon_mod/dist/index.js"]
    }
  }
}
```

### 任意 MCP 客户端

stdio transport,启动命令 `node dist/index.js`,单实例即可。

## 项目结构

```
src/
├── index.ts            # MCP server 入口(stdio)
├── config.ts           # 跨平台游戏目录探测(自动 + DD_GAME_DIR)
├── tools.ts            # 7 个 MCP 工具
├── schemaDocs.ts       # 数据格式知识库
├── core/
│   ├── hash.ts         # DD1 字符串哈希(h*53+b,32 位回绕)
│   ├── darkestParser.ts# .darkest 文本格式解析(record: .param value)
│   └── loc2Parser.ts   # loc2 二进制语言包解析(hash 索引 + 字符串池)
└── data/
    ├── dataIndex.ts    # 全库扫描与实体索引
    ├── localization.ts # 多语言:xml 散表 + loc2 语言包
    └── entities.ts     # 实体聚合与渲染
scripts/smoke.mts       # MCP 协议级冒烟测试
```

## 已知边界

- 各语言 `.loc2` 是独立编译产物,hash 索引不能跨语言对齐;跨语言请用 key(xml 散表)或文本搜索。
- 数据层只读静态文件;运行时状态(战斗中数值)不在本期范围。
- 只支持一代(Darkest Dungeon 1);二代是 Unity 引擎,不适用。
