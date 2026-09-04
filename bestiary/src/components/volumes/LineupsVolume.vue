<!-- 阵容卷:阵图卡 —— 4/3/2/1 号位立绘站位 + 适用性 + 思路 + 展开详解 -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadLineups, type Hero, type Lineup } from "../../codex";
import { t } from "../../i18n";

const lineups = ref<Lineup[]>([]);
const err = ref("");
const expanded = ref(new Set<number>());

onMounted(async () => {
  try {
    lineups.value = await loadLineups();
  } catch (e) {
    err.value = String(e);
  }
});
const heroesIn = (slot: Lineup["slots"][number]): Hero[] => slot.filter((h): h is Hero => !!h);
const toggle = (i: number): void => {
  const next = new Set(expanded.value);
  if (next.has(i)) next.delete(i);
  else next.add(i);
  expanded.value = next;
};
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <span class="bz-count">{{ t("共", "Total") }} {{ lineups.length }} 套阵容</span>
      </div>
      <main class="cx-scroll">
        <div class="lu-grid">
          <section v-for="(l, i) in lineups" :key="i" class="cx-card lu-card">
            <div class="lu-row">
              <div v-for="(slot, si) in [...l.slots].reverse()" :key="si" class="lu-slot">
                <i class="rank">{{ 4 - si }}{{ t("号", "") }}</i>
                <template v-if="heroesIn(slot).length">
                  <span v-for="(h, hi) in heroesIn(slot)" :key="hi" class="lu-hero" :title="h.name">
                    <img :src="h.portrait" :alt="h.name" loading="lazy">
                    <em>{{ h.name }}</em>
                  </span>
                </template>
                <span v-else class="lu-blank">{{ t("空位", "empty") }}</span>
              </div>
            </div>
            <div class="lu-meta">
              <span class="bz-chip type">{{ l.applicability }}</span>
              <span class="lu-feature">{{ l.feature }}</span>
            </div>
            <button v-if="l.details.length" class="lu-more" @click="toggle(i)">
              {{ expanded.has(i) ? t("收起详解 ▲", "collapse ▲") : t("展开详解 ▼", "details ▼") }}
            </button>
            <ul v-if="expanded.has(i) && l.details.length" class="lu-details">
              <li v-for="(d, di) in l.details" :key="di">{{ d }}</li>
            </ul>
            <div v-if="l.href || l.href2" class="lu-links">
              <a v-if="l.href" :href="l.href" target="_blank" rel="noopener noreferrer">{{ t("视频讲解 ↗", "video ↗") }}</a>
              <a v-if="l.href2" :href="l.href2" target="_blank" rel="noopener noreferrer">{{ t("实战实录 ↗", "playthrough ↗") }}</a>
            </div>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>
