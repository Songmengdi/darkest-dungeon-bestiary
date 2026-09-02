/**
 * Spine 2.1 二进制骨架解析(自适应)+ 姿势合成渲染。
 * 已验证:DD1 .skel = Spine 2.1 binary(字符串为 varint(len)+len-1 字节,浮点为 big-endian)。
 */
import fs from "node:fs";
import type { RgbaImage } from "./png.ts";
import { cropImage } from "./png.ts";

/* ---------- 底层读取(varint 字符串 / big-endian 浮点) ---------- */
class Reader {
  buf: Buffer;
  pos = 0;
  constructor(buf: Buffer) {
    this.buf = buf;
  }
  byte(): number {
    return this.buf[this.pos++];
  }
  varint(): number {
    let b = this.buf[this.pos++];
    let value = b & 0x7f;
    let shift = 7;
    while (b & 0x80) {
      b = this.buf[this.pos++];
      value |= (b & 0x7f) << shift;
      shift += 7;
    }
    return value;
  }
  string(): string | null {
    const len = this.varint();
    if (len === 0) return null;
    const s = this.buf.toString("utf8", this.pos, this.pos + len - 1);
    this.pos += len - 1;
    return s;
  }
  float(): number {
    const v = this.buf.readFloatBE(this.pos);
    this.pos += 4;
    return v;
  }
}

export interface BoneDef {
  name: string;
  parent: number; // -1 = root
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  length: number;
}

export interface SlotDef {
  name: string;
  bone: number;
  attachment: string | null;
}

export interface RegionAttachment {
  slotIndex: number;
  name: string;
  path: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  width: number;
  height: number;
}

export interface SkinDef {
  name: string;
  regions: RegionAttachment[];
}

export interface SkeletonDef {
  version: string;
  bones: BoneDef[];
  slots: SlotDef[];
  skins: SkinDef[];
}

function plausibleName(s: string | null): boolean {
  return !!s && s.length > 0 && s.length < 40 && /^[\x20-\x7e]+$/.test(s);
}

function plausibleFloat(v: number, min: number, max: number): boolean {
  return Number.isFinite(v) && v >= min && v <= max;
}

/**
 * 解析骨架。bones/slots/ik/skins 的字段布局存在版本差异,用健康检查自适应。
 * 抛错时附带已消费字节数,便于诊断。
 */
