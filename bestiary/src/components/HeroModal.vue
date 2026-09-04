<!-- 英雄档案:羊皮纸档案弹层 —— 立绘章 + 0→6 成长 + 装备档属性 + 抗性 + 技能/扎营 -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { Hero, HeroAbility } from "../codex";
import { t } from "../i18n";
import { openLightbox } from "../lightbox";
import RankDots from "./RankDots.vue";

const props = defineProps<{ hero: Hero }>();
const emit = defineEmits<{ close: [] }>();

const o0 = computed(() => props.hero.overview.level0);
const o6 = computed(() => props.hero.overview.level6);

const compareRows = computed(() => [
  { k: t("生命", "HP"), v0: o0.value.hp, v6: o6.value.hp },
  { k: t("攻击", "ATK"), v0: o0.value.attack.replace("-", "~"), v6: o6.value.attack.replace("-", "~") },
  { k: t("速度", "SPD"), v0: o0.value.speed, v6: o6.value.speed },
  { k: t("暴击", "CRIT"), v0: `${o0.value.crit}%`, v6: `${o6.value.crit}%` },
  { k: t("暴击增益", "CRIT buff"), v0: "—", v6: String(o6.value.critBonus ?? "—") },
  { k: t("闪避", "DODGE"), v0: `${o0.value.dodge}%`, v6: `${o6.value.dodge}%` },
]);

const gearLevels = computed(() => [1, 2, 3, 4, 5].map((lv) => ({
  lv,
  hp: props.hero.hp[lv - 1],
  spd: props.hero.spd[lv - 1],
  dodge: props.hero.dodge[lv - 1],
  crt: props.hero.crt[lv - 1],
  dmg: props.hero.dmg[lv - 1],
})));

const skills = computed(() => props.hero.abilities.map((a) => ({
  ...a,
  aoe: a.tar.includes(9),
  tarDots: a.tar.filter((n) => n >= 1 && n <= 4),
})));

const acc = (a: HeroAbility): string => (a.accuracy.length >= 2 ? `${a.accuracy[0]}→${a.accuracy[a.accuracy.length - 1]}` : String(a.accuracy[0] ?? "—"));
const crit = (a: HeroAbility): string => (a.crit.length >= 2 ? `${a.crit[0]}→${a.crit[a.crit.length - 1]}%` : a.crit.length ? `${a.crit[0]}%` : "—");
const dmgMod = (a: HeroAbility): string => (a.damage.length ? a.damage.map((d) => (typeof d === "number" && d < 0 ? `${d}% 伤害` : d)).join(" / ") : "");

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") emit("close");
}
</script>

