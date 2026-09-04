<!-- 英雄卷:英雄图鉴卡片墙(0→6 成长速览)+ 属性评级卡;点击英雄打开档案弹层 -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { t } from "../../i18n";
import { loadHeroes, loadRatings, type Hero, type Rating } from "../../codex";
import HeroModal from "../HeroModal.vue";

const heroes = ref<Hero[]>([]);
const err = ref("");
const view = ref<"wall" | "rating">("wall");
const selected = ref<Hero | null>(null);
const ratings = ref<Rating[]>([]);

onMounted(async () => {
  try {
    heroes.value = await loadHeroes();
    ratings.value = await loadRatings();
  } catch (e) {
    err.value = String(e);
  }
});
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <nav class="bz-tabs">
        <button class="bz-tab" :class="{ on: view === 'wall' }" @click="view = 'wall'">{{ t("英雄图鉴", "Roster") }}</button>
        <button class="bz-tab" :class="{ on: view === 'rating' }" @click="view = 'rating'">{{ t("属性评级", "Rating") }}</button>
      </nav>

      <!-- 英雄卡片墙 -->
      <main v-if="view === 'wall'" class="cx-scroll">
        <div class="cx-hero-grid">
          <button v-for="h in heroes" :key="h.id" class="cx-card cx-hero" @click="selected = h">
            <span class="art"><img :src="h.portrait" :alt="h.name"></span>
            <span class="nm">{{ h.name }}<i v-if="h.alias" class="alias">{{ h.alias }}</i></span>
            <span class="grow">
              <span><i>攻击</i>{{ h.overview.level0.attack.replace("-", "~") }} → {{ h.overview.level6.attack.replace("-", "~") }}</span>
              <span><i>血量</i>{{ h.overview.level0.hp }} → {{ h.overview.level6.hp }}</span>
              <span><i>速度</i>{{ h.overview.level0.speed }} → {{ h.overview.level6.speed }}</span>
            </span>
            <span v-if="h.overview.level0.feature" class="feat">{{ h.overview.level0.feature }}</span>
          </button>
        </div>
      </main>

      <!-- 属性评级 -->
      <main v-else class="cx-scroll">
        <div class="cx-notecards">
          <section v-for="a in ratings" :key="a.title" class="cx-notecard">
            <h3>{{ a.title }} <span class="stars">{{ a.stars }}</span></h3>
            <ul><li v-for="(it, i) in a.items" :key="i">{{ it }}</li></ul>
          </section>
        </div>
      </main>
    </template>

    <HeroModal v-if="selected" :hero="selected" @close="selected = null" />
  </div>
</template>
