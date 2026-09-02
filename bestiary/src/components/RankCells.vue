<script setup lang="ts">
import { computed } from "vue";
import { t } from "../i18n";

const props = defineProps<{
  digits: number[];
  kind: "launch" | "target";
  /** 范围打击:同时命中所有 on 的位置(格间连线) */
  aoe?: boolean;
  /** 目标是怪物友方(蓝色显示) */
  ally?: boolean;
}>();

const onCount = computed(() => props.digits.filter((d) => d >= 1 && d <= 4).length);
const link = computed(() => !!props.aoe && onCount.value > 1);
const cells = computed(() => [1, 2, 3, 4].map((i) => ({ i, on: props.digits.includes(i) })));

const title = computed(() => {
  if (props.kind !== "target") return "";
  const side = props.ally ? t("怪物友方", "monster allies") : t("敌方", "enemy");
  return link.value
    ? t(`范围打击:同时命中${side}的这些位置`, `AoE: hits all of these ${side} positions at once`)
    : t(`命中${side}的其中一个位置`, `hits one of these ${side} positions`);
});
</script>

<template>
  <span class="rank-cells" :class="{ aoe: link, ally: !!ally && kind === 'target' }" :title="title">
    <span
      v-for="c in cells"
      :key="c.i"
      class="cellz"
      :class="{ [`on-${props.kind}`]: c.on, 'on-ally': c.on && !!ally && kind === 'target' }"
    >{{ c.i }}</span>
  </span>
</template>
