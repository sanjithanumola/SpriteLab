/**
 * Pure TypeScript GIF89a Encoder
 * Supports multi-frame animation, frame delays, transparency, and standard LZW compression.
 */

export interface GifFrameInput {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
  delayMs: number; // Duration in milliseconds
}

export interface GifOptions {
  width: number;
  height: number;
  loop?: number; // 0 = infinite loop
  transparentBg?: boolean;
}

class ByteArray {
  private buffer: Uint8Array;
  private length = 0;

  constructor(initialCapacity = 65536) {
    this.buffer = new Uint8Array(initialCapacity);
  }

  private ensureCapacity(needed: number) {
    if (this.length + needed > this.buffer.length) {
      let newCap = Math.max(this.buffer.length * 2, this.length + needed);
      const newBuf = new Uint8Array(newCap);
      newBuf.set(this.buffer);
      this.buffer = newBuf;
    }
  }

  writeByte(val: number) {
    this.ensureCapacity(1);
    this.buffer[this.length++] = val & 0xff;
  }

  writeBytes(bytes: number[] | Uint8Array) {
    this.ensureCapacity(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer[this.length++] = bytes[i] & 0xff;
    }
  }

  writeShortLE(val: number) {
    this.writeByte(val & 0xff);
    this.writeByte((val >> 8) & 0xff);
  }

  writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.writeByte(str.charCodeAt(i));
    }
  }

  getBytes(): Uint8Array {
    return this.buffer.subarray(0, this.length);
  }
}

/**
 * LZW Compression for GIF
 */
function lzwEncode(minCodeSize: number, indexedPixels: Uint8Array, out: ByteArray) {
  out.writeByte(minCodeSize);

  const clearCode = 1 << minCodeSize;
  const eofCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = eofCode + 1;
  const maxCode = 1 << 12; // 4096

  let curAccum = 0;
  let curBits = 0;

  // Sub-block accumulator
  const subBlock = new Uint8Array(256);
  let subBlockLen = 0;

  const flushSubBlock = () => {
    if (subBlockLen > 0) {
      out.writeByte(subBlockLen);
      for (let i = 0; i < subBlockLen; i++) {
        out.writeByte(subBlock[i]);
      }
      subBlockLen = 0;
    }
  };

  const writeBits = (code: number) => {
    curAccum |= code << curBits;
    curBits += codeSize;

    while (curBits >= 8) {
      subBlock[subBlockLen++] = curAccum & 0xff;
      curAccum >>= 8;
      curBits -= 8;

      if (subBlockLen === 254) {
        flushSubBlock();
      }
    }
  };

  // Trie/Map for prefix dictionary: key: (prefix << 8) | pixel
  let table = new Map<number, number>();

  const resetTable = () => {
    table.clear();
    codeSize = minCodeSize + 1;
    nextCode = eofCode + 1;
  };

  writeBits(clearCode);

  let prefix = indexedPixels.length > 0 ? indexedPixels[0] : -1;

  for (let i = 1; i < indexedPixels.length; i++) {
    const k = indexedPixels[i];
    const key = (prefix << 8) | k;

    if (table.has(key)) {
      prefix = table.get(key)!;
    } else {
      writeBits(prefix);

      if (nextCode < maxCode) {
        table.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        // Table full, emit clear
        writeBits(clearCode);
        resetTable();
      }

      prefix = k;
    }
  }

  if (prefix !== -1) {
    writeBits(prefix);
  }

  writeBits(eofCode);

  // Flush remaining bits
  if (curBits > 0) {
    subBlock[subBlockLen++] = curAccum & 0xff;
  }
  flushSubBlock();

  // Block terminator
  out.writeByte(0x00);
}

/**
 * Quantize RGBA frame to 256 colors + transparency
 */
