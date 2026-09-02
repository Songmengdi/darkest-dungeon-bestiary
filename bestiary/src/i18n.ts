/* 语言态:全局单选语言(默认中文)+ 双语取词。
 * 只讲一件事:是什么语言、按语言取词。任何模块需要「跟语言走」都从这里拿。 */
import { ref } from "vue";

export type Lang = "zh" | "en";

export const LANG = ref<Lang>("zh");

export function setLang(l: Lang): void {
  LANG.value = l;
}

/** 双语取词:zh 必填,en 缺省时回退 zh(该词未翻译) */
export function t(zh: string, en?: string): string {
  return LANG.value === "zh" ? zh : (en ?? zh);
}