<template>
  <div class="pm-modal" @click.self="emit('close')">
    <div class="pm-card hm-card">
      <button class="pm-close" :title="t('关闭 (Esc)', 'close')" @click="emit('close')">✕</button>

      <header class="pm-head">
        <div
          class="pm-medal"
          :title="t('点击查看立绘', 'view art')"
          @click="openLightbox(hero.art, hero.name)"
        >
          <img :src="hero.art" alt="">
        </div>
        <div class="pm-idblock">
          <div class="pm-kicker">
            <span class="pm-no">{{ t("英雄卷", "Heroes") }}</span>
            <span class="pm-region">{{ hero.religious === "有" ? t("信教", "Religious") : t("不信", "Unreligious") }}</span>
            <span class="pm-region dim">{{ t("装备等级", "Gear") }} 1–5</span>
          </div>
          <h2 class="pm-name">{{ hero.name }}<span v-if="hero.alias" class="hm-alias">{{ hero.alias }}</span></h2>
          <p v-if="o0.feature" class="hm-feature">{{ o0.feature }}</p>
        </div>
      </header>

      <div class="pm-body">
        <aside class="pm-stats">
          <div class="pm-colhead">{{ t("成长(0 → 6 级)", "Level 0 → 6") }}</div>
          <div v-for="r in compareRows" :key="r.k" class="pm-statrow">
            <span class="k">{{ r.k }}</span>
            <span class="dots"></span>
            <span class="v">{{ r.v0 }} <i class="hm-arrow">→</i> {{ r.v6 }}</span>
          </div>

          <div class="pm-colhead" style="margin-top: 18px">{{ t("装备等级属性", "Gear stats") }}</div>
          <table class="hm-gear">
            <thead><tr><th></th><th v-for="g in gearLevels" :key="g.lv">{{ g.lv }}</th></tr></thead>
            <tbody>
              <tr><td>{{ t("血量", "HP") }}</td><td v-for="g in gearLevels" :key="g.lv">{{ g.hp }}</td></tr>
              <tr><td>{{ t("速度", "SPD") }}</td><td v-for="g in gearLevels" :key="g.lv">{{ g.spd }}</td></tr>
              <tr><td>{{ t("闪避", "DOD") }}</td><td v-for="g in gearLevels" :key="g.lv">{{ g.dodge }}</td></tr>
              <tr><td>{{ t("暴击", "CRIT") }}</td><td v-for="g in gearLevels" :key="g.lv">{{ g.crt }}</td></tr>
              <tr><td>{{ t("伤害", "DMG") }}</td><td v-for="g in gearLevels" :key="g.lv">{{ g.dmg?.replace("-", "~") }}</td></tr>
            </tbody>
          </table>

          <div class="pm-colhead" style="margin-top: 18px">{{ t("抗性(0/6 级)", "Resistances") }}</div>
          <div class="hm-resists">
            <span v-for="(r, i) in hero.resistances" :key="i" class="hm-resist">
              <img :src="`codex/img/Poptext${i}.webp`" alt="">
              {{ r }}
            </span>
          </div>
        </aside>

        <main class="pm-main">
          <div class="pm-colhead">{{ t("技能", "Skills") }} · {{ skills.length }}</div>
          <div class="pm-grid">
            <div v-for="s in skills" :key="s.name" class="pm-skill">
              <div class="head">
                <img class="hm-skillicon" :src="s.img" :alt="s.name" loading="lazy">
                <span class="sn">{{ s.name }}</span>
                <span v-if="s.type" class="ty">{{ s.type }}</span>
                <span v-if="s.limit" class="hm-limit" :title="t('每场战斗限用次数', 'uses per battle')">×{{ s.limit }}</span>
              </div>
              <div class="meta">
                <span v-if="s.accuracy.length" class="m"><i>{{ t("命中", "ACC") }}</i><b>{{ acc(s) }}</b></span>
                <span v-if="s.crit.length" class="m"><i>{{ t("暴击", "CRIT") }}</i><b>{{ crit(s) }}</b></span>
                <span v-if="dmgMod(s)" class="m"><i>{{ t("伤害", "DMG") }}</i><b>{{ dmgMod(s) }}</b></span>
                <span v-for="(fx, i) in s.effectTar" :key="'t' + i" class="fx">{{ fx }}</span>
                <span v-for="(fx, i) in s.effectSelf" :key="'s' + i" class="fx self">{{ fx }}</span>
              </div>
              <div v-if="s.rank.length || s.tarDots.length" class="dotrow">
                <span v-if="s.tarDots.length" class="grp">
                  <i class="lbl">{{ s.type ? t("打击", "Hits") : t("友方", "Allies") }}</i>
                  <RankDots :digits="s.tarDots" kind="target" :aoe="s.aoe" :ally="!s.type" />
                </span>
                <span v-if="s.rank.length" class="grp">
                  <i class="lbl">{{ t("站位", "Pos") }}</i>
                  <RankDots :digits="s.rank" kind="launch" />
                </span>
              </div>
            </div>
          </div>

          <div class="pm-colhead" style="margin-top: 22px">{{ t("扎营技能", "Camping skills") }}</div>
          <ul class="hm-camping">
            <li v-for="c in hero.camping" :key="c.name">
              <img :src="c.img" :alt="c.name" loading="lazy">
              <div><b>{{ c.name }}</b><span>{{ c.des }}</span></div>
            </li>
          </ul>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hm-card { width: min(1080px, 95vw); }
.hm-alias { font-size: 16px; color: var(--muted); letter-spacing: 3px; margin-left: 12px; }
.hm-feature { margin: 2px 0 0; color: var(--gold-dim); font-size: 12px; letter-spacing: 1px; }
.hm-arrow { font-style: normal; color: var(--gold); margin: 0 2px; }
.hm-gear { border-collapse: collapse; width: 100%; font-size: 12px; }
.hm-gear th, .hm-gear td { border: 1px solid var(--line2); padding: 3px 6px; text-align: center; color: var(--ink); }
.hm-gear th { color: var(--gold-dim); font-weight: 400; }
.hm-gear td:first-child { color: var(--muted); text-align: left; font-size: 11px; white-space: nowrap; }
.hm-resists { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.hm-resist { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ink); }
.hm-resist img { width: 18px; height: 18px; }
.hm-skillicon { width: 34px; height: 34px; border: 1px solid var(--line2); background: #0d0a06; flex: none; }
.hm-limit { font-size: 10px; color: var(--gold); border: 1px solid rgba(201, 169, 92, 0.4); border-radius: 999px; padding: 0 7px; line-height: 16px; }
.pm-skill .fx.self { color: var(--gold-dim); }
.hm-camping { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
.hm-camping li { display: flex; gap: 10px; align-items: flex-start; }
.hm-camping img { width: 30px; height: 30px; border: 1px solid var(--line2); background: #0d0a06; flex: none; }
.hm-camping b { display: block; font-size: 13px; color: var(--ink); letter-spacing: 1px; }
.hm-camping span { font-size: 11px; color: var(--muted); line-height: 1.5; }
</style>
