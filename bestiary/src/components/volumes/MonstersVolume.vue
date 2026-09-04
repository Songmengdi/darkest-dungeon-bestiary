<!-- 怪物卷:普通/首领两级分类(dist 参考资料的分卷方式),首领下按特殊/基本/庭院/农庄/极暗分页签 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { IndexFile, IndexMonster, MonsterDetail } from "../../types";
import { LANG, t } from "../../i18n";
import { loadIndex, loadMonster } from "../../repo";
import { monsterMatchesQuery, monsterMatchesTab, regionTabs } from "../../filter";
import { BOSS_CATS, HIDDEN_MONSTERS, metaOf } from "../../monstersMeta";
import { MODE, MODES, LIGHT, LIGHT_BANDS, lightTip, modeTip } from "../../settings";
import MonsterCard from "../MonsterCard.vue";
import MonsterModal from "../MonsterModal.vue";

const props = defineProps<{ deepLink: string }>();

const index = ref<IndexFile | null>(null);
const loadErr = ref("");

const q = ref("");
const kind = ref<"normal" | "boss">("normal");
const regionTab = ref("all");
const bossTab = ref("special");

const selectedId = ref("");
const detail = ref<MonsterDetail | null>(null);
const detailErr = ref("");

/* ---------- 索引后处理:剔除非怪物实体,套用改名/区域修正 ---------- */
function postprocess(idx: IndexFile): IndexFile {
  idx.monsters = idx.monsters.filter((m) => !HIDDEN_MONSTERS.has(m.id));
  for (const m of idx.monsters) {
    const meta = metaOf(m.id);
    if (!meta) continue;
    if (meta.name) m.name = { ...meta.name };
    if (meta.regions) m.regions = [...meta.regions];
  }
  idx.count = idx.monsters.length;
  return idx;
}

/* ---------- 派生 ---------- */
const tabs = computed(() => (index.value ? regionTabs(index.value) : []));
const bossCats = BOSS_CATS;

function ofKind(m: IndexMonster): "normal" | "boss" {
  return metaOf(m.id)?.bossCat ? "boss" : "normal";
}

const tabCounts = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {};
  if (!index.value) return out;
  for (const m of index.value.monsters) {
    if (ofKind(m) !== kind.value) continue;
    if (kind.value === "normal") {
      for (const tb of tabs.value) {
        if (monsterMatchesTab(m, tb.id)) out[tb.id] = (out[tb.id] ?? 0) + 1;
      }
    } else {
      const cat = metaOf(m.id)!.bossCat!;
      out[cat] = (out[cat] ?? 0) + 1;
    }
  }
  return out;
});

const kindCounts = computed<Record<string, number>>(() => {
  const out = { normal: 0, boss: 0 };
  if (!index.value) return out;
  for (const m of index.value.monsters) out[ofKind(m)]++;
  return out;
});

const filtered = computed<IndexMonster[]>(() => {
  if (!index.value) return [];
  const query = q.value.trim().toLowerCase();
  if (query) {
    // 搜索时跨普通/首领全库匹配,不受页签限制
    return index.value.monsters.filter((m) => monsterMatchesQuery(m, query));
  }
  return index.value.monsters
    .filter((m) => ofKind(m) === kind.value)
    .filter((m) => (kind.value === "normal" ? monsterMatchesTab(m, regionTab.value) : (metaOf(m.id)!.bossCat === bossTab.value)));
});

/* ---------- 怪物打开/关闭(裸 hash 深链) ---------- */
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
  if (location.hash && !location.hash.startsWith("#/")) {
    history.replaceState(null, "", location.pathname + location.search + "#/monsters");
  }
}

function onDeepLink(id: string): void {
  if (id && index.value?.monsters.some((m) => m.id === id)) void select(id);
}
watch(() => props.deepLink, onDeepLink);

/* ---------- 启动 ---------- */
onMounted(async () => {
  try {
    index.value = postprocess(await loadIndex());
  } catch (e) {
    loadErr.value = String(e);
    return;
  }
  onDeepLink(props.deepLink);
});
onUnmounted(() => { /* index 缓存于 repo */ });
</script>

<template>
  <div class="cx-vol">
    <div v-if="loadErr" class="bz-loading">索引加载失败:{{ loadErr }}</div>
    <div v-else-if="!index" class="bz-loading">正在读取图鉴索引…</div>

    <template v-else>
      <div class="cx-toolbar">
        <input
          v-model="q"
          class="bz-search"
          type="search"
          :placeholder="t('搜索怪物(中文名 / 英文名 / ID / 类型)…', 'search…')"
          autocomplete="off"
        >
        <span class="cx-set">
          <span class="set-lbl">{{ t("游戏难度", "Mode") }}</span>
          <span class="proto-lang">
            <button
              v-for="m in MODES"
              :key="m.id"
              :class="{ on: MODE === m.id }"
              :title="modeTip(m)"
              @click="MODE = m.id"
            >{{ LANG === "zh" ? m.zh : m.en }}</button>
          </span>
          <span class="set-lbl">{{ t("亮度", "Light") }}</span>
          <span class="proto-lang">
            <button
              v-for="b in LIGHT_BANDS"
              :key="b.stop"
              :class="{ on: LIGHT === b.stop }"
              :title="lightTip(b, MODE)"
              @click="LIGHT = b.stop"
            >{{ LANG === "zh" ? b.zh : b.en }}</button>
          </span>
        </span>
        <span class="bz-count">{{ t("共", "Total") }} {{ index.count }} · {{ t("显示", "shown") }} {{ filtered.length }}</span>
      </div>

      <nav class="bz-tabs">
        <button
          class="bz-tab"
          :class="{ on: q.trim() ? false : kind === 'normal' }"
          :disabled="!!q.trim()"
          @click="kind = 'normal'"
        >{{ t("普通敌人", "Normal") }}<span class="n">{{ kindCounts.normal }}</span></button>
        <button
          class="bz-tab"
          :class="{ on: q.trim() ? false : kind === 'boss' }"
          :disabled="!!q.trim()"
          @click="kind = 'boss'"
        >{{ t("首领", "Boss") }}<span class="n">{{ kindCounts.boss }}</span></button>
        <template v-if="!q.trim() && kind === 'boss'">
          <span class="cx-tab-sep"></span>
          <button
            v-for="c in bossCats"
            :key="c.id"
            v-show="(tabCounts[c.id] ?? 0) > 0"
            class="bz-tab sub"
            :class="{ on: bossTab === c.id }"
            @click="bossTab = c.id"
          >{{ LANG === "zh" ? c.zh : c.en }}<span class="n">{{ tabCounts[c.id] ?? 0 }}</span></button>
        </template>
        <template v-else-if="!q.trim() && kind === 'normal'">
          <span class="cx-tab-sep"></span>
          <button
            v-for="tb in tabs"
            :key="tb.id"
            v-show="(tabCounts[tb.id] ?? 0) > 0"
            class="bz-tab sub"
            :class="{ on: regionTab === tb.id }"
            @click="regionTab = tb.id"
          >{{ LANG === "zh" ? tb.label : tb.en }}<span class="n">{{ tabCounts[tb.id] ?? 0 }}</span></button>
        </template>
      </nav>

      <main class="bz-grid cx-grow">
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
        @open="openMonster"
      />
    </template>
  </div>
</template>
