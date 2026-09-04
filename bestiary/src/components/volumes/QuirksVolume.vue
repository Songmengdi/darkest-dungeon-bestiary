<!-- 怪癖卷:翻开书式的正/负特质对照页 —— 搜索 + 分类页签 -->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { loadQuirks, type QuirkGroup } from "../../codex";
import { t } from "../../i18n";

const groups = ref<QuirkGroup[]>([]);
const err = ref("");
const q = ref("");
const catTab = ref("");

onMounted(async () => {
  try {
    groups.value = await loadQuirks();
  } catch (e) {
    err.value = String(e);
  }
});

const categories = computed(() => [...new Set(groups.value.map((g) => g.category))]);

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase();
  return groups.value
    .filter((g) => !catTab.value || g.category === catTab.value)
    .filter((g) => {
      if (!query) return true;
      const hay = (side: QuirkGroup["positive"]) =>
        side ? `${side.name}${side.effect}`.toLowerCase().includes(query) : false;
      return hay(g.positive) || hay(g.negative);
    });
});

/** 安全高亮:拆段渲染,不拼 HTML */
function hi(text: string, query: string): { text: string; hit: boolean }[] {
  if (!query) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  const lower = text.toLowerCase();
  const ql = query.toLowerCase();
  let pos = 0;
  for (;;) {
    const at = lower.indexOf(ql, pos);
    if (at < 0) {
      if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
      break;
    }
    if (at > pos) out.push({ text: text.slice(pos, at), hit: false });
    out.push({ text: text.slice(at, at + ql.length), hit: true });
    pos = at + ql.length;
  }
  return out;
}
const parts = (text: string | undefined) => hi(text ?? "", q.value.trim());
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <input v-model="q" class="bz-search" type="search" :placeholder="t('搜索特质名称 / 效果…', 'search…')" autocomplete="off">
        <span class="bz-count">{{ t("共", "Total") }} {{ groups.length }} · {{ t("显示", "shown") }} {{ filtered.length }}</span>
      </div>
      <div class="cx-subfilters">
        <button class="bz-filter" :class="{ on: catTab === '' }" @click="catTab = ''">{{ t("全部分类", "All") }}</button>
        <button v-for="c in categories" :key="c" class="bz-filter" :class="{ on: catTab === c }" @click="catTab = catTab === c ? '' : c">{{ c }}</button>
      </div>

      <main class="cx-scroll">
        <div class="qk-spread">
          <div class="qk-col pos">
            <h3>{{ t("正面特质", "Positive") }}</h3>
            <div v-for="(g, i) in filtered" :key="'p' + i" class="qk-item pos">
              <template v-if="g.positive">
                <span class="cat">{{ g.category }}</span>
                <span class="qname">
                  <span v-for="(p, pi) in parts(g.positive.name)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
                <span class="qeffect">
                  <span v-for="(p, pi) in parts(g.positive.effect)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
              </template>
              <span v-else class="qk-empty">—</span>
            </div>
          </div>
          <div class="qk-spine"></div>
          <div class="qk-col neg">
            <h3>{{ t("负面特质", "Negative") }}</h3>
            <div v-for="(g, i) in filtered" :key="'n' + i" class="qk-item neg">
              <template v-if="g.negative">
                <span class="cat">{{ g.category }}</span>
                <span class="qname">
                  <span v-for="(p, pi) in parts(g.negative.name)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
                <span class="qeffect">
                  <span v-for="(p, pi) in parts(g.negative.effect)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
              </template>
              <span v-else class="qk-empty">—</span>
            </div>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
