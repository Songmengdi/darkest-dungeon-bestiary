<!-- 怪物档案:标本图版式单层布局(图版编号 + 圆形徽章立绘 + 档位徽章点 + 属性尺/技能网格) -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { IndexFile, IndexMonster, MonsterDetail, Skill, Tier } from "../types";
import { LANG, t } from "../i18n";
import {
  RES_ITEMS, abilityOf, aiGenericOf, aiWeightOf, displayNameOf, fmt, liveTiers, skillTypeZh,
} from "../display";
import { regionBadges } from "../filter";
import { openLightbox } from "../lightbox";
import { fxIconSrc, fxIconTitle } from "../fxicons";
import { interpretEffectRef } from "../effect";
import RankDots from "./RankDots.vue";

const props = defineProps<{
  entry: IndexMonster;
  detail: MonsterDetail;
  index: IndexFile;
}>();

const emit = defineEmits<{ close: [] }>();

const tiers = computed(() => liveTiers(props.detail));
const tierIdx = ref(0);
watch(() => props.detail, () => { tierIdx.value = 0; });
const tier = computed<Tier | null>(() => tiers.value[tierIdx.value] ?? null);

const names = computed(() => displayNameOf(props.entry, props.detail.tiers[0], props.detail.id));
const ability = computed(() => abilityOf(props.detail.tiers[0]));
const no = computed(() => String(props.index.monsters.findIndex((m) => m.id === props.entry.id) + 1).padStart(3, "0"));
const regions = computed(() => regionBadges(props.index, props.entry));

const pct = (v: unknown): string => {
  const s = String(v ?? "").replace(/%+$/, "");
  return s === "" ? "—" : `${s}%`;
};
const statRows = computed(() => {
  const st = tier.value?.stats;
  if (!st) return [];
  return [
    { k: t("生命", "HP"), v: fmt(st.hp) },
    { k: t("速度", "SPD"), v: fmt(st.spd) },
    { k: t("闪避", "DODGE"), v: pct(st.def) },
    { k: t("防御", "PROT"), v: pct(st.prot) },
  ];
});

