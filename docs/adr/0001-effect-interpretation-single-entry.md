# ADR-0001 — 效果串语义只有 `src/effect.ts` 一个入口

日期:2026-09-02 · 状态:已接受

## 决策

原始效果串(如 `ShamblerBleed 1`)的语义解释——图标匹配与中文文本——只存在于
`bestiary/src/effect.ts` 的单一概念表,唯一接口 `interpretEffect(raw, lang)`。

不接受:第二套图标启发式或文本词典与其并存;调用方自行对原始串做关键词判断。

## 理由

历史上 FX_RULES(fxicons.ts)与 FX_ZH(data.ts)是两套必须互相一致却无人强制一致的
有序表,排序包含坑(Marked/Mark、HealStress/Heal)由人肉维护,并实际产生了
`Miller HealStress` 渲染成「治疗压力」的存量 bug。合并后一致性是结构性质,行为由
`tests/effect.spec.ts` 对 733 条真实效果串的 parity 快照锁定。

## 诚实原则(用户偏好)

匹配不上的首领专属机制串(Ancestor Disrupt、Crow Caw 等 42 种)保持无图标纯文本。
**宁可无图标,不可错图标。** 无图标是 interface 的显式输出,不是缺陷。
