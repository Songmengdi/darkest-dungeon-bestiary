<!-- 补给卷:出征清单 —— 按副本页签,数量可调并自动保存(localStorage);建议备注置顶 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadSupply, type SupplyRow } from "../../codex";
import { t } from "../../i18n";

const ITEMS: { key: keyof Omit<SupplyRow, "difficulty" | "note">; zh: string; en: string }[] = [
  { key: "food", zh: "食物", en: "Food" },
  { key: "shovel", zh: "铁铲", en: "Shovel" },
  { key: "antidote", zh: "解毒剂", en: "Antidote" },
  { key: "bandage", zh: "绷带", en: "Bandage" },
  { key: "herb", zh: "药草", en: "Herb" },
  { key: "passkey", zh: "万能钥匙", en: "Key" },
  { key: "elixir", zh: "圣水", en: "Holy water" },
  { key: "laudanum", zh: "鸦片酊", en: "Laudanum" },
  { key: "torch", zh: "火把", en: "Torch" },
  { key: "dust", zh: "碎片尘埃", en: "Dust" },
  { key: "blood", zh: "血酿", en: "Blood" },
  { key: "scale", zh: "护体之鳞", en: "Scale" },
];

const STORE_KEY = "dd-codex-supply";
let rawDefaults: SupplyRow[] = [];
const defaults = ref<SupplyRow[]>([]);
const rows = ref<SupplyRow[]>([]);
const err = ref("");
const tab = ref("");

onMounted(async () => {
  try {
    rawDefaults = await loadSupply();
    defaults.value = rawDefaults;
    let saved: SupplyRow[] | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    } catch { saved = null; }
    rows.value = saved ?? structuredClone(rawDefaults);
    tab.value = tabs.value[0] ?? "";
  } catch (e) {
    err.value = String(e);
  }
});

const tabOf = (r: SupplyRow): string =>
  Array.isArray(r.difficulty) ? r.difficulty.join("") : r.difficulty.slice(0, 2);
const tabs = computed(() => [...new Set(defaults.value.map(tabOf))]);

const shown = computed(() => rows.value.filter((r) => tabOf(r) === tab.value));
const tabNotes = computed(() =>
  shown.value.flatMap((r) => (r.note.length ? [`【${diffLabel(r)}】${r.note.join(";")}`] : [])));

const diffLabel = (r: SupplyRow): string =>
  Array.isArray(r.difficulty) ? r.difficulty.join("") : r.difficulty.slice(2);

function persist(): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(rows.value));
}
function bump(r: SupplyRow, key: (typeof ITEMS)[number]["key"], delta: number): void {
  const v = r[key] as number;
  if (v + delta < 0) return;
  r[key] = v + delta;
  persist();
}
function resetAll(): void {
  rows.value = structuredClone(rawDefaults);
  persist();
}
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <span class="proto-lang">
          <button v-for="tb in tabs" :key="tb" :class="{ on: tab === tb }" @click="tab = tb">{{ tb }}</button>
        </span>
        <span class="bz-count">{{ t("数量改动自动保存 · ", "autosaved · ") }}</span>
        <button class="cx-reset" @click="resetAll">{{ t("重置", "Reset") }}</button>
      </div>

      <main class="cx-scroll">
        <ul v-if="tabNotes.length" class="sp-tips">
          <li v-for="(n, i) in tabNotes" :key="i">{{ n }}</li>
        </ul>
        <div class="cx-notecards one">
          <section class="cx-notecard">
            <div class="sp-table">
              <div class="sp-row head">
                <span class="sp-diff">{{ t("难度", "Difficulty") }}</span>
                <span v-for="it in ITEMS" :key="it.key" class="sp-cell">{{ t(it.zh, it.en) }}</span>
              </div>
              <div v-for="r in shown" :key="diffLabel(r)" class="sp-row">
                <span class="sp-diff">{{ diffLabel(r) }}</span>
                <span v-for="it in ITEMS" :key="it.key" class="sp-cell">
                  <span class="sp-stepper">
                    <button :title="t('减一', '-1')" @click="bump(r, it.key, -1)">−</button>
                    <b>{{ r[it.key] }}</b>
                    <button :title="t('加一', '+1')" @click="bump(r, it.key, +1)">＋</button>
                  </span>
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>
