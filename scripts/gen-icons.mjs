/**
 * Generates PWA icon PNGs (192×192 and 512×512) using only Node built-ins.
 * Background: #0c0e14 (app dark).  Foreground: simple funnel shape drawn in #ff4400.
 *
 * Run once: node scripts/gen-icons.mjs
 */

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0);
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([len, payload, crcBuf]);
}

function makePNG(size) {
  const bg = [0x0c, 0x0e, 0x14]; // #0c0e14
  const fg = [0xff, 0x44, 0x00]; // #ff4400

  // Build RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = (x - cx) / r; // normalised -1..1
      const ny = (y - cy) / r;

      // Circular clip for maskable icon safe zone
      const dist2 = nx * nx + ny * ny;

      // Tornado funnel shape: a triangle/cone from top, narrowing at 65% down
      // Top of funnel: wide ellipse; bottom: point
      // Coordinates normalised: ny ranges -1 (top) to +1 (bottom)
      //   funnel at ny: half-width = 0.55 * (1 - (ny+1)/2 * 0.7)  for ny in [-0.4, 0.6]
      //   tail: narrow vertical line below funnel

      // Funnel body: from ny=-0.5 to ny=0.3
      const funnelTop = -0.5;
      const funnelBot = 0.3;
      const tailBot = 0.65;

      let isFg = false;

      if (ny >= funnelTop && ny <= funnelBot) {
        const t = (ny - funnelTop) / (funnelBot - funnelTop); // 0..1
        const hw = 0.55 * (1 - t * 0.85); // half-width, narrows as t grows
        isFg = Math.abs(nx) <= hw;
      } else if (ny > funnelBot && ny <= tailBot) {
        // Tail: tiny rectangle
        const tw = 0.07;
        isFg = Math.abs(nx) <= tw;
      }

      // Background everywhere inside the circle
      if (dist2 > 1) {
        // outside maskable safe zone — transparent (for any-purpose icon)
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      const [pr, pg, pb] = isFg ? fg : bg;
      pixels[idx] = pr;
      pixels[idx + 1] = pg;
      pixels[idx + 2] = pb;
      pixels[idx + 3] = 255;
    }
  }

  // Encode as PNG (RGBA 8-bit)
  // Each row: filter byte (0 = None) + RGBA pixels
  const rowSize = 1 + size * 4;
  const raw = new Uint8Array(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    raw.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * rowSize + 1);
  }

  const compressed = deflateSync(Buffer.from(raw));

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", makePNG(192));
writeFileSync("public/icon-512.png", makePNG(512));
console.log("Generated public/icon-192.png and public/icon-512.png");
