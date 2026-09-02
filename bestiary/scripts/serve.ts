/** 怪物图鉴静态服务器:npm run serve 后访问 http://127.0.0.1:8899 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 默认服务 public/(旧版/数据源);设 BESTIARY_ROOT 可指向其它目录,如 Vue 构建产物:../dist
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env["BESTIARY_ROOT"] ?? "../public",
);
const PORT = Number(process.env["BESTIARY_PORT"] ?? 8899);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  let file = abs;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(ROOT, "index.html"); // SPA 兜底
  }
  try {
    const data = fs.readFileSync(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`怪物图鉴已启动: http://127.0.0.1:${PORT}`);
});
