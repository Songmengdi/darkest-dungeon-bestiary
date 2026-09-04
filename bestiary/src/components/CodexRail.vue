<!-- 书脊导航:图鉴总集的卷册目录,像一排立在书架上的书脊 -->
<script setup lang="ts">
import { t } from "../i18n";

defineProps<{
  volumes: { id: string; zh: string; en: string }[];
  current: string;
}>();
const emit = defineEmits<{ nav: [id: string] }>();
</script>

<template>
  <nav class="cx-rail">
    <button
      v-for="v in volumes"
      :key="v.id"
      class="cx-spine"
      :class="{ on: current === v.id }"
      :title="t(v.zh, v.en)"
      @click="emit('nav', v.id)"
    >{{ v.zh }}</button>
  </nav>
</template>
