# ADR-0005 — darkest_mcp 是游戏格式知识的唯一所有者;bestiary 是纯 JSON 消费者

日期:2026-09-02 · 状态:已接受

## 背景

bestiary 与 darkest_mcp 各持一份 DD1 格式解析代码:4 个文件字节级相同,
`dataIndex`/`localization` 曾漂移分叉(mcp 缺 DLC 知识),导致 dd_search/dd_get_entity
漏看 **52 个 DLC 怪**(全部血色宫廷 boss 组、全部 CoM、破盾者蛇;本体 101/153 可见)。
评审曾提出 monorepo workspace 共享包(交接候选 4);按 design-it-twice 要求过方案比选后否决。

## 决策

1. **格式知识只活在 darkest_mcp 一处**:解析器(core/)、索引(data/dataIndex)、
   语言包(data/localization)、图鉴形状翻译(export/payload)与 `npm run export` 导出 CLI。
   它也是唯一允许依赖本机游戏安装的项目——其本职即实时读游戏文件,服务 modding。
2. **bestiary 不含任何游戏格式代码**:仓库内无解析器、构建不读游戏;部署只需 `public/` 静态产物。
   数据再生成流程:游戏更新 → darkest_mcp `npm run export` → bestiary `npm run build`
   (assets:wiki 贴图 + 回写 `image` 装饰字段)→ 数据入库提交。
3. 数据形状契约由产出方锁定:`darkest_mcp/src/export/payload.ts` 及其 vitest 契约测试;
   `bestiary/src/types.ts` 是消费端手工镜像,改镜像必对齐产出方。
4. `index.json` 不写机器专属 `game` 路径;`image` 是消费端装饰字段——两者均不属于导出契约,
   smoke 的导出等价性比对据此剥离。

## 备选与否决理由

- **npm workspaces 共享包**(`packages/dd1-format`):结构上消除漂移,但两个用途不同的
  项目在代码层耦合,引入根 package.json 与统一 lockfile。否决。
- **独立 + 同步修复 + 漂移报警**(根级 parity 测试):保留独立性但维持两份代码,
  报警器只是为重复买的保险。否决。
- **维持现状只修盲区**:格式知识仍两份,漂移必然复发(本次即人肉同步失守)。否决。

## 结果

- 等价性证明:新管线(`npm run export`)输出与旧管线入库产物**逐字节一致**
  (153 个怪物 JSON;index.json 仅少 `game` 行,`public/img` 零变化),并固化进 smoke。
- mcp 测试从 `echo Error` 占位符变为 vitest 17 用例(三种布局索引 / loc2 双包对齐 / payload 契约);
  smoke 增加 DLC 可见性与中文名断言,防盲区回归。
