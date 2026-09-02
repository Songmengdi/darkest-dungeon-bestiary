import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

export interface ResolvedGame {
  gameRoot: string;
  dataDir: string;
  source: "env" | "auto";
}

function looksLikeDataDir(p: string): boolean {
  try {
    return (
      fs.statSync(path.join(p, "heroes")).isDirectory() &&
      fs.statSync(path.join(p, "monsters")).isDirectory()
    );
  } catch {
    return false;
  }
}

function dataDirCandidates(gameRoot: string): string[] {
  return [
    path.join(gameRoot, "darkestdungeon"),
    path.join(gameRoot, "_osx", "Darkest.app", "Contents", "Resources", "data"),
    gameRoot,
  ];
}

function steamCommonRoots(): string[] {
  const home = os.homedir();
  const roots: string[] = [];
  if (process.env["PROGRAMFILES(X86)"]) {
    roots.push(path.join(process.env["PROGRAMFILES(X86)"], "Steam", "steamapps", "common"));
  }
  if (process.env["ProgramFiles"]) {
    roots.push(path.join(process.env["ProgramFiles"], "Steam", "steamapps", "common"));
  }
  roots.push(
    path.join(home, "Library", "Application Support", "Steam", "steamapps", "common"),
    path.join(home, ".local", "share", "Steam", "steamapps", "common"),
    path.join(home, ".steam", "steam", "steamapps", "common"),
  );
  return roots;
}

/** Windows 下从注册表读 Steam 安装路径,再解析 libraryfolders.vdf 拿到全部库目录(含非默认盘,如 D:\software\steam)。 */
function registrySteamCommonRoots(): string[] {
  if (process.platform !== "win32") return [];
  try {
    const out = execSync('reg query HKCU\\Software\\Valve\\Steam /v SteamPath', {
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (!m) return [];
    const steamRoot = m[1].trim().replace(/\//g, "\\");
    const roots = [steamRoot];
    try {
      const vdf = fs.readFileSync(path.join(steamRoot, "steamapps", "libraryfolders.vdf"), "utf8");
      for (const lm of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
        roots.push(lm[1].replace(/\\\\/g, "\\").replace(/\//g, "\\"));
      }
    } catch {
      // 读不到 vdf 就只用主库
    }
    return [...new Set(roots)].map((r) => path.join(r, "steamapps", "common"));
  } catch {
    return [];
  }
}

export function resolveGame(): ResolvedGame {
  const envDir = process.env["DD_GAME_DIR"] ?? process.env["DD_DATA_DIR"];
  if (envDir) {
    for (const cand of dataDirCandidates(envDir)) {
      if (looksLikeDataDir(cand)) {
        return { gameRoot: envDir, dataDir: cand, source: "env" };
      }
    }
    throw new Error(
      `DD_GAME_DIR=${envDir} 下未找到数据目录(需要含 heroes/ 和 monsters/,或其标准子目录)`,
    );
  }
  const tried: string[] = [];
  for (const common of [...steamCommonRoots(), ...registrySteamCommonRoots()]) {
    const gameRoot = path.join(common, "DarkestDungeon");
    for (const cand of dataDirCandidates(gameRoot)) {
      tried.push(cand);
      if (looksLikeDataDir(cand)) {
        return { gameRoot, dataDir: cand, source: "auto" };
      }
    }
  }
  throw new Error(
    "未找到 Darkest Dungeon 安装目录。已尝试:\n  " +
      tried.join("\n  ") +
      '\n请设置环境变量 DD_GAME_DIR 指向游戏根目录(如 "C:\\Program Files (x86)\\Steam\\steamapps\\common\\DarkestDungeon")。',
  );
}