export function parseSkeleton(buf: Buffer): SkeletonDef {
  const r = new Reader(buf);
  const hash = r.string(); // 仅用于消费
  const version = r.string() ?? "";
  r.float(); // width
  r.float(); // height
  r.string(); // images path (可空)

  /* ---- 骨骼(DD1 fork 实测布局,已交叉验证):
     [nameLen varint, name, (i>0: parent varint, 1-based), preFlag byte, x, y, scaleX, scaleY, rotation, length (6 BE float)] ---- */
  const boneCount = r.varint();
  if (boneCount <= 0 || boneCount > 512) throw new Error(`boneCount 异常: ${boneCount}`);
  const bones: BoneDef[] = [];
  for (let i = 0; i < boneCount; i++) {
    const name = r.string();
    if (!plausibleName(name)) throw new Error(`bone[${i}] 名字异常: ${JSON.stringify(name)} @${r.pos}`);
    let parent = -1;
    if (i > 0) {
      const parentV = r.varint();
      parent = parentV - 1; // 1-based
      if (parent < 0 || parent >= i) throw new Error(`bone[${i}] 父索引非法: ${parentV}`);
    }
    r.byte(); // preFlag
    const x = r.float();
    const y = r.float();
    const scaleX = r.float();
    const scaleY = r.float();
    const rotation = r.float();
    const length = r.float();
    if (
      !plausibleFloat(x, -5000, 5000) ||
      !plausibleFloat(y, -5000, 5000) ||
      !plausibleFloat(scaleX, 0.001, 64) ||
      !plausibleFloat(scaleY, 0.001, 64) ||
      !plausibleFloat(rotation, -7200, 7200) ||
      !plausibleFloat(length, 0, 3000)
    ) {
      throw new Error(
        `bone[${i}] "${name}" 字段越界 x=${x} y=${y} sx=${scaleX} sy=${scaleY} rot=${rotation} len=${length}`,
      );
    }
    bones.push({ name: name as string, parent, x, y, scaleX, scaleY, rotation, length });
  }
  if (bones[0].parent !== -1) throw new Error("首骨骼不是 root");

  /* ---- 槽位(name,bone,r,g,b,a,attachment) ---- */
  const slotCount = r.varint();
  if (slotCount <= 0 || slotCount > 512) throw new Error(`slotCount 异常: ${slotCount}`);
  const slots: SlotDef[] = [];
  for (let i = 0; i < slotCount; i++) {
    const name = r.string();
    if (!plausibleName(name)) throw new Error(`slot[${i}] 名字异常: ${JSON.stringify(name)}`);
    const bone = r.varint();
    if (bone < 0 || bone >= bones.length) throw new Error(`slot[${i}] bone 索引越界: ${bone}`);
    r.float(); // r
    r.float(); // g
    r.float(); // b
    r.float(); // a
    const attachment = r.string();
    slots.push({ name: name as string, bone, attachment });
  }

  /* ---- IK 约束(2.1.17+ 才有该段;用"皮肤头是否合法"自适应探测) ---- */
  const posBeforeIk = r.pos;
  let ikCount = 0;
  const probeSkinHeader = (): boolean => {
    const save = r.pos;
    try {
      const n = r.varint();
      if (n <= 0 || n > 16) return false;
      return plausibleName(r.string());
    } catch {
      return false;
    } finally {
      r.pos = save;
    }
  };
  if (!probeSkinHeader()) {
    // 假设有 IK 段
    ikCount = r.varint();
    if (ikCount > 64) throw new Error(`ikCount 异常: ${ikCount}`);
    for (let i = 0; i < ikCount; i++) {
      r.string(); // name
      const bCount = r.varint();
      for (let b = 0; b < bCount; b++) r.varint();
      r.varint(); // target
      r.float(); // mix
      r.byte(); // bend direction
    }
    if (!probeSkinHeader()) throw new Error(`IK 段探测失败 @${r.pos}`);
  }
  void posBeforeIk;

  /* ---- 皮肤 ---- */
  const skinCount = r.varint();
  if (skinCount <= 0 || skinCount > 64) throw new Error(`skinCount 异常: ${skinCount}`);
  const skins: SkinDef[] = [];
  for (let s = 0; s < skinCount; s++) {
    const skinName = r.string() ?? `skin${s}`;
    const entryCount = r.varint();
    if (entryCount > 4096) throw new Error(`skin ${skinName} entryCount 异常: ${entryCount}`);
    const regions: RegionAttachment[] = [];
    for (let e = 0; e < entryCount; e++) {
      const slotIndex = r.varint();
      if (slotIndex >= slotCount) throw new Error(`skin ${skinName} entry[${e}] slotIndex 越界: ${slotIndex}`);
      const attName = r.string() ?? "";
      const type = r.byte();
      if (type !== 0) {
        // 0=region;mesh/sequence 等暂不支持:尽力跳过不可能,直接报错并定位
        throw new Error(`skin ${skinName} entry[${e}] "${attName}" 非区域附件(type=${type}),暂不支持`);
      }
      let p = r.string();
      if (p === null) p = attName;
      const x = r.float();
      const y = r.float();
      const scaleX = r.float();
      const scaleY = r.float();
      const rotation = r.float();
      const width = r.float();
      const height = r.float();
      if (
        !plausibleFloat(x, -5000, 5000) ||
        !plausibleFloat(y, -5000, 5000) ||
        !plausibleFloat(width, 0, 4096) ||
        !plausibleFloat(height, 0, 4096) ||
        !plausibleFloat(scaleX, 0.001, 64) ||
        !plausibleFloat(scaleY, 0.001, 64)
      ) {
        throw new Error(`skin ${skinName} entry[${e}] "${attName}" 字段越界`);
      }
      regions.push({ slotIndex, name: attName, path: p, x, y, scaleX, scaleY, rotation, width, height });
    }
    skins.push({ name: skinName, regions });
  }

  return { version, bones, slots, skins };
}

/* ---------- 图集解析(name → 存储矩形 + rotate) ---------- */
export interface AtlasRegion {
  name: string;
  x: number;
  y: number;
  w: number; // 未旋转的原始宽
  h: number; // 未旋转的原始高
  rotate: boolean; // 存储时旋转了 90°
}

export function parseAtlas(atlasPath: string): { page: string; regions: Map<string, AtlasRegion> } {
  const text = fs.readFileSync(atlasPath, "utf8");
  const lines = text.split(/\r?\n/);
  const page = lines[0].trim();
  const regions = new Map<string, AtlasRegion>();
  let cur: { name: string; rotate: boolean; xy: [number, number]; size: [number, number] } | null = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      cur = null;
      continue;
    }
    if (!line.startsWith("  ") && !line.startsWith("\t")) {
      // 新区域名
      cur = { name: line.trim(), rotate: false, xy: [0, 0], size: [0, 0] };
      regions.set(cur.name, {
        name: cur.name,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        rotate: false,
      });
      continue;
    }
    if (!cur) continue;
    const [key, ...rest] = line.trim().split(/:\s*/);
    const valStr = rest.join(":");
    if (key === "rotate") {
      cur.rotate = valStr === "true";
    } else if (key === "xy") {
      const [a, b] = valStr.split(/,\s*/).map(Number);
      cur.xy = [a, b];
    } else if (key === "size") {
      const [a, b] = valStr.split(/,\s*/).map(Number);
      cur.size = [a, b];
    } else if (key === "index" && Number(valStr) !== -1) {
      // 序列帧区域,忽略
    }
    // 回写
    const reg = regions.get(cur.name);
    if (reg) {
      reg.rotate = cur.rotate;
      reg.x = cur.xy[0];
      reg.y = cur.xy[1];
      // 旋转存储时,libgdx atlas 的 size 仍为"原始未旋转"尺寸
      reg.w = cur.size[0];
      reg.h = cur.size[1];
    }
  }
  return { page, regions };
}

