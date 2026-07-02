// Generates the PWA app icons (purple full-bleed with a white bagel ring)
// without any image dependencies: raw RGBA -> minimal PNG encoder.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const PURPLE = [0x61, 0x61, 0xff, 255];
const WHITE = [255, 255, 255, 255];

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const outer = size * 0.32;
  const inner = size * 0.14;
  const feather = Math.max(1, size / 256); // soft edge
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5);
      // ring coverage 0..1 with feathered edges
      const t = Math.min(
        Math.max((outer - d) / feather + 0.5, 0),
        Math.max((d - inner) / feather + 0.5, 0),
        1
      );
      const i = (y * size + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        px[i + ch] = Math.round(PURPLE[ch] + (WHITE[ch] - PURPLE[ch]) * t);
      }
    }
  }
  return px;
}

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const [size, name] of [
  [512, "icon-512.png"],
  [192, "icon-192.png"],
  [180, "apple-touch-icon.png"],
]) {
  writeFileSync(`public/icons/${name}`, encodePng(size, drawIcon(size)));
  console.log(`wrote public/icons/${name}`);
}
