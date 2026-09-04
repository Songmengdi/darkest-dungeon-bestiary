<!-- 图鉴总集:书脊导航 + 卷路由(hash '#/<volume>';裸 '#<id>' 为怪物深链) -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from "vue";
import { parseHash } from "./codex";
import { LANG, setLang, t } from "./i18n";
import CodexRail from "./components/CodexRail.vue";
import Lightbox from "./components/Lightbox.vue";
import MonstersVolume from "./components/volumes/MonstersVolume.vue";
import HeroesVolume from "./components/volumes/HeroesVolume.vue";
import LineupsVolume from "./components/volumes/LineupsVolume.vue";
import TrinketsVolume from "./components/volumes/TrinketsVolume.vue";
import QuirksVolume from "./components/volumes/QuirksVolume.vue";
import CuriosVolume from "./components/volumes/CuriosVolume.vue";
import EventsVolume from "./components/volumes/EventsVolume.vue";
import BossesVolume from "./components/volumes/BossesVolume.vue";
import MapsVolume from "./components/volumes/MapsVolume.vue";
import BuildingsVolume from "./components/volumes/BuildingsVolume.vue";
import SupplyVolume from "./components/volumes/SupplyVolume.vue";
import NotesVolume from "./components/volumes/NotesVolume.vue";

interface VolumeDef { id: string; zh: string; en: string; comp: Component }

const VOLUMES: VolumeDef[] = [
  { id: "monsters", zh: "怪物", en: "Monsters", comp: MonstersVolume },
  { id: "heroes", zh: "英雄", en: "Heroes", comp: HeroesVolume },
  { id: "lineups", zh: "阵容", en: "Lineups", comp: LineupsVolume },
  { id: "trinkets", zh: "饰品", en: "Trinkets", comp: TrinketsVolume },
  { id: "quirks", zh: "怪癖", en: "Quirks", comp: QuirksVolume },
  { id: "curios", zh: "奇物", en: "Curios", comp: CuriosVolume },
  { id: "events", zh: "事件", en: "Events", comp: EventsVolume },
  { id: "bosses", zh: "魔头", en: "Bosses", comp: BossesVolume },
  { id: "maps", zh: "秘境", en: "Maps", comp: MapsVolume },
  { id: "buildings", zh: "建筑", en: "Buildings", comp: BuildingsVolume },
  { id: "supply", zh: "补给", en: "Supply", comp: SupplyVolume },
  { id: "notes", zh: "札记", en: "Notes", comp: NotesVolume },
];

const route = ref(parseHash(location.hash));
const volume = computed(() => VOLUMES.find((v) => v.id === route.value.volume) ?? VOLUMES[0]!);

function nav(id: string): void {
  if (location.hash !== "#/" + id) location.hash = "#/" + id;
  else route.value = parseHash(location.hash);
}
function onHash(): void {
  route.value = parseHash(location.hash);
}
onMounted(() => window.addEventListener("hashchange", onHash));
onUnmounted(() => window.removeEventListener("hashchange", onHash));
</script>

<template>
  <div class="cx-root">
    <CodexRail :volumes="VOLUMES" :current="volume.id" @nav="nav" />
    <div class="cx-frame">
      <header class="cx-head">
        <h1>{{ t("暗黑地牢 · 图鉴总集", "Darkest Dungeon · Codex") }}</h1>
        <span class="cx-head-vol">· {{ t(volume.zh + "卷", volume.en) }}</span>
        <span class="proto-lang cx-lang">
          <button :class="{ on: LANG === 'zh' }" @click="setLang('zh')">中</button>
          <button :class="{ on: LANG === 'en' }" @click="setLang('en')">EN</button>
        </span>
      </header>
      <component :is="volume.comp" :deep-link="volume.id === 'monsters' ? route.monster : ''" />
    </div>
  </div>
  <Lightbox />
</template>
