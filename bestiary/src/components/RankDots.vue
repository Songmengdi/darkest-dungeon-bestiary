<!-- 8 点式站位/打击面指示器:实心=有效(站位墨、打击红、友方蓝),空心=无效;AoE 连线;打击(敌方)按战场朝向镜像;参考游戏内点阵设计 -->
<!-- 无效位若用实心深色会在羊皮纸底上反客为主(有效位暖白又近乎隐形),故反转对比:有效实心、无效空心 -->
<script setup lang="ts">
import { computed } from "vue";
import { t } from "../i18n";

const props = defineProps<{
  digits: number[];
  kind: "launch" | "target";
  /** 范围打击:同时命中所有列出的位置(点亮圆点间连线) */
  aoe?: boolean;
  /** 目标是怪物友方(蓝色) */
  ally?: boolean;
}>();

const DOT = 9;
const GAP = 7;

// 怪物占战场右侧:站位 1→4 从左到右;打击命中左侧英雄,按英雄半场朝向镜像(1 号位贴近中场,两边大中间小)
const colRank = (col: number) => (props.kind === "target" && !props.ally ? 4 - col : col + 1);
const cells = computed(() => [0, 1, 2, 3].map((col) => ({ i: col, on: props.digits.includes(colRank(col)) })));
const onIdx = computed(() => [0, 1, 2, 3].map((col) => (props.digits.includes(colRank(col)) ? col : -1)).filter((n) => n >= 0));
const link = computed(() => !!props.aoe && onIdx.value.length > 1 && props.kind === "target");

const lineStyle = computed(() => {
  if (!link.value) return {};
  const a = onIdx.value[0]!;
  const b = onIdx.value[onIdx.value.length - 1]!;
  return {
    left: `${a * (DOT + GAP) + DOT / 2}px`,
    width: `${(b - a) * (DOT + GAP)}px`,
  };
});

const title = computed(() => {
  const on = props.digits.filter((d) => d >= 1 && d <= 4);
  if (!on.length) return "";
  if (props.kind === "launch") return t(`可从站位 ${on.join("、")} 使用`, `usable from ranks ${on.join(", ")}`);
  const side = props.ally ? t("怪物友方", "monster allies") : t("敌方", "enemy");
  return link.value
    ? t(`范围打击:同时命中${side}的 ${on.join("、")} 号位`, `AoE: hits ${side} ranks ${on.join(", ")} at once`)
    : t(`命中${side}的其中一个位置(${on.join("、")})`, `hits one of ${side} ranks (${on.join(", ")})`);
});
</script>

<template>
  <span class="rank-dots" :class="[kind, { link, ally: !!ally && kind === 'target' }]" :title="title">
    <i v-for="c in cells" :key="c.i" :class="{ on: c.on }"></i>
    <span v-if="link" class="line" :style="lineStyle"></span>
  </span>
</template>

<style scoped>
.rank-dots { position: relative; display: inline-flex; gap: 7px; align-items: center; }
.rank-dots i {
  width: 9px; height: 9px; border-radius: 50%;
  background: transparent; border: 1px solid rgba(58, 42, 18, 0.45);
}
.rank-dots.launch i.on { background: var(--ink); border-color: var(--ink); }
.rank-dots.target i.on { background: #b33a30; border-color: #b33a30; box-shadow: 0 0 4px rgba(179, 58, 48, 0.4); }
.rank-dots.target.ally i.on { background: #5b87ad; border-color: #5b87ad; box-shadow: 0 0 4px rgba(91, 135, 173, 0.4); }
.rank-dots .line { position: absolute; top: 50%; height: 2px; margin-top: -1px; background: #b33a30; }
.rank-dots.ally .line { background: #5b87ad; }
</style>
