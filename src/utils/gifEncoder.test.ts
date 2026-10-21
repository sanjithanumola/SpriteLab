import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif } from './gifEncoder';

test('encodeGif produces valid GIF89a binary with trailer', () => {
  const width = 4;
  const height = 4;
  const frame1 = new Uint8ClampedArray(width * height * 4);
  // Red square
  for (let i = 0; i < width * height; i++) {
    frame1[i * 4] = 255;
    frame1[i * 4 + 3] = 255;
  }

  const frame2 = new Uint8ClampedArray(width * height * 4);
  // Blue square with transparent pixel at 0
  for (let i = 1; i < width * height; i++) {
    frame2[i * 4 + 2] = 255;
    frame2[i * 4 + 3] = 255;
  }

  const gifBytes = encodeGif(
    [
      { data: frame1, width, height, delayMs: 100 },
      { data: frame2, width, height, delayMs: 150 },
    ],
    { width, height, loop: 0, transparentBg: true }
  );

  // Check signature
  const header = String.fromCharCode(...gifBytes.slice(0, 6));
  assert.equal(header, 'GIF89a');

  // Check dimensions in Logical Screen Descriptor (bytes 6-9)
  const w = gifBytes[6] | (gifBytes[7] << 8);
  const h = gifBytes[8] | (gifBytes[9] << 8);
  assert.equal(w, width);
  assert.equal(h, height);

  // Check trailer byte 0x3B (';')
  assert.equal(gifBytes[gifBytes.length - 1], 0x3b);

  // Check that output size is reasonable
  assert.ok(gifBytes.length > 50);
});
