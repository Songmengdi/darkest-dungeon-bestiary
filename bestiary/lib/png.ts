/** 纯 Node 的 PNG 读写(8bit RGBA 为主),零第三方依赖。 */
import zlib from "node:zlib";

export interface RgbaImage {
  width: number;
  height: number;
  data: Buffer; // RGBA8, length = width*height*4
}

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** 解码 PNG(8bit,灰度/RGB/灰度+A/RGBA/调色板;不支持隔行)。 */
export function decodePng(buf: Buffer): RgbaImage {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error("not a png");
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette: Buffer | undefined;
  const idat: Buffer[] = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = Buffer.from(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error("interlaced png unsupported");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = channels;
  const stride = width * bpp;
  const recon = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawv = raw[src + x];
      const left = x >= bpp ? recon[dst + x - bpp] : 0;
      const up = y > 0 ? recon[dst + x - stride] : 0;
      const ul = y > 0 && x >= bpp ? recon[dst + x - stride - bpp] : 0;
      let v: number;
      if (f === 0) v = rawv;
      else if (f === 1) v = rawv + left;
      else if (f === 2) v = rawv + up;
      else if (f === 3) v = rawv + ((left + up) >> 1);
      else v = rawv + paeth(left, up, ul);
      recon[dst + x] = v & 0xff;
    }
  }
  const out = Buffer.alloc(width * height * 4);
  const px = width * height;
  for (let i = 0; i < px; i++) {
    const s = i * bpp;
    const d = i * 4;
    if (colorType === 6) {
      out[d] = recon[s];
      out[d + 1] = recon[s + 1];
      out[d + 2] = recon[s + 2];
      out[d + 3] = recon[s + 3];
    } else if (colorType === 2) {
      out[d] = recon[s];
      out[d + 1] = recon[s + 1];
      out[d + 2] = recon[s + 2];
      out[d + 3] = 255;
    } else if (colorType === 0) {
      out[d] = out[d + 1] = out[d + 2] = recon[s];
      out[d + 3] = 255;
    } else if (colorType === 4) {
      out[d] = out[d + 1] = out[d + 2] = recon[s];
      out[d + 3] = recon[s + 1];
    } else if (colorType === 3 && palette) {
      const pi = recon[s] * 3;
      out[d] = palette[pi];
      out[d + 1] = palette[pi + 1];
      out[d + 2] = palette[pi + 2];
      out[d + 3] = 255;
    }
  }
  return { width, height, data: out };
}

/** 编码 RGBA8 PNG。 */
export function encodePng(img: RgbaImage): Buffer {
  const { width, height, data } = img;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function cropImage(img: RgbaImage, x: number, y: number, w: number, h: number): RgbaImage {
  x = Math.max(0, Math.min(x, img.width));
  y = Math.max(0, Math.min(y, img.height));
  w = Math.max(1, Math.min(w, img.width - x));
  h = Math.max(1, Math.min(h, img.height - y));
  const out = Buffer.alloc(w * h * 4);
  for (let r = 0; r < h; r++) {
    img.data.copy(out, r * w * 4, ((y + r) * img.width + x) * 4, ((y + r) * img.width + x + w) * 4);
  }
  return { width: w, height: h, data: out };
}

/** 裁掉四周全透明边。返回 null 表示整图透明。 */
export function trimImage(img: RgbaImage, alphaMin = 8): RgbaImage | null {
  const { width, height, data } = img;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaMin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return cropImage(img, minX, minY, maxX - minX + 1, maxY - minY + 1);
}

/** 简单盒式缩小到 maxWidth(只缩不放)。 */
export function downscale(img: RgbaImage, maxWidth: number): RgbaImage {
  if (img.width <= maxWidth) return img;
  const scale = img.width / maxWidth;
  const w = maxWidth;
  const h = Math.max(1, Math.round(img.height / scale));
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy0 = Math.floor(y * scale);
    const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * scale));
    for (let x = 0; x < w; x++) {
      const sx0 = Math.floor(x * scale);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1 && sy < img.height; sy++) {
        for (let sx = sx0; sx < sx1 && sx < img.width; sx++) {
          const s = (sy * img.width + sx) * 4;
          r += img.data[s] * img.data[s + 3];
          g += img.data[s + 1] * img.data[s + 3];
          b += img.data[s + 2] * img.data[s + 3];
          a += img.data[s + 3];
          n++;
        }
      }
      const d = (y * w + x) * 4;
      if (a > 0) {
        out[d] = Math.round(r / a);
        out[d + 1] = Math.round(g / a);
        out[d + 2] = Math.round(b / a);
        out[d + 3] = Math.round(a / n);
      }
    }
  }
  return { width: w, height: h, data: out };
}