const skills = computed(() => (tier.value?.skills ?? []).map((s) => ({
  ...s,
  ty: skillTypeZh(s.type),
  fx: s.effects.map((f) => interpretEffectRef(f)),
  ai: aiWeightOf(tier.value, s.id),
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
            <span v-for="r in regions" :key="r" class="pm-region">{{ r }}</span>
            <span v-if="!regions.length" class="pm-region dim">{{ t("其他 / 未收录(召唤物 · 部件)", "other") }}</span>
          </div>
          <h2 class="pm-name">{{ t(names.zh, names.en) }}</h2>
          <div class="pm-taxo">
            <span class="latin">{{ names.en }} · {{ entry.id }}</span>
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
              <span class="v">{{ r.v }}</span>
            </div>
            <div class="pm-colhead" style="margin-top: 18px">{{ t("抗性", "Resistances") }}</div>
            <div v-for="r in RES_ITEMS" :key="r.key" class="pm-statrow">
              <span class="k"><img class="fxicon" :src="fxIconSrc(r.icon)" :title="fxIconTitle(r.icon)" alt=""> {{ t(r.zh, r.en) }}</span>
              <span class="dots"></span>
              <span class="v">{{ fmt(tier.stats!.res[r.key]) }}</span>
            </div>
            <div v-if="tier.deathClass || tier.lifeLink" class="pm-note">
              {{ tier.deathClass ? t("死亡后化为尸体", "Leaves a corpse") : "" }}
              {{ tier.lifeLink ? `${t("生命链接", "Life link")} ${tier.lifeLink}` : "" }}
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
                <span v-if="s.atk" class="m"><i>{{ t("命中", "ACC") }}</i><b>{{ s.atk }}</b></span>
                <span v-if="s.dmg && s.dmg !== '—'" class="m"><i>{{ t("伤害", "DMG") }}</i><b>{{ s.dmg }}</b></span>
                <span v-if="s.crit && s.crit !== '0%'" class="m"><i>{{ t("暴击", "CRIT") }}</i><b>{{ s.crit }}</b></span>
                <span v-for="(f, fi) in s.fx" :key="fi" class="fx">
                  <img v-for="ic in f.icons" :key="ic" class="fxicon" :src="fxIconSrc(ic)" :title="fxIconTitle(ic)" alt="">
                  {{ f.text }}
                </span>
              </div>
              <div v-if="s.launch.length || s.target.length" class="dotrow">
                <span v-if="s.launch.length" class="grp">
                  <i class="lbl">{{ t("站位", "Pos") }}</i>
                  <RankDots :digits="s.launch" kind="launch" />
                </span>
                <span v-if="s.target.length" class="grp">
                  <i class="lbl">{{ s.targetAlly ? t("友方", "Allies") : t("打击", "Hits") }}</i>
                  <RankDots :digits="s.target" kind="target" :aoe="s.targetAoe" :ally="s.targetAlly" />
                </span>
              </div>
            </div>
          </div>
          <div v-else class="pm-note">{{ t("无技能数据", "no skills") }}</div>
          <div v-if="aiGenericOf(tier).length" class="pm-gen">
            {{ t("AI 通用倾向", "AI generic") }}:
            <span v-for="(g, gi) in aiGenericOf(tier)" :key="gi">{{ g[0] }} ×{{ g[1] }}<template v-if="gi < aiGenericOf(tier).length - 1"> · </template></span>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pm-modal { position: fixed; inset: 0; z-index: 9999; background: rgba(4, 2, 1, 0.9); display: grid; place-items: center; }
.pm-card {
  position: relative; width: min(1040px, 94vw); max-height: 92vh; display: flex; flex-direction: column;
  background: linear-gradient(180deg, #201709 0%, #1a1209 100%);
  border: 1px solid var(--line);
  box-shadow: inset 0 0 0 1px #0a0704, inset 0 0 0 4px rgba(201, 169, 92, 0.06), 0 30px 80px rgba(0, 0, 0, 0.7);
}
.pm-close { position: absolute; top: 12px; right: 14px; z-index: 3; background: none; border: none; color: var(--muted); font-size: 16px; cursor: pointer; }
.pm-close:hover { color: var(--gold); }

.pm-head { display: flex; align-items: center; gap: 22px; padding: 22px 26px 18px; border-bottom: 1px solid var(--line2); }
.pm-medal {
  flex: none; width: 118px; height: 118px; border-radius: 50%; overflow: hidden; cursor: zoom-in;
  border: 3px solid var(--gold-dim); box-shadow: 0 0 0 1px #0a0704, 0 6px 18px rgba(0, 0, 0, 0.6);
  background: radial-gradient(circle at 50% 35%, #2a2013, #0e0a06);
}
.pm-medal img { width: 100%; height: 100%; object-fit: cover; }
.pm-ph { font-size: 44px; color: #3a2e1c; display: grid; place-items: center; }
.pm-idblock { flex: 1; min-width: 0; }
.pm-kicker { display: flex; align-items: center; gap: 8px; font-size: 10px; letter-spacing: 2px; color: var(--gold-dim); margin-bottom: 6px; flex-wrap: wrap; }
.pm-no { color: var(--gold); }
.pm-region { border: 1px solid var(--line2); padding: 0 6px; border-radius: 2px; color: var(--ink); letter-spacing: 1px; }
.pm-region.dim { color: var(--muted); }
.pm-name { font-family: var(--font-title); font-size: 34px; color: var(--ink); margin: 0 0 4px; letter-spacing: 5px; line-height: 1.1; }
.pm-taxo { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.pm-taxo .latin { color: var(--muted); font-style: italic; }
.pm-taxo .tax { color: var(--gold-dim); }

.pm-coins { flex: none; display: flex; gap: 10px; }
.pm-coin {
  width: 58px; height: 58px; border-radius: 50%; cursor: pointer;
  background: radial-gradient(circle at 35% 30%, #2a2013, #120d07);
  border: 2px solid var(--line2); color: var(--muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  transition: all 0.15s;
}
.pm-coin b { font-family: var(--font-title); font-size: 19px; line-height: 1; }
.pm-coin i { font-style: normal; font-size: 9px; letter-spacing: 1px; }
.pm-coin.on { border-color: var(--gold); color: var(--gold); box-shadow: 0 0 14px rgba(201, 169, 92, 0.25), inset 0 0 8px rgba(201, 169, 92, 0.12); }
.pm-coin:not(.on):hover { color: var(--ink); border-color: var(--gold-dim); }

.pm-body { display: grid; grid-template-columns: 250px 1fr; min-height: 0; overflow-y: auto; }
.pm-stats { padding: 20px 22px; border-right: 1px solid var(--line2); }
.pm-main { padding: 20px 24px; }
.pm-colhead { font-size: 11px; letter-spacing: 3px; color: var(--gold-dim); margin-bottom: 12px; }
.pm-statrow { display: flex; align-items: baseline; gap: 8px; padding: 5px 0; font-size: 13px; }
.pm-statrow .k { color: var(--muted); font-size: 12px; display: inline-flex; align-items: center; gap: 5px; }
.pm-statrow .dots { flex: 1; border-bottom: 1px dotted #3a2e1c; }
.pm-statrow .v { color: var(--ink); font-weight: 700; }
.pm-note { margin-top: 12px; font-size: 11px; color: var(--gold-dim); }

.pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pm-skill {
  border: 1px solid var(--line2);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.1));
  padding: 12px 16px 13px;
  display: flex; flex-direction: column; gap: 9px;
  transition: border-color 0.15s;
}
.pm-skill:hover { border-color: var(--gold-dim); }
.pm-skill .head { display: flex; align-items: baseline; gap: 8px; }
.pm-skill .sn { font-family: var(--font-title); font-size: 16px; color: var(--ink); letter-spacing: 1px; }
.pm-skill .aiw {
  margin-left: auto; flex: none; font-size: 10px; color: var(--gold);
  border: 1px solid rgba(201, 169, 92, 0.35); border-radius: 999px; padding: 0 7px; line-height: 16px;
}
.pm-skill .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 13px; }
.pm-skill .ty {
  font-size: 10px; letter-spacing: 2px; color: var(--gold);
  border: 1px solid rgba(201, 169, 92, 0.4); padding: 1px 6px; border-radius: 2px;
}
.pm-skill .m { display: inline-flex; align-items: baseline; gap: 4px; }
.pm-skill .m i { font-style: normal; font-size: 11px; color: var(--muted); }
.pm-skill .m b { color: var(--ink); font-weight: 700; font-size: 12px; }
.pm-skill .fx {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--ink);
  background: rgba(201, 169, 92, 0.07); border: 1px solid rgba(201, 169, 92, 0.16);
  padding: 1px 8px; border-radius: 999px;
}
.pm-skill .dotrow { display: flex; align-items: center; gap: 28px; margin-top: 2px; padding-top: 8px; border-top: 1px solid rgba(74, 59, 34, 0.35); }
.pm-skill .grp { display: inline-flex; align-items: center; gap: 8px; }
.pm-skill .lbl { font-style: normal; font-size: 10px; letter-spacing: 2px; color: var(--muted); }
.fxicon { width: 14px; height: 14px; vertical-align: -2px; }
.pm-gen { color: var(--muted); font-size: 11px; margin-top: 14px; }
.pm-gen span { color: var(--gold-dim); }
</style>
