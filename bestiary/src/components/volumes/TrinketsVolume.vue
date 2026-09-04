<!-- 饰品卷:392 枚饰品卡片墙 —— 搜索 + 来源/标签筛选;属性染色沿用资料库正负规则 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadTrinkets, type Trinket } from "../../codex";
import { t } from "../../i18n";
import { hasMatch } from "../../pinyin";

const items = ref<Trinket[]>([]);
const err = ref("");
const q = ref("");
const originTab = ref("");
const labelTab = ref("");

onMounted(async () => {
  try {
    items.value = await loadTrinkets();
  } catch (e) {
    err.value = String(e);
  }
});

const origins = computed(() => [...new Set(items.value.map((i) => i.origin || "其他"))].sort((a, b) => a.localeCompare(b, "zh")));
const labels = computed(() => {
  const freq = new Map<string, number>();
  for (const it of items.value) for (const l of it.labels) freq.set(l, (freq.get(l) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
});

/** 沿用原资料库的判定:增益绿 / 减益红(+所受/+压力等“对我不利”仍为红) */
function attrClass(s: string): "pos" | "neg" {
  const badBuff = /\+[1-9]\d{0,2}%?\s(所受|食物|自身|被|受到的伤)/.test(s);
  const goodDebuff = /-[1-9]\d{1,2}%\s(所受|队伍|食物|压力|挨饿|被|变身)/.test(s);
  const looksBuff = s.startsWith("+") || s.startsWith("命中") || s.startsWith("击杀");
  return !badBuff && (looksBuff || goodDebuff) ? "pos" : "neg";
}
const attrParts = (a: string) => a.split("; ").filter(Boolean).map((p) => ({ text: p, cls: attrClass(p) }));

/** 稀有度:从标签中识别(PVP 优先),驱动蜡印点与名字/章的染色 */
const RARITY_CLS: Record<string, string> = {
  非常稀有: "r-vrare", 稀有: "r-rare", 优良: "r-fine", 普通: "r-plain", 通用: "r-generic", PVP: "r-pvp",
};
const RARITY_ORDER = ["非常稀有", "稀有", "优良", "普通", "通用"];
const rarityCls = (labels: string[]): string => {
  if (labels.includes("PVP")) return RARITY_CLS.PVP;
  for (const r of RARITY_ORDER) if (labels.includes(r)) return RARITY_CLS[r];
  return "";
};
const isRarityLabel = (l: string) => l in RARITY_CLS;

const filtered = computed(() => {
  const query = q.value.trim();
  return items.value
    .filter((i) => !originTab.value || (i.origin || "其他") === originTab.value)
    .filter((i) => !labelTab.value || i.labels.includes(labelTab.value))
    .filter((i) => !query || hasMatch(`${i.name}${i.attr}${i.labels.join()}${i.note}`, query));
});
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <input v-model="q" class="bz-search" type="search" :placeholder="t('搜索饰品名称 / 属性 / 标签…', 'search…')" autocomplete="off">
        <span class="bz-count">{{ t("共", "Total") }} {{ items.length }} · {{ t("显示", "shown") }} {{ filtered.length }}</span>
      </div>
      <div class="cx-subfilters">
        <button class="bz-filter" :class="{ on: originTab === '' }" @click="originTab = ''">{{ t("全部来源", "All origins") }}</button>
        <button v-for="o in origins" :key="o" class="bz-filter" :class="{ on: originTab === o }" @click="originTab = originTab === o ? '' : o">{{ o }}</button>
        <i class="cx-sep"></i>
        <button class="bz-filter" :class="{ on: labelTab === '' }" @click="labelTab = ''">{{ t("全部标签", "All labels") }}</button>
        <button v-for="l in labels" :key="l" class="bz-filter" :class="{ on: labelTab === l }" @click="labelTab = labelTab === l ? '' : l">{{ l }}</button>
      </div>

      <main class="cx-scroll">
        <div class="cx-trinket-grid">
          <div v-for="(it, i) in filtered" :key="i" class="cx-card cx-trinket">
            <span class="tpic"><img :src="it.img" :alt="it.name" loading="lazy"></span>
            <span class="tbody">
              <span class="tname" :class="rarityCls(it.labels)"><i class="seal" :class="rarityCls(it.labels)"></i>{{ it.name }}</span>
              <span class="tattrs">
                <span v-for="(p, pi) in attrParts(it.attr)" :key="pi" :class="p.cls">{{ p.text }}</span>
              </span>
              <span v-if="it.note" class="tnote">{{ it.note }}</span>
              <span class="tfoot">
                <span v-if="it.origin" class="bz-chip region">{{ it.origin }}</span>
                <span v-for="l in it.labels" :key="l" class="bz-chip" :class="isRarityLabel(l) ? RARITY_CLS[l] : ''">{{ l }}</span>
              </span>
            </span>
          </div>
          <div v-if="!filtered.length" class="bz-empty">{{ t("没有匹配的饰品", "no match") }}</div>
        </div>
      </main>
    </template>
  </div>
</template>