/** 从图集页图里取一个区域(处理 rotate),返回未旋转 RGBA。 */
export function atlasRegionImage(page: RgbaImage, reg: AtlasRegion): RgbaImage {
  const sw = reg.rotate ? reg.h : reg.w; // 存储宽
  const sh = reg.rotate ? reg.w : reg.h; // 存储高
  const raw = cropImage(page, reg.x, page.height - reg.y - sh, sw, sh);
  if (!reg.rotate) return raw;
  // 存储 = 原图顺时针转 90°;逆旋转回来(从存储 (sx,sy) → 原始 (w=sh? 注意)) 
  const out: RgbaImage = { width: reg.w, height: reg.h, data: Buffer.alloc(reg.w * reg.h * 4) };
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      // 顺时针旋转的逆 = 逆时针:dest(x', y') = src(x, y) 满足 x' = y, y' = rawW-1-x
      const dx = y;
      const dy = raw.width - 1 - x;
      const s = (y * raw.width + x) * 4;
      const d = (dy * out.width + dx) * 4;
      out.data[d] = raw.data[s];
      out.data[d + 1] = raw.data[s + 1];
      out.data[d + 2] = raw.data[s + 2];
      out.data[d + 3] = raw.data[s + 3];
    }
  }
  return out;
}

/* ---------- 姿势合成渲染 ---------- */
interface Xform {
  m00: number;
  m01: number;
  m10: number;
  m11: number;
  tx: number;
  ty: number;
}

/** 计算 setup pose 的骨骼世界变换(Spine 2.1 语义:旋转相加、缩放相乘,y 向上)。 */
function boneWorldMatrices(bones: BoneDef[]): Xform[] {
  const out: Xform[] = [];
  const D2R = Math.PI / 180;
  const wsx: number[] = [];
  const wsy: number[] = [];
  const wrot: number[] = [];
  for (let i = 0; i < bones.length; i++) {
    const b = bones[i];
    let tx: number;
    let ty: number;
    if (b.parent === -1) {
      wsx[i] = b.scaleX;
      wsy[i] = b.scaleY;
      wrot[i] = b.rotation;
      tx = b.x;
      ty = b.y;
    } else {
      const p = out[b.parent];
      wsx[i] = b.scaleX * wsx[b.parent];
      wsy[i] = b.scaleY * wsy[b.parent];
      wrot[i] = b.rotation + wrot[b.parent];
      tx = b.x * p.m00 + b.y * p.m01 + p.tx;
      ty = b.x * p.m10 + b.y * p.m11 + p.ty;
    }
    const rad = wrot[i] * D2R;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    out.push({ m00: cos * wsx[i], m01: -sin * wsy[i], m10: sin * wsx[i], m11: cos * wsy[i], tx, ty });
  }
  return out;
}

function applyXf(xf: Xform, lx: number, ly: number): [number, number] {
  return [lx * xf.m00 + ly * xf.m01 + xf.tx, lx * xf.m10 + ly * xf.m11 + xf.ty];
}

/**
 * 渲染 setup pose → RGBA 画布(透明底,y 翻转为屏幕坐标)。
 * slotOrder 决定叠放次序(先画在下)。
 */
