<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { IndexFile, IndexMonster, MonsterDetail, Skill, Tier } from "../types";
import {
  LANG, RES_ITEMS, abilityOf, brainDesireLabel, displayNameOf, fmt, fxZh,
  liveTiers, lootEntryText, openLightbox, regionBadges, skillTypeZh, t,
} from "../data";
import { fxIconSrc, fxIconTitle, fxIconsFor } from "../fxicons";
import RankCells from "./RankCells.vue";

const props = defineProps<{
  entry: IndexMonster;
  detail: MonsterDetail;
  index: IndexFile;
}>();

const emit = defineEmits<{ close: [] }>();

const tiers = computed(() => liveTiers(props.detail));
const tierIdx = ref(0);
const tab = ref<"base" | "skills" | "drops">("base");

watch(() => props.detail, () => { tierIdx.value = 0; tab.value = "base"; });
if (tierIdx.value >= tiers.value.length) tierIdx.value = 0;
const tier = computed<Tier | null>(() => tiers.value[tierIdx.value] ?? null);

const names = computed(() => displayNameOf(props.entry, props.detail.tiers[0], props.detail.id));
const ability = computed(() => abilityOf(props.detail.tiers[0]));

function skillChips(s: Skill): Array<{ text: string; fx?: boolean; b?: string; icons?: string[] }> {
  const chips: Array<{ text: string; fx?: boolean; b?: string; icons?: string[] }> = [];
  const ty = skillTypeZh(s.type);
  if (ty) chips.push({ text: ty });
  if (s.atk) chips.push({ text: `${t("命中", "ACC")} `, b: fmt(s.atk) });
  if (s.dmg && s.dmg !== "—") chips.push({ text: `${t("伤害", "DMG")} `, b: String(s.dmg) });
  if (s.crit && s.crit !== "0%") chips.push({ text: `${t("暴击", "CRIT")} `, b: String(s.crit) });
  for (const f of s.effects) chips.push({ text: fxZh(f), fx: true, icons: fxIconsFor(f) });
  return chips;
}

const hasStats = computed(() => !!tier.value?.stats);

const lootTables = computed(() => tier.value?.loot ?? []);
const hasLoot = computed(() => lootTables.value.some((tb) => tb.entries.length > 0));

const brainRows = computed(() => {
  const tr = tier.value;
  if (!tr?.brain?.skillDesires?.length) return [];
  const max = Math.max(...tr.brain.skillDesires.map((d) => Number(d.chance) || 0), 1);
  return tr.brain.skillDesires.map((d) => ({
    label: brainDesireLabel(d, tr),
    chance: Number(d.chance) || 0,
    pct: ((Number(d.chance) || 0) / max) * 100,
  }));
});

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") emit("close");
}
</script>