function quantizeFrame(
  frameData: Uint8ClampedArray,
  transparentBg = true
): { palette: number[][]; indexedPixels: Uint8Array; transparentIndex: number } {
  const pixelCount = frameData.length / 4;
  const palette: number[][] = [];
  const colorMap = new Map<string, number>();
  const indexedPixels = new Uint8Array(pixelCount);

  let transparentIndex = -1;

  if (transparentBg) {
    // Reserve index 0 for transparent
    transparentIndex = 0;
    palette.push([0, 0, 0]); // black placeholder in palette
    colorMap.set('transparent', 0);
  }

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = frameData[idx];
    const g = frameData[idx + 1];
    const b = frameData[idx + 2];
    const a = frameData[idx + 3];

    if (transparentBg && a < 128) {
      indexedPixels[i] = transparentIndex;
      continue;
    }

    const key = `${r},${g},${b}`;
    let colorIdx = colorMap.get(key);

    if (colorIdx === undefined) {
      if (palette.length < 256) {
        colorIdx = palette.length;
        palette.push([r, g, b]);
        colorMap.set(key, colorIdx);
      } else {
        // Find nearest color in palette
        let bestDist = Infinity;
        let bestIdx = 0;
        const start = transparentIndex === 0 ? 1 : 0;
        for (let p = start; p < palette.length; p++) {
          const pr = palette[p][0];
          const pg = palette[p][1];
          const pb = palette[p][2];
          const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
          }
        }
        colorIdx = bestIdx;
      }
    }

    indexedPixels[i] = colorIdx;
  }

  // Pad palette to power of 2 (min 4, max 256)
  let pLen = palette.length;
  let targetSize = 2;
  while (targetSize < pLen && targetSize < 256) {
    targetSize <<= 1;
  }
  if (targetSize < 4) targetSize = 4;

  while (palette.length < targetSize) {
    palette.push([0, 0, 0]);
  }

  return { palette, indexedPixels, transparentIndex };
}

/**
 * Creates an animated GIF Uint8Array from multiple frames
 */
export function encodeGif(frames: GifFrameInput[], options: GifOptions): Uint8Array {
  if (frames.length === 0) {
    throw new Error('At least one frame is required for GIF encoding');
  }

  const out = new ByteArray();
  const width = options.width;
  const height = options.height;
  const loopCount = options.loop !== undefined ? options.loop : 0;
  const transparentBg = options.transparentBg !== false;

  // 1. Header: GIF89a
  out.writeString('GIF89a');

  // 2. Logical Screen Descriptor
  out.writeShortLE(width);
  out.writeShortLE(height);
  // Packed: No Global Color Table here, we use Local Color Table per frame for high fidelity
  out.writeByte(0x70); // color resolution 8, no GCT
  out.writeByte(0x00); // background color index
  out.writeByte(0x00); // pixel aspect ratio

  // 3. Netscape 2.0 Application Extension (for looping)
  out.writeByte(0x21); // Extension Introducer
  out.writeByte(0xff); // Application Extension Label
  out.writeByte(0x0b); // Block Size (11 bytes)
  out.writeString('NETSCAPE2.0');
  out.writeByte(0x03); // Sub-block Size (3 bytes)
  out.writeByte(0x01); // Sub-block ID
  out.writeShortLE(loopCount); // Loop count (0 = infinite)
  out.writeByte(0x00); // Block Terminator

  // 4. Frames
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const { palette, indexedPixels, transparentIndex } = quantizeFrame(
      frame.data,
      transparentBg
    );

    // Graphic Control Extension
    out.writeByte(0x21); // Extension Introducer
    out.writeByte(0xf9); // Graphic Control Label
    out.writeByte(0x04); // Block Size

    // Disposal method: 2 (restore to background color), transparent flag
    const hasTrans = transparentIndex !== -1;
    const disposal = 2; // Restore to background
    const packedGCE = (disposal << 2) | (hasTrans ? 1 : 0);
    out.writeByte(packedGCE);

    // Delay time in centiseconds (1/100 sec)
    const delayCenti = Math.max(2, Math.round(frame.delayMs / 10));
    out.writeShortLE(delayCenti);

    // Transparent color index
    out.writeByte(hasTrans ? transparentIndex : 0);
    out.writeByte(0x00); // Block Terminator

    // Image Descriptor
    out.writeByte(0x2c); // Image Separator
    out.writeShortLE(0); // Left
    out.writeShortLE(0); // Top
    out.writeShortLE(width);
    out.writeShortLE(height);

    // Packed: Local Color Table flag = 1, interlace = 0, sort = 0, size of table = log2(palette.length) - 1
    const tableSizeExponent = Math.log2(palette.length) - 1;
    const packedID = 0x80 | (tableSizeExponent & 0x07);
    out.writeByte(packedID);

    // Local Color Table
    for (const color of palette) {
      out.writeByte(color[0]);
      out.writeByte(color[1]);
      out.writeByte(color[2]);
    }

    // LZW Image Data
    const minCodeSize = Math.max(2, Math.ceil(Math.log2(palette.length)));
    lzwEncode(minCodeSize, indexedPixels, out);
  }

  // 5. Trailer
  out.writeByte(0x3b);

  return out.getBytes();
}
