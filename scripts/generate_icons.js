import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(size, isMaskable = false) {
  const width = size;
  const height = size;
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;

      // For standard ("any"), use a rounded squircle with transparent outside.
      // For maskable, full-bleed solid background (Android handles the squircle/circle crop).
      let isInside = true;
      if (!isMaskable) {
        const cornerRad = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (cx - cornerRad));
        const qy = Math.max(0, Math.abs(dy) - (cy - cornerRad));
        const boxDist = Math.sqrt(qx * qx + qy * qy);
        if (boxDist > cornerRad) {
          isInside = false;
        }
      }

      if (!isInside) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      } else {
        // Gradient background from Deep Violet #6366f1 to Vibrant Purple #a855f7
        const t = (x + y) / (width + height);
        const r = Math.round(108 + t * 65);
        const g = Math.round(40 + t * 40);
        const b = Math.round(217 + t * 30);
        
        // Inner glyph: dual overlapping squares (cloning symbol)
        // Kept within the 80% safe zone for maskable compatibility
        const glyphScale = isMaskable ? 0.72 : 0.85;
        const sqSize = size * 0.18 * glyphScale;
        const offset = size * 0.075 * glyphScale;

        const inSq1 = Math.abs(x - (cx - offset)) < sqSize && Math.abs(y - (cy - offset)) < sqSize;
        const inSq2 = Math.abs(x - (cx + offset)) < sqSize && Math.abs(y - (cy + offset)) < sqSize;
        
        const strokeW = Math.max(2, size * 0.03 * glyphScale);
        const isBorder1 = inSq1 && (Math.abs(Math.abs(x - (cx - offset)) - sqSize) < strokeW || Math.abs(Math.abs(y - (cy - offset)) - sqSize) < strokeW);
        const isBorder2 = inSq2 && (Math.abs(Math.abs(x - (cx + offset)) - sqSize) < strokeW || Math.abs(Math.abs(y - (cy + offset)) - sqSize) < strokeW);

        if (isBorder2 || isBorder1) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else if (inSq2) {
          rawData[pxOffset] = Math.min(255, r + 45);
          rawData[pxOffset + 1] = Math.min(255, g + 40);
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const dirs = ['./icons', './public/icons'];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

[192, 512].forEach(size => {
  // Standard any icon
  const pngAny = generatePng(size, false);
  fs.writeFileSync(`./icons/icon-${size}.png`, pngAny);
  fs.writeFileSync(`./public/icons/icon-${size}.png`, pngAny);
  console.log(`Generated icon-${size}.png (purpose: any)`);

  // Maskable icon
  const pngMaskable = generatePng(size, true);
  fs.writeFileSync(`./icons/icon-${size}-maskable.png`, pngMaskable);
  fs.writeFileSync(`./public/icons/icon-${size}-maskable.png`, pngMaskable);
  console.log(`Generated icon-${size}-maskable.png (purpose: maskable)`);
});
