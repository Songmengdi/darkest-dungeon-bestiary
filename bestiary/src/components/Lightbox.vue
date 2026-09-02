<script setup lang="ts">
import { closeLightbox, lightbox } from "../data";
</script>

<template>
  <div v-if="lightbox" class="bz-lightbox" @click="closeLightbox()">
    <div class="inner">
      <img :src="lightbox.src" :alt="lightbox.title">
      <div class="cap">{{ lightbox.title }}</div>
      <div class="hint">点击任意处关闭</div>
    </div>
  </div>
</template>
