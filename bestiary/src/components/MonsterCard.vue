<script setup lang="ts">
import type { IndexFile, IndexMonster } from "../types";
import { LANG, regionBadges, t } from "../data";

const props = defineProps<{
  entry: IndexMonster;
  index: IndexFile;
  selected: boolean;
}>();

defineEmits<{ open: [] }>();
</script>

<template>
  <div class="bz-card" :class="{ sel: props.selected }" @click="$emit('open')">
    <div class="art">
      <img v-if="entry.image" :src="entry.image" loading="lazy" alt="" @error="($event.target as HTMLImageElement).classList.add('noimg')">
      <span v-else class="img-ph" :title="t('暂无立绘', 'no art')">☠</span>
    </div>
    <div class="nm">{{ t(entry.name.zh, entry.name.en) }}</div>
    <span v-if="LANG === 'zh'" class="en">{{ entry.name.en }}</span>
    <div class="tags">
      <span v-if="entry.type" class="bz-chip type">{{ t(entry.type.zh, entry.type.en) }}</span>
      <span v-if="entry.size > 1" class="bz-chip size">{{ t("体型", "Size") }} {{ entry.size }}</span>
      <span class="bz-chip">{{ entry.tiers.join("/") }}</span>
      <span v-for="r in regionBadges(index, entry).slice(0, 2)" :key="r" class="bz-chip region">{{ r }}</span>
    </div>
  </div>
</template>
