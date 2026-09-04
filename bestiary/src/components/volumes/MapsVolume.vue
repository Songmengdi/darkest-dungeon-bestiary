<!-- 秘境卷(地图):BOSS 战地图页签 + 大图 + 灯箱 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadMaps, type MapEntry } from "../../codex";
import { t } from "../../i18n";
import { openLightbox } from "../../lightbox";

const maps = ref<MapEntry[]>([]);
const err = ref("");
const current = ref("");

onMounted(async () => {
  try {
    maps.value = await loadMaps();
    current.value = maps.value[0]?.key ?? "";
  } catch (e) {
    err.value = String(e);
  }
});
const active = computed(() => maps.value.find((m) => m.key === current.value) ?? null);
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <nav class="bz-tabs">
        <button
          v-for="m in maps"
          :key="m.key"
          class="bz-tab"
          :class="{ on: current === m.key }"
          @click="current = m.key"
        >{{ m.name }}</button>
        <span class="bz-count">{{ t("点击地图可放大", "click to zoom") }}</span>
      </nav>
      <main class="cx-scroll cx-center">
        <figure v-if="active" class="cu-scrollimg">
          <img
            :src="active.img"
            :alt="active.name"
            @click="openLightbox(active.img, `${t('秘境 ·', 'Map ·')} ${active.name}`)"
          >
        </figure>
      </main>
    </template>
  </div>
</template>
