/**
 * Brand asset pipeline — derives web assets from the CLIENT'S OFFICIAL LOGO.
 *
 * The supplied logo is never redrawn, recoloured or distorted. This script only:
 *   1. copies the original file into the app untouched,
 *   2. removes its flat pink background to produce a transparent version for
 *      light surfaces (navbar / footer / admin),
 *   3. composites the mark on opaque pink for favicon + app icons,
 *   4. builds a social (Open Graph) image.
 *
 * Every derived asset keeps the original 1:1 geometry and aspect ratio.
 *
 *   node scripts/brand-assets.mjs <path-to-logo.png>
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRAND_DIR = path.join(ROOT, 'client/public/brand');
const PUBLIC_DIR = path.join(ROOT, 'client/public');

// ── PNG decoding (8-bit, non-interlaced, RGB or RGBA) ────────────

function decodePng(buffer) {
  if (buffer.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Not a PNG file');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  let off = 8;
  while (off < buffer.length) {
    const len = buffer.readUInt32BE(off);
    const type = buffer.slice(off + 4, off + 8).toString('ascii');
    const data = buffer.slice(off + 8, off + 8 + len);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth: ${bitDepth}`);
  if (interlace !== 0) throw new Error('Interlaced PNGs are not supported');
  if (colorType !== 2 && colorType !== 6) {
    throw new Error(`Unsupported colour type: ${colorType} (expected 2=RGB or 6=RGBA)`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);

  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let prevRow = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const row = Buffer.from(raw.slice(rowStart, rowStart + stride));

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      switch (filter) {
        case 0: break;
        case 1: row[x] = (row[x] + a) & 0xff; break;
        case 2: row[x] = (row[x] + b) & 0xff; break;
        case 3: row[x] = (row[x] + ((a + b) >> 1)) & 0xff; break;
        case 4: row[x] = (row[x] + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`Unknown filter type ${filter}`);
      }
    }

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = row[s];
      out[d + 1] = row[s + 1];
      out[d + 2] = row[s + 2];
      out[d + 3] = channels === 4 ? row[s + 3] : 255;
    }
    prevRow = row;
  }

  return { width, height, data: out };
}

// ── PNG encoding (RGBA, filter 0) ────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Pixel helpers ────────────────────────────────────────────────

const px = (img, x, y) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function resize(img, targetW, targetH) {
  const out = Buffer.alloc(targetW * targetH * 4);
  const sx = img.width / targetW;
  const sy = img.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const fx = Math.min(img.width - 1, (x + 0.5) * sx - 0.5);
      const fy = Math.min(img.height - 1, (y + 0.5) * sy - 0.5);
      const x0 = Math.max(0, Math.floor(fx));
      const y0 = Math.max(0, Math.floor(fy));
      const x1 = Math.min(img.width - 1, x0 + 1);
      const y1 = Math.min(img.height - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;

      const corners = [px(img, x0, y0), px(img, x1, y0), px(img, x0, y1), px(img, x1, y1)];
      const d = (y * targetW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = corners[0][c] * (1 - tx) + corners[1][c] * tx;
        const bottom = corners[2][c] * (1 - tx) + corners[3][c] * tx;
        out[d + c] = Math.round(top * (1 - ty) + bottom * ty);
      }
    }
  }
  return { width: targetW, height: targetH, data: out };
}

/** Composites a transparent image over an opaque RGB background colour. */
function overOpaque(img, [br, bg, bb]) {
  const out = Buffer.alloc(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255;
    out[i] = Math.round(img.data[i] * a + br * (1 - a));
    out[i + 1] = Math.round(img.data[i + 1] * a + bg * (1 - a));
    out[i + 2] = Math.round(img.data[i + 2] * a + bb * (1 - a));
    out[i + 3] = 255;
  }
  return { width: img.width, height: img.height, data: out };
}

// ── Main ─────────────────────────────────────────────────────────

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/brand-assets.mjs <path-to-logo.png>');
  process.exit(1);
}

const original = fs.readFileSync(source);
const logo = decodePng(original);
console.log(`Source logo: ${logo.width}×${logo.height}`);

// Background colour = the pixel at the corner (the logo sits on flat pink).
const bgRgb = px(logo, 2, 2).slice(0, 3);
const bgLum = lum(bgRgb);
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
console.log(`Detected background: ${hex(bgRgb)} (luminance ${bgLum.toFixed(1)})`);

// Remove the flat background: alpha comes from how far a pixel is from the
// background toward black, then the colour is un-premultiplied so the line art
// stays crisp (no pink halo) on any surface.
const transparent = { width: logo.width, height: logo.height, data: Buffer.alloc(logo.data.length) };
let artPixels = 0;
for (let i = 0; i < logo.data.length; i += 4) {
  const r = logo.data[i];
  const g = logo.data[i + 1];
  const b = logo.data[i + 2];
  const l = lum([r, g, b]);
  let t = bgLum > 0 ? (bgLum - l) / bgLum : 0;
  t = Math.max(0, Math.min(1, t));
  if (t < 0.04) t = 0;

  const alpha = Math.round(t * 255);
  if (t > 0) {
    artPixels++;
    // C_out = (C - (1 - t) * bg) / t   → recovers the true art colour
    const un = (c, bgc) => Math.max(0, Math.min(255, Math.round((c - (1 - t) * bgc) / t)));
    transparent.data[i] = un(r, bgRgb[0]);
    transparent.data[i + 1] = un(g, bgRgb[1]);
    transparent.data[i + 2] = un(b, bgRgb[2]);
  }
  transparent.data[i + 3] = alpha;
}
console.log(`Art coverage: ${((artPixels / (logo.width * logo.height)) * 100).toFixed(1)}% of pixels`);

