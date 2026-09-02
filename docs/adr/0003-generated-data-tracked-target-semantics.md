# ADR-0003 — 生成数据 `public/data` 入库;target 语义在 build 期判定

日期:2026-09-02 · 状态:已接受

## 决策

1. `bestiary/public/data/`(index.json + 153 个怪物 JSON,约 1MB)**跟踪入库**:
   生成物入库换取 git diff 可读性,是数据管线的回归安全网。
2. target 串语义(`~`=范围打击 AOE、`@`=怪物友方、反引号=噪音)在**导出期**
   由 `darkest_mcp/src/export/payload.ts::skillPayload` 判定,产出 `targetAoe`/`targetAlly` 布尔;
   前端(`types.ts`、RankCells、MonsterModal)只消费派生布尔,**不再解读原始串**。

## 理由

语义判定收敛到翻译层一处(见 `darkest_mcp/tests/payload.spec.ts` 契约测试),前端不用每处携带
游戏数据知识;生成 JSON 入库使任何管线回归在 code review 时肉眼可见。
注意:`index.json` 的 `game` 路径已做盘符大小写归一,避免注册表波动污染 diff。

## 修订(2026-09-02,架构重排,见 ADR-0005)

- 产出方由 bestiary `scripts/build.ts` 变为 darkest_mcp `npm run export`;
  payload 契约随迁(`lib/payload.ts` → `darkest_mcp/src/export/payload.ts`)。
- `game` 路径字段**彻底移除**(此前只做盘符归一):机器路径不再入库,换机重建零 diff;
  前端 `IndexFile` 已删该可选字段(本就未消费)。
- `image` 字段由 bestiary `scripts/assets.ts`(资产管线)回写,不属于导出契约。
