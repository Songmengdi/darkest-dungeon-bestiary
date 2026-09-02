<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { IndexFile, IndexMonster, MonsterDetail } from "./types";
import { LANG, setLang, t } from "./i18n";
import { loadIndex, loadMonster } from "./repo";
import { monsterMatchesQuery, monsterMatchesTab, regionTabs } from "./filter";
import MonsterCard from "./components/MonsterCard.vue";
import MonsterModal from "./components/MonsterModal.vue";
import Lightbox from "./components/Lightbox.vue";

const index = ref<IndexFile | null>(null);
const loadErr = ref("");

const q = ref("");
const regionTab = ref("all");
const typeTab = ref("");

const selectedId = ref("");
const detail = ref<MonsterDetail | null>(null);
const detailErr = ref("");

/* ---------- 派生 ---------- */
const tabs = computed(() => (index.value ? regionTabs(index.value) : []));

const typeList = computed<string[]>(() => {
  if (!index.value) return [];
  const set = new Set<string>();
  for (const m of index.value.monsters) if (m.type?.zh) set.add(m.type.zh);
  return [...set].sort((a, b) => a.localeCompare(b, "zh"));
});

const tabCounts = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {};
  if (!index.value) return out;
  for (const tb of tabs.value) {
    out[tb.id] = index.value.monsters.filter((m) => monsterMatchesTab(m, tb.id)).length;
  }
  return out;
});

const filtered = computed<IndexMonster[]>(() => {
  if (!index.value) return [];
  const query = q.value.trim().toLowerCase();
  return index.value.monsters
    .filter((m) => monsterMatchesTab(m, regionTab.value))
    .filter((m) => monsterMatchesQuery(m, query))
    .filter((m) => !typeTab.value || m.type?.zh === typeTab.value);
});

/* ---------- 怪物打开/关闭(hash 深链) ---------- */
function openMonster(id: string): void {
  if (location.hash !== "#" + id) location.hash = "#" + id;
  else void select(id);
}

async function select(id: string): Promise<void> {
  selectedId.value = id;
  detail.value = null;
  detailErr.value = "";
  try {
    detail.value = await loadMonster(id);
  } catch (e) {
    detailErr.value = String(e);
  }
}

function closeModal(): void {
  selectedId.value = "";
  detail.value = null;
  detailErr.value = "";
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

function onHash(): void {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (id && index.value?.monsters.some((m) => m.id === id)) void select(id);
}

/* ---------- 启动 ---------- */
onMounted(async () => {
  try {
    index.value = await loadIndex();
  } catch (e) {
    loadErr.value = String(e);
    return;
  }
  window.addEventListener("hashchange", onHash);
  onHash();
});
onUnmounted(() => window.removeEventListener("hashchange", onHash));
</script>

<template>
  <!-- 首屏加载/错误 -->
  <div v-if="loadErr" class="bz-loading">索引加载失败:{{ loadErr }}</div>
  <div v-else-if="!index" class="bz-loading">正在读取图鉴索引…</div>

  <template v-else>
    <header class="bz-top">
      <h1 class="bz-title">{{ t("暗黑地牢 · 怪物图鉴", "Darkest Dungeon · Bestiary") }}</h1>
      <input
        v-model="q"
        class="bz-search"
        type="search"
        :placeholder="t('搜索怪物(中文名 / 英文名 / ID / 类型)…', 'search…')"
        autocomplete="off"
      >
      <span class="proto-lang">
        <button :class="{ on: LANG === 'zh' }" @click="setLang('zh')">中</button>
        <button :class="{ on: LANG === 'en' }" @click="setLang('en')">EN</button>
      </span>
      <span class="bz-count">{{ t("共", "Total") }} {{ index.count }} · {{ t("显示", "shown") }} {{ filtered.length }}</span>
    </header>

    <nav class="bz-tabs">
      <button
        v-for="tb in tabs"
        :key="tb.id"
        class="bz-tab"
        :class="{ on: regionTab === tb.id }"
        @click="regionTab = tb.id"
      >{{ LANG === "zh" ? tb.label : tb.en }}<span class="n">{{ tabCounts[tb.id] ?? 0 }}</span></button>
    </nav>

    <div class="bz-filters">
      <button class="bz-filter" :class="{ on: typeTab === '' }" @click="typeTab = ''">{{ t("全部类型", "All types") }}</button>
      <button
        v-for="ty in typeList"
        :key="ty"
        class="bz-filter"
        :class="{ on: typeTab === ty }"
        @click="typeTab = typeTab === ty ? '' : ty"
      >{{ ty }}</button>
    </div>

    <main class="bz-grid">
      <MonsterCard
        v-for="m in filtered"
        :key="m.id"
        :entry="m"
        :index="index"
        :selected="m.id === selectedId"
        @open="openMonster(m.id)"
      />
      <div v-if="!filtered.length" class="bz-empty">{{ t("没有匹配的怪物", "no match") }}</div>
    </main>

    <!-- 档案弹层 -->
    <div v-if="selectedId && !detail && !detailErr" class="bz-modal" @click.self="closeModal()">
      <div class="bz-sheet"><div class="bz-loading">{{ t("读取档案中…", "loading…") }}</div></div>
    </div>
    <div v-else-if="selectedId && detailErr" class="bz-modal" @click.self="closeModal()">
      <div class="bz-sheet"><div class="bz-loading">{{ t("读取失败", "failed") }}: {{ detailErr }}</div></div>
    </div>
    <MonsterModal
      v-else-if="selectedId && detail && index"
      :entry="index.monsters.find((m) => m.id === selectedId)!"
      :detail="detail"
      :index="index"
      @close="closeModal()"
    />
  </template>

  <Lightbox />
</template>
