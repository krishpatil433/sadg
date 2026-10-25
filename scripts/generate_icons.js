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

function generatePng(size) {
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

  // Raw image data: height rows, each: 1 byte filter (0) + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle / box background
      const cornerRad = width * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (cx - cornerRad));
      const qy = Math.max(0, Math.abs(dy) - (cy - cornerRad));
      const boxDist = Math.sqrt(qx * qx + qy * qy);

      if (boxDist > cornerRad) {
        // Transparent outside rounded icon
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      } else {
        // Gradient from Deep Violet #6366f1 to Vibrant Purple #a855f7
        const t = (x + y) / (width + height);
        const r = Math.round(108 + t * 65);
        const g = Math.round(40 + t * 40);
        const b = Math.round(217 + t * 30);
        
        // Inner glyph: dual overlapping squares / clone symbol
        // Main square 1: centered left-top
        const inSq1 = Math.abs(x - (cx - size * 0.08)) < size * 0.2 && Math.abs(y - (cy - size * 0.08)) < size * 0.2;
        // Clone square 2: centered right-bottom
        const inSq2 = Math.abs(x - (cx + size * 0.08)) < size * 0.2 && Math.abs(y - (cy + size * 0.08)) < size * 0.2;
        
        const isBorder1 = inSq1 && (Math.abs(Math.abs(x - (cx - size * 0.08)) - size * 0.2) < size * 0.035 || Math.abs(Math.abs(y - (cy - size * 0.08)) - size * 0.2) < size * 0.035);
        const isBorder2 = inSq2 && (Math.abs(Math.abs(x - (cx + size * 0.08)) - size * 0.2) < size * 0.035 || Math.abs(Math.abs(y - (cy + size * 0.08)) - size * 0.2) < size * 0.035);

        if (isBorder2 || isBorder1) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 245;
        } else if (inSq2) {
          // slight bright overlay for secondary app
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

const dirs = ['/icons', '/public/icons'];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

[192, 512].forEach(size => {
  const png = generatePng(size);
  fs.writeFileSync(`/icons/icon-${size}.png`, png);
  fs.writeFileSync(`/public/icons/icon-${size}.png`, png);
  console.log(`Generated icon-${size}.png in /icons and /public/icons`);
});
