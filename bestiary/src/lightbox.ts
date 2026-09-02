/* 灯箱(看原画大图)的 UI 态:src/title 单槽 + 开/关。
 * UI 状态归 UI 模块 —— 不再住在数据层(原 data.ts 的 locality 错位已归位)。 */
import { ref } from "vue";

export const lightbox = ref<{ src: string; title: string } | null>(null);

export function openLightbox(src: string, title: string): void {
  lightbox.value = { src, title };
}

export function closeLightbox(): void {
  lightbox.value = null;
}
