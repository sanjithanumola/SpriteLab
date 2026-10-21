import { RGBA, SymmetryMode, Layer } from '../types';

/**
 * Converts a hex string (#RGB, #RRGGBB, #RRGGBBAA) to RGBA tuple
 */
export function hexToRgba(hex: string, alphaOverride?: number): RGBA {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  let r = 0, g = 0, b = 0, a = 255;
  if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) || 0;
    g = parseInt(clean.substring(2, 4), 16) || 0;
    b = parseInt(clean.substring(4, 6), 16) || 0;
  } else if (clean.length === 8) {
    r = parseInt(clean.substring(0, 2), 16) || 0;
    g = parseInt(clean.substring(2, 4), 16) || 0;
    b = parseInt(clean.substring(4, 6), 16) || 0;
    a = parseInt(clean.substring(6, 8), 16) || 255;
  }
  if (alphaOverride !== undefined) {
    a = Math.round(Math.max(0, Math.min(1, alphaOverride)) * 255);
  }
  return [r, g, b, a];
}

/**
 * Converts RGBA numbers to #RRGGBB
 */
export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Check if two colors match within tolerance
 */
export function colorsMatch(c1: RGBA, c2: RGBA, tolerance = 0): boolean {
  if (c1[3] === 0 && c2[3] === 0) return true; // both transparent
  if (c1[3] === 0 || c2[3] === 0) return false;
  return (
    Math.abs(c1[0] - c2[0]) <= tolerance &&
    Math.abs(c1[1] - c2[1]) <= tolerance &&
    Math.abs(c1[2] - c2[2]) <= tolerance &&
    Math.abs(c1[3] - c2[3]) <= tolerance
  );
}

/**
 * Bresenham's Line Algorithm
 */
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }

  return points;
}

/**
 * Midpoint Circle Outline
 */
export function midpointCircle(cx: number, cy: number, radius: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const set = new Set<string>();
  const addPoint = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (!set.has(key)) {
      set.add(key);
      points.push({ x, y });
    }
  };

  cx = Math.round(cx);
  cy = Math.round(cy);
  radius = Math.round(radius);

  if (radius <= 0) {
    return [{ x: cx, y: cy }];
  }

  let x = radius;
  let y = 0;
  let err = 1 - x;

  while (x >= y) {
    addPoint(cx + x, cy + y);
    addPoint(cx + y, cy + x);
    addPoint(cx - y, cy + x);
    addPoint(cx - x, cy + y);
    addPoint(cx - x, cy - y);
    addPoint(cx - y, cy - x);
    addPoint(cx + y, cy - x);
    addPoint(cx + x, cy - y);

    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }

  return points;
}

/**
 * Filled Circle
 */
export function filledCircle(cx: number, cy: number, radius: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  cx = Math.round(cx);
  cy = Math.round(cy);
  radius = Math.round(radius);

  if (radius <= 0) {
    return [{ x: cx, y: cy }];
  }

  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        points.push({ x: cx + dx, y: cy + dy });
      }
    }
  }
  return points;
}

/**
 * Rectangle Outline
 */
export function rectangleOutline(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const points: Array<{ x: number; y: number }> = [];
  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY });
    if (minY !== maxY) {
      points.push({ x, y: maxY });
    }
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y });
    if (minX !== maxX) {
      points.push({ x: maxX, y });
    }
  }
  return points;
}

/**
 * Filled Rectangle
 */
