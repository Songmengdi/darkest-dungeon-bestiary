<!-- 奇物卷:按副本页签翻看整卷互动图版,点击入灯箱放大 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadCurios, type Curio } from "../../codex";
import { t } from "../../i18n";
import { openLightbox } from "../../lightbox";

const curios = ref<Curio[]>([]);
const err = ref("");
const current = ref("");

onMounted(async () => {
  try {
    curios.value = await loadCurios();
    current.value = curios.value[0]?.key ?? "";
  } catch (e) {
    err.value = String(e);
  }
});
const active = computed(() => curios.value.find((c) => c.key === current.value) ?? null);
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <span class="proto-lang">
          <button
            v-for="c in curios"
            :key="c.key"
            :class="{ on: current === c.key }"
            @click="current = c.key"
          >{{ c.name }}</button>
        </span>
        <span class="bz-count">{{ t("点击图版可放大", "click to zoom") }}</span>
      </div>
      <main class="cx-scroll cx-center">
        <figure v-if="active" class="cu-scrollimg">
          <img
            :src="active.img"
            :alt="active.name"
            @click="openLightbox(active.img, `${t('奇物 ·', 'Curios ·')} ${active.name}`)"
          >
          <figcaption v-if="active.note" class="cu-note">{{ active.note }}</figcaption>
        </figure>
      </main>
    </template>
  </div>
</template>
