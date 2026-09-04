<!-- 札记卷:机制速记(亮度/杂项…) + 命中公式问答 + 数据来源致谢 -->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadNotes, type NoteSection } from "../../codex";
import { t } from "../../i18n";
import { openLightbox } from "../../lightbox";

const notes = ref<NoteSection[]>([]);
const err = ref("");

onMounted(async () => {
  try {
    notes.value = await loadNotes();
  } catch (e) {
    err.value = String(e);
  }
});

const qa = [
  { h: t("《暗黑地牢》命中计算公式", "Hit formula"), ps: [t("最终命中率 = 攻击的基础命中率 + 英雄的精准 - 敌人的闪避", "final = base acc + hero ACC - enemy DODGE")] },
  {
    h: t("为什么要这样设计？", "Why"),
    ps: [
      t("1. 下限:最低命中率永远为 5%;上限:最高命中率永远为 95%。", "Floor 5%, cap 95%."),
      t("2. 维持压力与不确定性 —— 那 5% 的 Miss 是永远存在的变数,防止数值碾压,让后期仍需为最坏情况做准备。", "…"),
      t("3. 平衡性 —— 若无上限,无限堆精准即可无视高闪避敌人,破坏平衡。", "…"),
    ],
  },
  {
    h: t("结论", "Conclusion"),
    ps: [
      t("命中率最高只能到 95%:把(英雄精准 + 技能精准 - 敌人闪避)堆到 95 以上没有收益。", "…"),
      t("永远有 5% 最低概率 Miss —— 这是游戏设计的初衷。", "…"),
    ],
  },
];
</script>

<template>
  <div class="cx-vol">
    <div v-if="err" class="bz-loading">加载失败:{{ err }}</div>
    <template v-else>
      <div class="cx-toolbar">
        <span class="cx-warning">{{ t("概率游戏!!!概率游戏!!!概率游戏!!!", "A game of odds!!!") }}</span>
      </div>
      <main class="cx-scroll">
        <div class="cx-notecards">
          <section v-for="n in notes" :key="n.type" class="cx-notecard">
            <h3>{{ n.type }}</h3>
            <ul>
              <li v-for="(it, i) in n.liD" :key="i" :class="{ sub: it.startsWith('+') }">{{ it.replace(/^\++/, "") }}</li>
            </ul>
          </section>

          <section class="cx-notecard wide">
            <h3>{{ t("问答 · 命中堆到 95 就够了吗?", "Q&A: is 95% ACC enough?") }}</h3>
            <div v-for="(sec, i) in qa" :key="i" class="nt-qa">
              <h4>{{ sec.h }}</h4>
              <p v-for="(p, pi) in sec.ps" :key="pi">{{ p }}</p>
            </div>
            <img
              class="nt-img"
              src="/codex/img/dd1_test.jpg"
              :alt="t('命中测试', 'hit test')"
              @click="openLightbox('/codex/img/dd1_test.jpg', t('命中测试', 'hit test'))"
            >
          </section>

          <section class="cx-notecard">
            <h3>{{ t("数据来源", "Credits") }}</h3>
            <ul>
              <li>{{ t("怪物数据:直接解析自游戏文件(darkest_mcp 导出),版权归 Red Hook Studios 所有", "Monster data parsed from game files (c) Red Hook Studios") }}</li>
              <li>
                {{ t("英雄/怪癖/奇物/饰品/地图等整理内容:整理自 B 站 UP 主", "Curated volumes from bilibili uploader") }}
                <a href="https://search.bilibili.com/all?keyword=%E6%B4%9B%E6%B4%9B%E4%B8%B6%E6%83%85%E6%84%AB" target="_blank" rel="noopener noreferrer">洛洛丶情愫</a>
                {{ t("的《暗黑地牢资料库》", "'s DD1 compendium") }}
              </li>
              <li>{{ t("图片素材来自其资料库静态包与 darkestdungeon.fandom.com(CC BY-SA),仅作图鉴展示用途", "Images from the pack & fandom wiki (CC BY-SA), display only") }}</li>
            </ul>
          </section>
        </div>
      </main>
    </template>
  </div>
</template>