export function renderSkeleton(
  skel: SkeletonDef,
  page: RgbaImage,
  atlas: Map<string, AtlasRegion>,
  opts?: { maxHeight?: number; maxWidth?: number },
): RgbaImage | null {
  const mats = boneWorldMatrices(skel.bones);
  const skin = skel.skins.find((s) => s.name.toLowerCase() === "default") ?? skel.skins[0];
  const D2R = Math.PI / 180;

  interface Draw {
    img: RgbaImage;
    regW: number;
    regH: number;
    xf: Xform;
    corners: [number, number][];
  }
  const draws: Draw[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const att of skin.regions) {
    const reg = atlas.get(att.path) ?? atlas.get(att.name);
    if (!reg || reg.w === 0 || reg.h === 0) continue;
    let img: RgbaImage;
    try {
      img = atlasRegionImage(page, reg);
    } catch {
      continue;
    }
    const bone = mats[skel.slots[att.slotIndex]?.bone ?? 0];
    if (!bone) continue;
    // 附件世界线性部分 = 骨骼线性 · R(att.rotation) · S(att.scale)
    const cos = Math.cos(att.rotation * D2R);
    const sin = Math.sin(att.rotation * D2R);
    const sx = att.scaleX;
    const sy = att.scaleY;
    const [ax, ay] = applyXf(bone, att.x, att.y);
    const xf: Xform = {
      m00: bone.m00 * cos * sx + bone.m01 * sin * sx,
      m01: -bone.m00 * sin * sy + bone.m01 * cos * sy,
      m10: bone.m10 * cos * sx + bone.m11 * sin * sx,
      m11: -bone.m10 * sin * sy + bone.m11 * cos * sy,
      tx: ax,
      ty: ay,
    };
    const hw = reg.w / 2;
    const hh = reg.h / 2;
    const corners: [number, number][] = (
      [
        [-hw, hh],
        [hw, hh],
        [hw, -hh],
        [-hw, -hh],
      ] as [number, number][]
    ).map(([lx, ly]) => applyXf(xf, lx, ly));
    for (const [cx, cy] of corners) {
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }
    draws.push({ img, regW: reg.w, regH: reg.h, xf, corners });
  }
  if (!draws.length) return null;

  const pad = 4;
  const worldW = maxX - minX + pad * 2;
  const worldH = maxY - minY + pad * 2;
  const maxH = opts?.maxHeight ?? 420;
  const maxW = opts?.maxWidth ?? 520;
  const scale = Math.min(1, maxH / worldH, maxW / worldW);
  const W = Math.max(1, Math.ceil(worldW * scale));
  const H = Math.max(1, Math.ceil(worldH * scale));
  const canvas: RgbaImage = { width: W, height: H, data: Buffer.alloc(W * H * 4) };

  for (const d of draws) {
    const { m00, m01, m10, m11, tx, ty } = d.xf;
    const detM = m00 * m11 - m01 * m10;
    if (Math.abs(detM) < 1e-12) continue;
    const i00 = m11 / detM;
    const i01 = -m01 / detM;
    const i10 = -m10 / detM;
    const i11 = m00 / detM;
    const scr = d.corners.map(([wx, wy]) => [(wx - minX + pad) * scale, (maxY - wy + pad) * scale] as [number, number]);
    const sx0 = Math.max(0, Math.floor(Math.min(...scr.map((p) => p[0]))));
    const sy0 = Math.max(0, Math.floor(Math.min(...scr.map((p) => p[1]))));
    const sx1 = Math.min(canvas.width - 1, Math.ceil(Math.max(...scr.map((p) => p[0]))));
    const sy1 = Math.min(canvas.height - 1, Math.ceil(Math.max(...scr.map((p) => p[1]))));
    for (let dy = sy0; dy <= sy1; dy++) {
      for (let dx = sx0; dx <= sx1; dx++) {
        const wx = dx / scale + minX - pad;
        const wy = maxY + pad - dy / scale;
        const rx = wx - tx;
        const ry = wy - ty;
        const lx = rx * i00 + ry * i01;
        const ly = rx * i10 + ry * i11;
        const px = Math.floor(lx + d.regW / 2);
        const py = Math.floor(d.regH / 2 - ly);
        if (px < 0 || py < 0 || px >= d.img.width || py >= d.img.height) continue;
        const s = (py * d.img.width + px) * 4;
        const a = d.img.data[s + 3];
        if (a === 0) continue;
        const dd = (dy * canvas.width + dx) * 4;
        if (a === 255) {
          canvas.data[dd] = d.img.data[s];
          canvas.data[dd + 1] = d.img.data[s + 1];
          canvas.data[dd + 2] = d.img.data[s + 2];
          canvas.data[dd + 3] = 255;
        } else {
          const na = a / 255;
          const oa = canvas.data[dd + 3] / 255;
          const outA = na + oa * (1 - na);
          if (outA === 0) continue;
          canvas.data[dd] = Math.round((d.img.data[s] * na + canvas.data[dd] * oa * (1 - na)) / outA);
          canvas.data[dd + 1] = Math.round((d.img.data[s + 1] * na + canvas.data[dd + 1] * oa * (1 - na)) / outA);
          canvas.data[dd + 2] = Math.round((d.img.data[s + 2] * na + canvas.data[dd + 2] * oa * (1 - na)) / outA);
          canvas.data[dd + 3] = Math.round(outA * 255);
        }
      }
    }
  }
  return canvas;
}