fs.mkdirSync(BRAND_DIR, { recursive: true });

// 1. Original, byte-for-byte, as supplied by the client.
const originalPath = path.join(BRAND_DIR, 'glow-by-parveen-logo.png');
fs.writeFileSync(originalPath, original);

// 2. Transparent version for light surfaces.
const transparentPath = path.join(BRAND_DIR, 'glow-by-parveen-logo-transparent.png');
fs.writeFileSync(transparentPath, encodePng(transparent));

// 2b. Trimmed variant — removes only empty transparent padding so the mark and
//     wordmark stay legible in tight spaces (navbar). Geometry is untouched.
function trimTransparent(img, marginRatio = 0.02) {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) throw new Error('No visible pixels found to trim');

  // Keep a square crop so the aspect ratio is never altered.
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const side = Math.max(boxW, boxH);
  const margin = Math.round(side * marginRatio);
  const size = Math.min(Math.max(boxW, boxH) + margin * 2, Math.max(img.width, img.height));

  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const x0 = Math.max(0, Math.min(img.width - size, cx - Math.round(size / 2)));
  const y0 = Math.max(0, Math.min(img.height - size, cy - Math.round(size / 2)));

  const out = { width: size, height: size, data: Buffer.alloc(size * size * 4) };
  for (let y = 0; y < size; y++) {
    img.data.copy(
      out.data,
      y * size * 4,
      ((y0 + y) * img.width + x0) * 4,
      ((y0 + y) * img.width + x0 + size) * 4
    );
  }

  console.log(
    `Ink bounds: x ${minX}–${maxX}, y ${minY}–${maxY} → trimmed to ${size}×${size}`
  );
  return out;
}

const trimmed = trimTransparent(transparent);
const trimmedPath = path.join(BRAND_DIR, 'glow-by-parveen-logo-trimmed.png');
fs.writeFileSync(trimmedPath, encodePng(trimmed));

// 3. Favicon + app icon — opaque pink so the mark reads at small sizes.
function iconOnPink(size, paddingRatio) {
  const canvas = { width: size, height: size, data: Buffer.alloc(size * size * 4) };
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = bgRgb[0];
    canvas.data[i + 1] = bgRgb[1];
    canvas.data[i + 2] = bgRgb[2];
    canvas.data[i + 3] = 255;
  }

  const inner = Math.round(size * paddingRatio);
  const scaled = resize(transparent, inner, inner);
  const offset = Math.round((size - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const d = ((y + offset) * size + (x + offset)) * 4;
      const a = scaled.data[s + 3] / 255;
      canvas.data[d] = Math.round(scaled.data[s] * a + canvas.data[d] * (1 - a));
      canvas.data[d + 1] = Math.round(scaled.data[s + 1] * a + canvas.data[d + 1] * (1 - a));
      canvas.data[d + 2] = Math.round(scaled.data[s + 2] * a + canvas.data[d + 2] * (1 - a));
      canvas.data[d + 3] = 255;
    }
  }
  return canvas;
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32.png'), encodePng(iconOnPink(32, 0.86)));
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-48.png'), encodePng(iconOnPink(48, 0.86)));
fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), encodePng(iconOnPink(180, 0.82)));

// 4. Social sharing image (1200×630) — soft pink → white gradient behind the mark.
function socialImage() {
  const W = 1200;
  const H = 630;
  const img = { width: W, height: H, data: Buffer.alloc(W * H * 4) };
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    const bg = [
      Math.round(bgRgb[0] * (1 - t) + 255 * t),
      Math.round(bgRgb[1] * (1 - t) + 252 * t),
      Math.round(bgRgb[2] * (1 - t) + 250 * t),
    ];
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      img.data[i] = bg[0];
      img.data[i + 1] = bg[1];
      img.data[i + 2] = bg[2];
      img.data[i + 3] = 255;
    }
  }

  const inner = 420;
  const scaled = resize(transparent, inner, inner);
  const ox = Math.round((W - inner) / 2);
  const oy = Math.round((H - inner) / 2);
  for (let y = 0; y < inner; y++) {
    for (let x = 0; x < inner; x++) {
      const s = (y * inner + x) * 4;
      const d = ((y + oy) * W + (x + ox)) * 4;
      const a = scaled.data[s + 3] / 255;
      img.data[d] = Math.round(scaled.data[s] * a + img.data[d] * (1 - a));
      img.data[d + 1] = Math.round(scaled.data[s + 1] * a + img.data[d + 1] * (1 - a));
      img.data[d + 2] = Math.round(scaled.data[s + 2] * a + img.data[d + 2] * (1 - a));
    }
  }
  return img;
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'og-image.png'), encodePng(socialImage()));

console.log('\nWritten:');
for (const p of [
  originalPath,
  transparentPath,
  trimmedPath,
  path.join(PUBLIC_DIR, 'favicon-32.png'),
  path.join(PUBLIC_DIR, 'favicon-48.png'),
  path.join(PUBLIC_DIR, 'apple-touch-icon.png'),
  path.join(PUBLIC_DIR, 'og-image.png'),
]) {
  console.log(`  ${path.relative(ROOT, p)} (${(fs.statSync(p).size / 1024).toFixed(1)} KB)`);
}
console.log(`\nBrand pink from logo: ${hex(bgRgb)}`);
