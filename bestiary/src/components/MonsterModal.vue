<!-- 怪物档案:标本图版式单层布局(图版编号 + 圆形徽章立绘 + 档位徽章点 + 属性尺/技能网格) -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { IndexFile, IndexMonster, MonsterDetail, Skill, Tier } from "../types";
import { LANG, t } from "../i18n";
import {
  RES_ITEMS, abilityOf, aiGenericOf, aiWeightOf, displayNameOf, fmt, liveTiers, skillTypeZh,
} from "../display";
import { regionBadges } from "../filter";
import { bossCatZh, metaOf, summonedByOf } from "../monstersMeta";
import { openLightbox } from "../lightbox";
import { fxIconSrc, fxIconTitle } from "../fxicons";
import { interpretEffectRef } from "../effect";
import { MODE, addPct, lightBand, lightModOf, lightTip, modeDef, modeTip, pctMult } from "../settings";
import RankDots from "./RankDots.vue";

const props = defineProps<{
  entry: IndexMonster;
  detail: MonsterDetail;
  index: IndexFile;
}>();

const emit = defineEmits<{ close: []; open: [id: string] }>();

const tiers = computed(() => liveTiers(props.detail));
const tierIdx = ref(0);
watch(() => props.detail, () => { tierIdx.value = 0; });
const tier = computed<Tier | null>(() => tiers.value[tierIdx.value] ?? null);

const names = computed(() => displayNameOf(props.entry, props.detail.tiers[0], props.detail.id));
const ability = computed(() => abilityOf(props.detail.tiers[0]));
const no = computed(() => String(props.index.monsters.findIndex((m) => m.id === props.entry.id) + 1).padStart(3, "0"));
const regions = computed(() => regionBadges(props.index, props.entry));
const bossCat = computed(() => metaOf(props.entry.id)?.bossCat);

function nameOf(id: string): string {
  const hit = props.index.monsters.find((m) => m.id === id);
  return hit ? t(hit.name.zh, hit.name.en) : id;
}
function linked(ids: string[]): Array<{ id: string; label: string }> {
  return ids
    .filter((id) => props.index.monsters.some((m) => m.id === id))
    .map((id) => ({ id, label: nameOf(id) }));
}
const summons = computed(() => linked(metaOf(props.entry.id)?.summons ?? []));
const summonedBy = computed(() => linked(summonedByOf(props.entry.id)));
/* 死亡化形(如先祖→孕育之心):deathClass 为怪物变体 ID,剥掉档位后缀解析 */
const transformTo = computed(() => {
  const dc = props.detail.tiers[0]?.deathClass;
  if (!dc) return null;
  const id = dc.replace(/_[A-F]$/, "");
  return props.index.monsters.some((m) => m.id === id) ? { id, label: nameOf(id) } : null;
});

const pct = (v: unknown): string => {
  const s = String(v ?? "").replace(/%+$/, "");
  return s === "" ? "—" : `${s}%`;
};
const statRows = computed(() => {
  const st = tier.value?.stats;
  if (!st) return [];
  const md = modeDef.value;
  return [
    { k: t("生命", "HP"), v: fmt(st.hp), chip: md.hpMult > 1 ? pctMult((md.hpMult - 1) * 100) : "", tip: modeTip(md) },
    { k: t("速度", "SPD"), v: fmt(st.spd), chip: "", tip: "" },
    { k: t("闪避", "DODGE"), v: pct(st.def), chip: "", tip: "" },
    { k: t("防御", "PROT"), v: pct(st.prot), chip: "", tip: "" },
  ];
});

const band = lightBand;
const mod = computed(() => lightModOf(lightBand.value.stop, MODE.value));
const critExtra = computed(() => mod.value.mCrit + modeDef.value.critMod);
const dmgChip = computed(() => (mod.value.mDmg ? pctMult(mod.value.mDmg) : ""));
const critChip = computed(() => (critExtra.value ? `+${critExtra.value}` : ""));
const critTip = computed(() =>
  modeDef.value.critMod
    ? t(
        `${modeDef.value.zh}模式暴击 +${modeDef.value.critMod} · 亮度暴击 +${mod.value.mCrit}`,
        `${modeDef.value.en} mode +${modeDef.value.critMod} CRIT · light +${mod.value.mCrit} CRIT`,
      )
    : lightTip(band.value, MODE.value),
);

