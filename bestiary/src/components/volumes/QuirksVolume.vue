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

type QuirkSide = { name: string; effect: string };
interface QuirkRow { key: string; pos: QuirkSide | null; neg: QuirkSide | null }

/** 按分类分章,章内逐组保持正/负横向对应;缺侧的组保留为空槽 */
const sections = computed(() => {
  const query = q.value.trim().toLowerCase();
  const hay = (s: QuirkSide | null) => (s ? `${s.name}${s.effect}`.toLowerCase().includes(query) : false);
  const out: Array<{ category: string; rows: QuirkRow[] }> = [];
  const index = new Map<string, number>();
  groups.value.forEach((g, gi) => {
    if (catTab.value && g.category !== catTab.value) return;
    if (query && !hay(g.positive) && !hay(g.negative)) return;
    if (!g.positive && !g.negative) return;
    let si = index.get(g.category);
    if (si === undefined) {
      si = out.length;
      index.set(g.category, si);
      out.push({ category: g.category, rows: [] });
    }
    out[si].rows.push({ key: g.category + "-" + gi, pos: g.positive, neg: g.negative });
  });
  return out;
});
const posCount = computed(() => sections.value.reduce((n, s) => n + s.rows.filter((r) => r.pos).length, 0));
const negCount = computed(() => sections.value.reduce((n, s) => n + s.rows.filter((r) => r.neg).length, 0));
const shown = computed(() => sections.value.reduce((n, s) => n + s.rows.length, 0));

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
        <span class="bz-count">{{ t("共", "Total") }} {{ groups.length }} · {{ t("显示", "shown") }} {{ shown }}</span>
      </div>
      <div class="cx-subfilters">
        <button class="bz-filter" :class="{ on: catTab === '' }" @click="catTab = ''">{{ t("全部分类", "All") }}</button>
        <button v-for="c in categories" :key="c" class="bz-filter" :class="{ on: catTab === c }" @click="catTab = catTab === c ? '' : c">{{ c }}</button>
      </div>

      <main class="cx-scroll">
        <div class="qk-spread">
          <h3 class="qk-pagehead pos">{{ t("正面特质", "Positive") }}<span class="qk-n">{{ posCount }}</span></h3>
          <span aria-hidden="true"></span>
          <h3 class="qk-pagehead neg">{{ t("负面特质", "Negative") }}<span class="qk-n">{{ negCount }}</span></h3>

          <template v-for="sec in sections" :key="sec.category">
            <div class="qk-sechead"><span>{{ sec.category }}</span></div>
            <template v-for="row in sec.rows" :key="row.key">
              <article v-if="row.pos" class="qk-item pos">
                <span class="qname">
                  <span v-for="(p, pi) in parts(row.pos.name)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
                <span class="qeffect">
                  <span v-for="(p, pi) in parts(row.pos.effect)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
              </article>
              <div v-else class="qk-none" :title="t('无对应正面特质', 'no positive counterpart')">—</div>
              <div class="qk-spine" aria-hidden="true"></div>
              <article v-if="row.neg" class="qk-item neg">
                <span class="qname">
                  <span v-for="(p, pi) in parts(row.neg.name)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
                <span class="qeffect">
                  <span v-for="(p, pi) in parts(row.neg.effect)" :key="pi" :class="{ hit: p.hit }">{{ p.text }}</span>
                </span>
              </article>
              <div v-else class="qk-none" :title="t('无对应负面特质', 'no negative counterpart')">—</div>
            </template>
          </template>
        </div>
      </main>
    </template>
  </div>
</template>
