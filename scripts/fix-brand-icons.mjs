import fs from "node:fs";
import zlib from "node:zlib";

function readPng(path) {
  const buf = fs.readFileSync(path);
  let off = 8;
  let w = 0;
  let h = 0;
  let ctype = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ctype = data[9];
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ctype === 6 ? 4 : ctype === 2 ? 3 : 1;
  const stride = w * bpp + 1;
  const pixels = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(w * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    const row = Buffer.from(raw.subarray(y * stride + 1, y * stride + 1 + w * bpp));
    if (f === 1) {
      for (let i = 0; i < row.length; i++) row[i] = (row[i] + (i >= bpp ? row[i - bpp] : 0)) & 255;
    } else if (f === 2) {
      for (let i = 0; i < row.length; i++) row[i] = (row[i] + prev[i]) & 255;
    } else if (f === 3) {
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        row[i] = (row[i] + Math.floor((a + b) / 2)) & 255;
      }
    } else if (f === 4) {
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        row[i] = (row[i] + pr) & 255;
      }
    }
    prev = Buffer.from(row);
    for (let x = 0; x < w; x++) {
      const si = x * bpp;
      const di = (y * w + x) * 4;
      pixels[di] = row[si];
      pixels[di + 1] = bpp > 1 ? row[si + 1] : row[si];
      pixels[di + 2] = bpp > 2 ? row[si + 2] : row[si];
      pixels[di + 3] = bpp === 4 ? row[si + 3] : 255;
    }
  }
  return { w, h, pixels };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function writePng(path, w, h, pixels) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    pixels.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const out = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, out);
}

function isNearWhite(r, g, b, threshold = 240) {
  return r >= threshold && g >= threshold && b >= threshold;
}

function contentBounds(img) {
  let minX = img.w;
  let minY = img.h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const r = img.pixels[i];
      const g = img.pixels[i + 1];
      const b = img.pixels[i + 2];
      const a = img.pixels[i + 3];
      if (a < 12) continue;
      if (isNearWhite(r, g, b)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    return { minX: 0, minY: 0, maxX: img.w - 1, maxY: img.h - 1 };
  }
  const pad = Math.round(Math.max(img.w, img.h) * 0.02);
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(img.w - 1, maxX + pad),
    maxY: Math.min(img.h - 1, maxY + pad),
  };
}

function cropToSquare(img, bounds) {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const side = Math.max(width, height);
  const out = Buffer.alloc(side * side * 4, 0);
  const ox = Math.floor((side - width) / 2);
  const oy = Math.floor((side - height) / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = ((bounds.minY + y) * img.w + (bounds.minX + x)) * 4;
      const di = ((oy + y) * side + (ox + x)) * 4;
      const r = img.pixels[si];
      const g = img.pixels[si + 1];
      const b = img.pixels[si + 2];
      if (isNearWhite(r, g, b, 248)) {
        out[di] = 0;
        out[di + 1] = 0;
        out[di + 2] = 0;
        out[di + 3] = 0;
      } else {
        out[di] = r;
        out[di + 1] = g;
        out[di + 2] = b;
        out[di + 3] = 255;
      }
    }
  }
  return { w: side, h: side, pixels: out };
}

function resize(src, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(src.w - 1, Math.floor(((x + 0.5) * src.w) / size));
      const sy = Math.min(src.h - 1, Math.floor(((y + 0.5) * src.h) / size));
      const si = (sy * src.w + sx) * 4;
      const di = (y * size + x) * 4;
      out[di] = src.pixels[si];
      out[di + 1] = src.pixels[si + 1];
      out[di + 2] = src.pixels[si + 2];
      out[di + 3] = src.pixels[si + 3];
    }
  }
  return out;
}

function withBackground(src, bg = [255, 255, 255, 255]) {
  const out = Buffer.alloc(src.w * src.h * 4);
  for (let i = 0; i < src.w * src.h; i++) {
    const si = i * 4;
    const a = src.pixels[si + 3] / 255;
    out[si] = Math.round(src.pixels[si] * a + bg[0] * (1 - a));
    out[si + 1] = Math.round(src.pixels[si + 1] * a + bg[1] * (1 - a));
    out[si + 2] = Math.round(src.pixels[si + 2] * a + bg[2] * (1 - a));
    out[si + 3] = 255;
  }
  return out;
}

const src = readPng("assets/IMG_20260716_231246.jpg");
const bounds = contentBounds(src);
const cropped = cropToSquare(src, bounds);
const size = 1024;
const transparent = resize(cropped, size);
const opaque = withBackground({ w: size, h: size, pixels: transparent }, [255, 255, 255, 255]);

writePng("assets/brand-icon.png", size, size, transparent);
writePng("assets/android-icon-foreground.png", size, size, transparent);
writePng("assets/icon.png", size, size, opaque);
writePng("assets/favicon.png", size, size, opaque);
writePng("assets/splash-icon.png", size, size, opaque);
const bg = Buffer.alloc(size * size * 4);
for (let i = 0; i < size * size; i++) {
  const o = i * 4;
  bg[o] = 255; bg[o + 1] = 255; bg[o + 2] = 255; bg[o + 3] = 255;
}
writePng("assets/android-icon-background.png", size, size, bg);

const verify = readPng("assets/icon.png");
const i = ((size / 2) * size + size / 2) * 4;
console.log("bounds", bounds, "cropped", cropped.w);
console.log(
  "icon center",
  verify.pixels[i],
  verify.pixels[i + 1],
  verify.pixels[i + 2],
  verify.pixels[i + 3],
);