const skills = computed(() => (tier.value?.skills ?? []).map((s) => ({
  ...s,
  ty: skillTypeZh(s.type),
  fx: s.effects.map((f) => interpretEffectRef(f)),
  ai: aiWeightOf(tier.value, s.id),
  /* 亮度/模式修正:命中/暴击加百分点,伤害乘算(伤害本体展示原始骰,乘数另示) */
  atkDisp: addPct(s.atk, mod.value.mAcc),
  critDisp: addPct(s.crit, critExtra.value),
})));

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") emit("close");
}
</script>

<template>
  <div class="pm-modal" @click.self="emit('close')">
    <div class="pm-card">
      <button class="pm-close" :title="t('关闭 (Esc)', 'close')" @click="emit('close')">✕</button>

      <!-- 头部:图版题头 -->
      <header class="pm-head">
        <div
          class="pm-medal"
          :title="entry.image ? t('点击查看原画', 'view art') : ''"
          @click="entry.image && openLightbox(entry.image, t(names.zh, names.en))"
        >
          <img v-if="entry.image" :src="entry.image" alt="">
          <span v-else class="pm-ph">☠</span>
        </div>
        <div class="pm-idblock">
          <div class="pm-kicker">
            <span class="pm-no">{{ t("图鉴", "Plate") }} No.{{ no }}</span>
            <span v-if="bossCat" class="pm-region boss">{{ t("首领", "Boss") }} · {{ bossCatZh(bossCat) }}</span>
            <span v-for="r in regions" :key="r" class="pm-region">{{ r }}</span>
            <span v-if="!regions.length && !bossCat" class="pm-region dim">{{ t("其他 / 未收录(召唤物 · 部件)", "other") }}</span>
            <span class="pm-region" :class="{ dim: !mod.mAcc && !mod.mDmg && !mod.mCrit && !modeDef.critMod }" :title="lightTip(band, MODE)">
              {{ t("亮度", "Light") }} · {{ t(band.zh, band.en) }}
            </span>
          </div>
          <h2 class="pm-name">{{ t(names.zh, names.en) }}</h2>
          <div class="pm-taxo">
            <span class="latin">{{ names.en }}</span>
            <span class="tax">
              {{ entry.type ? t(entry.type.zh, entry.type.en) : "—" }} · {{ t("体型", "Size") }} {{ entry.size }}<template v-if="ability"> · {{ ability }}</template>
            </span>
          </div>
        </div>
        <!-- 档位:圆形徽章(隐藏空档) -->
        <div v-if="tiers.length > 1" class="pm-coins">
          <button
            v-for="(tr, i) in tiers"
            :key="tr.tier"
            class="pm-coin"
            :class="{ on: i === tierIdx }"
            @click="tierIdx = i"
          ><b>{{ tr.tier }}</b><i>{{ LANG === "zh" ? tr.label?.zh : tr.label?.en }}</i></button>
        </div>
      </header>

      <!-- 主体:左属性尺 + 右技能网格 -->
      <div v-if="tier" class="pm-body">
        <aside class="pm-stats">
          <div class="pm-colhead">{{ t("属性", "Stats") }}</div>
          <template v-if="statRows.length">
            <div v-for="r in statRows" :key="r.k" class="pm-statrow">
              <span class="k">{{ r.k }}</span>
              <span class="dots"></span>
              <span class="v">{{ r.v }}<i v-if="r.chip" class="lmod" :title="r.tip"> {{ r.chip }}</i></span>
            </div>
            <div class="pm-colhead" style="margin-top: 18px">{{ t("抗性", "Resistances") }}</div>
            <div v-for="r in RES_ITEMS" :key="r.key" class="pm-statrow">
              <span class="k"><img class="fxicon" :src="fxIconSrc(r.icon)" :title="fxIconTitle(r.icon)" alt=""> {{ t(r.zh, r.en) }}</span>
              <span class="dots"></span>
              <span class="v">{{ fmt(tier.stats!.res[r.key]) }}</span>
            </div>
            <div v-if="tier.deathClass || tier.lifeLink" class="pm-note">
              <template v-if="tier.deathClass">
                <template v-if="transformTo">{{ t("死亡后化为", "On death becomes") }}
                  <button class="pm-link inline" @click="emit('open', transformTo.id)">{{ transformTo.label }}</button>
                </template>
                <template v-else>{{ t("死亡后化为尸体", "Leaves a corpse") }}</template>
              </template>
              <template v-if="tier.lifeLink">
                {{ t("生命链接", "Life link") }}
                <button class="pm-link inline" @click="emit('open', tier.lifeLink)">{{ nameOf(tier.lifeLink) }}</button>
              </template>
            </div>
          </template>
          <div v-else class="pm-note">{{ t("该档位无战斗数据(尸体 / 装饰物)", "No combat data (corpse / prop)") }}</div>
        </aside>

        <main class="pm-main">
          <div class="pm-colhead">{{ t("技能", "Skills") }} · {{ tier.skills.length }}</div>
          <div v-if="tier.skills.length" class="pm-grid">
            <div v-for="s in skills" :key="s.id" class="pm-skill">
              <div class="head">
                <span class="sn">{{ t(s.name.zh ?? s.id, s.name.en) }}</span>
                <span class="aiw" v-if="s.ai" :title="t('AI 使用权重(倾向)', 'AI desire weight')">AI ×{{ s.ai }}</span>
              </div>
              <div class="meta">
                <span v-if="s.ty" class="ty">{{ s.ty }}</span>
                <span v-if="s.atk" class="m"><i>{{ t("命中", "ACC") }}</i><b>{{ s.atkDisp }}</b><i v-if="mod.mAcc" class="lmod" :title="lightTip(band, MODE)">+{{ mod.mAcc }}</i></span>
                <span v-if="s.dmg && s.dmg !== '—'" class="m"><i>{{ t("伤害", "DMG") }}</i><b>{{ s.dmg }}</b><i v-if="dmgChip" class="lmod" :title="lightTip(band, MODE)">{{ dmgChip }}</i></span>
                <span v-if="s.crit && s.critDisp !== '0%'" class="m"><i>{{ t("暴击", "CRIT") }}</i><b>{{ s.critDisp }}</b><i v-if="critChip" class="lmod" :title="critTip">{{ critChip }}</i></span>
                <span v-for="(f, fi) in s.fx" :key="fi" class="fx">
                  <img v-for="ic in f.icons" :key="ic" class="fxicon" :src="fxIconSrc(ic)" :title="fxIconTitle(ic)" alt="">
                  {{ f.text }}
                </span>
              </div>
              <div v-if="s.launch.length || s.target.length" class="dotrow">
                <span v-if="s.target.length" class="grp">
                  <i class="lbl">{{ s.targetAlly ? t("友方", "Allies") : t("打击", "Hits") }}</i>
                  <RankDots :digits="s.target" kind="target" :aoe="s.targetAoe" :ally="s.targetAlly" />
                </span>
                <span v-if="s.launch.length" class="grp">
                  <i class="lbl">{{ t("站位", "Pos") }}</i>
                  <RankDots :digits="s.launch" kind="launch" />
                </span>
              </div>
            </div>
          </div>
          <div v-else class="pm-note">{{ t("无技能数据", "no skills") }}</div>
          <div v-if="aiGenericOf(tier).length" class="pm-gen">
            {{ t("AI 通用倾向", "AI generic") }}:
            <span v-for="(g, gi) in aiGenericOf(tier)" :key="gi">{{ g[0] }} ×{{ g[1] }}<template v-if="gi < aiGenericOf(tier).length - 1"> · </template></span>
          </div>
          <div v-if="summons.length || summonedBy.length" class="pm-rel">
            <div class="pm-colhead">{{ t("召唤关联", "Summon ties") }}</div>
            <div v-if="summons.length" class="pm-relrow">
              <i class="lbl">{{ t("召唤", "Summons") }}</i>
              <button v-for="s in summons" :key="s.id" class="pm-link" @click="emit('open', s.id)">{{ s.label }}</button>
            </div>
            <div v-if="summonedBy.length" class="pm-relrow">
              <i class="lbl">{{ t("被召唤", "Summoned by") }}</i>
              <button v-for="s in summonedBy" :key="s.id" class="pm-link" @click="emit('open', s.id)">{{ s.label }}</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

