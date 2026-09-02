# ADR-0003 — 生成数据 `public/data` 入库;target 语义在 build 期判定

日期:2026-09-02 · 状态:已接受

## 决策

1. `bestiary/public/data/`(index.json + 153 个怪物 JSON,约 1MB)**跟踪入库**:
   生成物入库换取 git diff 可读性,是数据管线的回归安全网。
2. target 串语义(`~`=范围打击 AOE、`@`=怪物友方、反引号=噪音)在 **build 期**
   由 `lib/payload.ts::skillPayload` 判定,产出 `targetAoe`/`targetAlly` 布尔;
   前端(`types.ts`、RankCells、MonsterModal)只消费派生布尔,**不再解读原始串**。

## 理由

语义判定收敛到翻译层一处(见 `tests/payload.spec.ts` 契约测试),前端不用每处携带
游戏数据知识;生成 JSON 入库使任何管线回归在 code review 时肉眼可见。
注意:`index.json` 的 `game` 路径已做盘符大小写归一,避免注册表波动污染 diff。
