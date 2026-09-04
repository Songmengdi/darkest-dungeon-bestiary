<!-- 魔头卷(特殊BOSS):生成条件 + 注意点 + 立绘侧图 -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadBosses, type Boss } from "../../codex";
import { t } from "../../i18n";
import { openLightbox } from "../../lightbox";

const bosses = ref<Boss[]>([]);
const err = ref("");

onMounted(async () => {
  try {
    bosses.value = await loadBosses();
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
        <span class="bz-count">{{ t("共", "Total") }} {{ bosses.length }} 位魔头</span>
      </div>
      <main class="cx-scroll">
        <div class="bs-grid">
          <section v-for="b in bosses" :key="b.current" class="cx-card bs-card">
            <div class="bs-body">
              <h3>{{ b.name }} <i>{{ b.h3 }}</i></h3>
              <p class="bs-cond"><b>{{ t("生成条件", "Trigger") }}</b>{{ b.p }}</p>
              <div class="pm-colhead">{{ t("注意点", "Notes") }}</div>
              <ul class="bs-notes">
                <li v-for="(item, i) in b.li" :key="i">{{ item }}</li>
              </ul>
            </div>
            <div
              v-if="b.img"
              class="bs-art"
              :title="t('点击查看大图', 'view')"
              @click="openLightbox(b.img, b.name)"
            >
              <img :src="b.img" :alt="b.name" loading="lazy">
            </div>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>