<template>
  <div class="bz-modal" @click.self="emit('close')">
    <div class="bz-sheet">
      <span class="bz-corner tl">❦</span><span class="bz-corner tr">❦</span>
      <span class="bz-corner bl">❦</span><span class="bz-corner br">❦</span>
      <button class="bz-close" :title="t('关闭 (Esc)', 'close')" @click="emit('close')">✕</button>

      <!-- 头部:纹章立绘 + 信息行 -->
      <div class="bz-head">
        <div
          class="bz-crest"
          :title="entry.image ? t('点击查看原画', 'view art') : ''"
          @click="entry.image && openLightbox(entry.image, t(names.zh, names.en))"
        >
          <img v-if="entry.image" :src="entry.image" alt="" @error="($event.target as HTMLImageElement).classList.add('noimg')">
          <span v-else class="img-ph">☠</span>
        </div>
        <div class="bz-headline">
          <h2>{{ t(names.zh, names.en) }}</h2>
          <div class="sub">
            <template v-if="LANG === 'zh'">{{ names.en }}</template>
            <template v-else>{{ names.zh }}</template>
            · {{ entry.id }}
          </div>
          <div class="bz-info">
            <div class="row">
              <span class="k">{{ t("出现副本", "Found in") }}</span>
              <span class="v">
                <template v-if="regionBadges(index, entry).length">
                  <span v-for="r in regionBadges(index, entry)" :key="r" class="rbadge">{{ r }}</span>
                </template>
                <template v-else>{{ t("其他 / 未收录(召唤物 · 部件)", "Other / summons") }}</template>
              </span>
            </div>
            <div class="row">
              <span class="k">{{ t("种属", "Type") }}</span>
              <span class="v">
                {{ entry.type ? t(entry.type.zh, entry.type.en) : "—" }} · {{ t("体型", "Size") }} {{ entry.size }} · {{ t("档位", "Tiers") }} {{ entry.tiers.join("/") }}
              </span>
            </div>
            <div class="row">
              <span class="k">{{ t("特殊能力", "Ability") }}</span>
              <span class="v">{{ ability ?? t("无", "None") }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 档位书页签(隐藏空档) -->
      <div v-if="tiers.length > 1" class="bz-tiers">
        <button
          v-for="(tr, i) in tiers"
          :key="tr.tier + i"
          :class="{ on: i === tierIdx }"
          @click="tierIdx = i"
        >{{ tr.tier }}<template v-if="tr.label?.zh"> · {{ t(tr.label.zh ?? "", tr.label.en) }}</template></button>
      </div>

      <!-- 内容页签:压缩信息,免滚动 -->
      <div class="bz-tabbar">
        <button :class="{ on: tab === 'base' }" @click="tab = 'base'">{{ t("基础", "Stats") }}</button>
        <button :class="{ on: tab === 'skills' }" @click="tab = 'skills'">{{ t("技能", "Skills") }} {{ tier?.skills.length ?? 0 }}</button>
        <button :class="{ on: tab === 'drops' }" @click="tab = 'drops'">{{ t("掉落 / 行为", "Loot") }}</button>
      </div>

      <div class="bz-body">
        <!-- 基础 -->
        <template v-if="tab === 'base'">
          <template v-if="hasStats && tier?.stats">
            <div class="bz-stats">
              <div class="bz-stat"><span class="k">HP</span><span class="v">{{ fmt(tier.stats.hp) }}</span></div>
              <div class="bz-stat"><span class="k">SPD</span><span class="v g">{{ fmt(tier.stats.spd) }}</span></div>
              <div class="bz-stat"><span class="k">DODGE</span><span class="v b">{{ fmt(tier.stats.def) }}%</span></div>
              <div class="bz-stat"><span class="k">PROT</span><span class="v">{{ fmt(tier.stats.prot) }}%</span></div>
            </div>
            <div class="bz-res">
              <div v-for="r in RES_ITEMS" :key="r.key" class="bz-rescell">
                <img class="fxicon res" :src="fxIconSrc(r.icon)" :title="fxIconTitle(r.icon)" alt="">
                {{ t(r.zh, r.en) }}
                <span class="val">{{ fmt(tier.stats.res[r.key]) }}</span>
              </div>
            </div>
            <div v-if="tier.deathClass || tier.lifeLink" class="bz-special">
              <div v-if="tier.deathClass" class="row">
                <span class="k">{{ t("死亡后", "On death") }}</span>
                <span class="v">{{ t("变为尸体", "leaves corpse") }} {{ tier.deathClass }}</span>
              </div>
              <div v-if="tier.lifeLink" class="row">
                <span class="k">{{ t("生命链接", "Life link") }}</span>
                <span class="v">{{ t("与", "with") }} {{ tier.lifeLink }} {{ t("联动(召唤机制)", "(summon mechanism)") }}</span>
              </div>
            </div>
          </template>
          <div v-else class="bz-nonestate">{{ t("该档位无战斗数据(尸体 / 装饰物)", "No combat data (corpse / prop)") }}</div>
        </template>

        <!-- 技能 -->
        <template v-else-if="tab === 'skills'">
          <div class="bz-legend">
            <span><span class="sw" style="background: var(--green)"></span>{{ t("站位(可使用该技能的位置)", "its positions") }}</span>
            <span><span class="sw" style="background: var(--red)"></span>{{ t("打击(命中其中一个位置)", "hits one position") }}</span>
            <span><span class="sw linksw"></span>{{ t("连线 = 范围打击(全体同时命中)", "linked = AoE (all at once)") }}</span>
            <span><span class="sw" style="background: #46698c"></span>{{ t("蓝格 = 作用其友方", "blue = monster allies") }}</span>
            <span><img class="fxicon lg" :src="fxIconSrc('special-note')" alt="">{{ t("悬停状态图标可看说明", "hover status icons") }}</span>
          </div>
          <div v-if="tier?.skills.length" class="bz-skills">
            <div v-for="s in tier.skills" :key="s.id" class="bz-skill">
              <div class="top">
                <span class="sn">{{ t(s.name.zh ?? s.id, s.name.en) }}</span>
                <span class="st">{{ skillTypeZh(s.type) }}</span>
              </div>
              <div class="sc">
                <span v-for="(c, ci) in skillChips(s)" :key="ci" class="chip" :class="{ fx: c.fx }">
                  <img
                    v-for="ic in c.icons" :key="ic" class="fxicon"
                    :src="fxIconSrc(ic)" :title="fxIconTitle(ic)" alt=""
                  >{{ c.text }}<b v-if="c.b">{{ c.b }}</b>
                </span>
              </div>
              <div class="ranks">
                <span v-if="s.launch.length" class="rank">
                  <span class="lbl">{{ t("站位", "Pos") }}</span>
                  <RankCells :digits="s.launch" kind="launch" />
                </span>
                <span v-if="s.target.length" class="rank">
                  <span class="lbl">{{ s.targetAlly ? t("友方", "Allies") : t("打击", "Hits") }}</span>
                  <RankCells :digits="s.target" kind="target" :aoe="s.targetAoe" :ally="s.targetAlly" />
                </span>
              </div>
            </div>
          </div>
          <div v-else class="bz-nonestate">{{ t("无技能数据", "no skills") }}</div>
        </template>

        <!-- 掉落 / 行为 -->
        <template v-else>
          <div class="bz-drops">
            <div>
              <div class="bz-sec"><span class="dia">❖</span>{{ t("掉落", "Loot") }}<span class="dia">❖</span></div>
              <div v-if="hasLoot" class="bz-loot">
                <div v-for="(tb, ti) in lootTables" :key="ti" class="tbl">
                  <div v-if="lootTables.length > 1" class="tbl-name">{{ t("掉落表", "Table") }} {{ tb.file }}</div>
                  <div v-for="(e, ei) in tb.entries" :key="ei" class="bz-loot-entry">
                    <span class="pct">{{ fmt(e.chances) }}%</span>
                    <span class="tx">{{ lootEntryText(e) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="bz-nonestate">{{ t("无掉落", "no loot") }}</div>
            </div>
            <div>
              <div class="bz-sec"><span class="dia">❖</span>{{ t("AI 倾向", "AI") }}<span class="dia">❖</span></div>
              <template v-if="brainRows.length">
                <div v-for="(r, ri) in brainRows" :key="ri" class="bz-brain-row">
                  <span class="nm">{{ r.label }}</span>
                  <span class="bar"><i :style="{ width: r.pct + '%' }"></i></span>
                  <span class="w">×{{ r.chance }}</span>
                </div>
              </template>
              <div v-else class="bz-nonestate">{{ t("无 AI 数据", "no AI data") }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
