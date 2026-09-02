# ADR-0004 — legacy-ui-vanilla 有意留档;测试基线 = vitest + 快照

日期:2026-09-02 · 状态:已接受

## 决策

1. `bestiary/legacy-ui-vanilla/`(含 proto/ 三变体设计探索)由 Vue 版取代后**保留留档**
   (README 已声明),不迁移、不删除、不接线。归档.zip 是 fx 图标来源存档,同样保留。
2. 前端/管线测试统一用 **vitest**(`npm test`);效果串行为以 733 条真实串的
   parity 快照为基线(`tests/fixtures/effect-snapshot.json`),有意的行为变更必须
   在 `INTENDED_DIFFS` 登记理由,否则 parity 失败。

## 理由

留档是设计定稿的证据,历史已在 git 中但目录内 README 提供即时可见性;
快照基线让「重构不改变行为」成为可机械验证的命题,而非口头承诺。
死代码(已损坏的探针、仅被死代码引用的模块)不受本 ADR 保护,发现即删
(见 commit 79640ed)。
