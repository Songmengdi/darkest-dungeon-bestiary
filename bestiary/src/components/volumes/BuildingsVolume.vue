<!-- 建筑卷:城镇建筑评级卡 -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadBuildings, type Building } from "../../codex";
import { t } from "../../i18n";

const buildings = ref<Building[]>([]);
const err = ref("");

onMounted(async () => {
  try {
    buildings.value = await loadBuildings();
  } catch (e) {
    err.value = String(e);
  }
});
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <span class="bz-count">{{ t("共", "Total") }} {{ buildings.length }} {{ t("座建筑", "buildings") }}</span>
      </div>
      <main class="cx-scroll">
        <div class="cx-notecards three">
          <section v-for="b in buildings" :key="b.title" class="cx-notecard">
            <h3>{{ b.title }} <span class="stars">{{ b.stars }}</span></h3>
            <ul>
              <li v-for="(it, i) in b.items" :key="i" :class="{ sub: it.startsWith('└') }">{{ it.replace(/^└\s*/, "") }}</li>
            </ul>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>