export function filledRectangle(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);

  const points: Array<{ x: number; y: number }> = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Breadth-First Flood Fill
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillColor: RGBA
): Uint8ClampedArray {
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return data;
  }

  const result = new Uint8ClampedArray(data);
  const targetIdx = (startY * width + startX) * 4;
  const targetColor: RGBA = [
    result[targetIdx],
    result[targetIdx + 1],
    result[targetIdx + 2],
    result[targetIdx + 3],
  ];

  // Already the same color
  if (colorsMatch(targetColor, fillColor)) {
    return result;
  }

  const visited = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [[startX, startY]];
  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const idx = (y * width + x) * 4;

    result[idx] = fillColor[0];
    result[idx + 1] = fillColor[1];
    result[idx + 2] = fillColor[2];
    result[idx + 3] = fillColor[3];

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        if (!visited[nIndex]) {
          const nPixelIdx = nIndex * 4;
          const nColor: RGBA = [
            result[nPixelIdx],
            result[nPixelIdx + 1],
            result[nPixelIdx + 2],
            result[nPixelIdx + 3],
          ];
          if (colorsMatch(nColor, targetColor)) {
            visited[nIndex] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Pixel-Perfect stroke filter
 * Removes 'L' corners (3-pixel blocks) in freehand strokes so single-width lines remain crisp
 */
export function pixelPerfectStroke(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < points.length; i++) {
    if (i > 0 && i < points.length - 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // Check if curr is an unwanted corner in an L-shape
      const sameCol = prev.x === curr.x && curr.x === next.x;
      const sameRow = prev.y === curr.y && curr.y === next.y;

      if (!sameCol && !sameRow) {
        // If prev and next share a direct diagonal or Manhattan distance 1
        if (Math.abs(prev.x - next.x) === 1 && Math.abs(prev.y - next.y) === 1) {
          // If curr connects them as an unnecessary corner
          if (
            (curr.x === prev.x && curr.y === next.y) ||
            (curr.x === next.x && curr.y === prev.y)
          ) {
            continue; // Skip the corner point!
          }
        }
      }
    }
    result.push(points[i]);
  }
  return result;
}

/**
 * Generate symmetric mirrored points
 */
export function getSymmetricPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  mode: SymmetryMode
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [{ x, y }];
  if (mode === 'none') return points;

  const mirrorX = width - 1 - x;
  const mirrorY = height - 1 - y;

  if (mode === 'horizontal' || mode === 'both') {
    if (mirrorX !== x) {
      points.push({ x: mirrorX, y });
    }
  }

  if (mode === 'vertical' || mode === 'both') {
    if (mirrorY !== y) {
      points.push({ x, y: mirrorY });
    }
  }

  if (mode === 'both') {
    if (mirrorX !== x && mirrorY !== y) {
      points.push({ x: mirrorX, y: mirrorY });
    }
  }

  return points;
}

/**
 * Replaces a specific color across pixel buffer
 */
export function replaceColor(
  data: Uint8ClampedArray,
  targetColor: RGBA,
  newColor: RGBA,
  tolerance = 0
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data);
  const total = data.length / 4;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const current: RGBA = [result[idx], result[idx + 1], result[idx + 2], result[idx + 3]];
    if (colorsMatch(current, targetColor, tolerance)) {
      result[idx] = newColor[0];
      result[idx + 1] = newColor[1];
      result[idx + 2] = newColor[2];
      result[idx + 3] = newColor[3];
    }
  }
  return result;
}

/**
 * Lighten (+amount) or Darken (-amount) a pixel color
 */
export function adjustPixelShade(color: RGBA, amount: number): RGBA {
  if (color[3] === 0) return color;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    clamp(color[0] + amount),
    clamp(color[1] + amount),
    clamp(color[2] + amount),
    color[3],
  ];
}

/**
 * Flatten / composite multiple layers onto a single Uint8ClampedArray
 */
export function composeLayers(layers: Layer[], width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(width * height * 4);
  const len = width * height;

  for (const layer of layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const lData = layer.data;
    const opacity = layer.opacity;

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const srcA = (lData[idx + 3] / 255) * opacity;
      if (srcA <= 0) continue;

      const dstA = result[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);

      if (outA > 0) {
        result[idx] = Math.round(
          (lData[idx] * srcA + result[idx] * dstA * (1 - srcA)) / outA
        );
        result[idx + 1] = Math.round(
          (lData[idx + 1] * srcA + result[idx + 1] * dstA * (1 - srcA)) / outA
        );
        result[idx + 2] = Math.round(
          (lData[idx + 2] * srcA + result[idx + 2] * dstA * (1 - srcA)) / outA
        );
        result[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  return result;
}
