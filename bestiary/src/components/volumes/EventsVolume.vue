<!-- 城镇事件卷:事件卡片墙 —— 搜索 + 事件图 / 效果 / 备注 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadEvents, type TownEvent } from "../../codex";
import { t } from "../../i18n";

const events = ref<TownEvent[]>([]);
const err = ref("");
const q = ref("");

onMounted(async () => {
  try {
    events.value = await loadEvents();
  } catch (e) {
    err.value = String(e);
  }
});

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  if (!query) return events.value;
  return events.value.filter((e) => `${e.name}${e.effect.join()}${e.note}`.toLowerCase().includes(query));
});
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <input v-model="q" class="bz-search" type="search" :placeholder="t('搜索事件名称…', 'search…')" autocomplete="off">
        <span class="bz-count">{{ t("共", "Total") }} {{ events.length }} · {{ t("显示", "shown") }} {{ filtered.length }}</span>
      </div>
      <main class="cx-scroll">
        <div class="cx-trinket-grid">
          <div v-for="(e, i) in filtered" :key="i" class="cx-card cx-trinket">
            <span class="tpic ev"><img :src="e.img" :alt="e.name" loading="lazy"></span>
            <span class="tbody">
              <span class="tname">{{ e.name }} <img v-if="e.tagImg" class="ev-tag" :src="e.tagImg" alt=""></span>
              <ul class="ev-effects"><li v-for="(fx, fi) in e.effect" :key="fi">{{ fx }}</li></ul>
              <span v-if="e.note" class="tnote">{{ e.note }}</span>
            </span>
          </div>
          <div v-if="!filtered.length" class="bz-empty">{{ t("没有匹配的事件", "no match") }}</div>
        </div>
      </main>
    </template>
  </div>
</template>
