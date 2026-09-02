/* 图鉴数据导出 CLI:npm run export -- [outDir]
 * 默认输出到兄弟项目 bestiary 的 public/data(入库产物);wiki 贴图由 bestiary scripts/assets.ts 处理。 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportBestiary } from "../src/export/bestiary.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? path.resolve(here, "../../bestiary/public/data");
exportBestiary(path.resolve(outDir));
