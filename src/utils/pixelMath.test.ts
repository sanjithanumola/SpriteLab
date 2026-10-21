import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgba,
  rgbaToHex,
  colorsMatch,
  bresenhamLine,
  midpointCircle,
  filledCircle,
  rectangleOutline,
  filledRectangle,
  floodFill,
  pixelPerfectStroke,
  getSymmetricPoints,
  replaceColor,
  composeLayers,
} from './pixelMath';
import { Layer } from '../types';

test('hexToRgba and rgbaToHex conversion works properly', () => {
  assert.deepEqual(hexToRgba('#ff0000'), [255, 0, 0, 255]);
  assert.deepEqual(hexToRgba('#00ff00', 0.5), [0, 255, 0, 128]);
  assert.equal(rgbaToHex(255, 0, 128), '#FF0080');
});

test('colorsMatch handles exact and tolerance matching', () => {
  assert.equal(colorsMatch([10, 20, 30, 255], [10, 20, 30, 255]), true);
  assert.equal(colorsMatch([0, 0, 0, 0], [255, 255, 255, 0]), true); // both transparent
  assert.equal(colorsMatch([10, 20, 30, 255], [12, 22, 28, 255], 3), true);
  assert.equal(colorsMatch([10, 20, 30, 255], [20, 20, 30, 255], 3), false);
});

test('bresenhamLine connects endpoints continuously', () => {
  const line = bresenhamLine(0, 0, 3, 3);
  assert.equal(line.length, 4);
  assert.deepEqual(line[0], { x: 0, y: 0 });
  assert.deepEqual(line[3], { x: 3, y: 3 });

  const horiz = bresenhamLine(2, 5, 6, 5);
  assert.equal(horiz.length, 5);
});

test('midpointCircle produces symmetric boundary points', () => {
  const circle = midpointCircle(10, 10, 3);
  assert.ok(circle.length > 8);
  // Verify all points are roughly distance 3 from center
  for (const pt of circle) {
    const dist = Math.sqrt((pt.x - 10) ** 2 + (pt.y - 10) ** 2);
    assert.ok(dist >= 2.5 && dist <= 3.5);
  }
});

test('filledRectangle covers bounds completely', () => {
  const rect = filledRectangle(2, 2, 4, 3);
  // width = 3, height = 2 -> 6 points
  assert.equal(rect.length, 6);
});

test('floodFill fills connected region and stops at boundaries', () => {
  const width = 4;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4); // all 0 (transparent)

  // Put a boundary at x=2
  for (let y = 0; y < height; y++) {
    const idx = (y * width + 2) * 4;
    data[idx] = 255;
    data[idx + 3] = 255; // Red barrier
  }

  // Fill left area (x=0, y=0) with blue
  const filled = floodFill(data, width, height, 0, 0, [0, 0, 255, 255]);

  // Check (0, 0) is blue
  const p0 = 0;
  assert.equal(filled[p0], 0);
  assert.equal(filled[p0 + 2], 255);

  // Check barrier (2, 0) is still red
  const pBarrier = (0 * width + 2) * 4;
  assert.equal(filled[pBarrier], 255);
  assert.equal(filled[pBarrier + 2], 0);

  // Check right area (3, 0) is untouched transparent
  const pRight = (0 * width + 3) * 4;
  assert.equal(filled[pRight + 3], 0);
});

test('pixelPerfectStroke eliminates redundant corner pixels', () => {
  // Stroke moving down then right: (0,0) -> (0,1) -> (1,1) -> (1,2)
  const input = [
    { x: 0, y: 0 },
    { x: 0, y: 1 }, // corner pixel
    { x: 1, y: 1 },
    { x: 1, y: 2 },
  ];
  const smoothed = pixelPerfectStroke(input);
  // Should have removed the redundant corner
  assert.ok(smoothed.length < input.length);
});

test('getSymmetricPoints generates proper mirror points', () => {
  const width = 16;
  const height = 16;
  const hPoints = getSymmetricPoints(2, 4, width, height, 'horizontal');
  assert.equal(hPoints.length, 2);
  assert.deepEqual(hPoints[1], { x: 13, y: 4 });

  const bothPoints = getSymmetricPoints(2, 4, width, height, 'both');
  assert.equal(bothPoints.length, 4);
});

test('composeLayers merges foreground and background properly', () => {
  const width = 2;
  const height = 2;
  const bgData = new Uint8ClampedArray(16);
  // Fill bg with solid red
  for (let i = 0; i < 4; i++) {
    bgData[i * 4] = 255;
    bgData[i * 4 + 3] = 255;
  }

  const fgData = new Uint8ClampedArray(16);
  // Put semi-transparent blue on pixel 0 (50% alpha)
  fgData[2] = 255;
  fgData[3] = 128;

  const layers: Layer[] = [
    { id: '1', name: 'Background', visible: true, opacity: 1, locked: false, data: bgData },
    { id: '2', name: 'Foreground', visible: true, opacity: 1, locked: false, data: fgData },
  ];

  const composed = composeLayers(layers, width, height);
  // Pixel 0 should be blend of red and blue
  assert.ok(composed[0] > 0);
  assert.ok(composed[2] > 0);
  assert.equal(composed[3], 255);
});
