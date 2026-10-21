import { Project, Frame, Layer } from '../types';
import { PALETTE_PRESETS } from './palettes';
import { hexToRgba } from './pixelMath';

export function createBlankProject(
  width = 32,
  height = 32,
  name = 'Untitled Sprite'
): Project {
  const layerData = new Uint8ClampedArray(width * height * 4);
  const layer: Layer = {
    id: 'layer-1',
    name: 'Layer 1',
    visible: true,
    opacity: 1,
    locked: false,
    data: layerData,
  };

  const frame: Frame = {
    id: 'frame-1',
    duration: 100,
    layers: [layer],
  };

  return {
    id: `project-${Date.now()}`,
    name,
    width,
    height,
    fps: 10,
    palette: [...PALETTE_PRESETS[0].colors],
    frames: [frame],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Creates an animated 6-frame spinning Gold Coin (16x16)
 */
export function createCoinAnimationProject(): Project {
  const width = 16;
  const height = 16;
  const frames: Frame[] = [];

  // Coin width at each frame of 360 degree spin
  // frame 0: full ellipse (w=10)
  // frame 1: 3/4 ellipse (w=7)
  // frame 2: thin sliver (w=3)
  // frame 3: edge-on line (w=2)
  // frame 4: reverse sliver (w=3)
  // frame 5: reverse 3/4 (w=7)
  const widths = [10, 7, 4, 2, 4, 7];
  const goldDark = hexToRgba('#AB5236');
  const goldBase = hexToRgba('#FFA300');
  const goldLight = hexToRgba('#FFEC27');
  const shine = hexToRgba('#FFF1E8');

  for (let f = 0; f < 6; f++) {
    const data = new Uint8ClampedArray(width * height * 4);
    const wHalf = Math.max(1, Math.round(widths[f] / 2));
    const cx = 8;
    const cy = 8;
    const ry = 6;

    // Draw coin body
    for (let y = -ry; y <= ry; y++) {
      const py = cy + y;
      const xSpan = Math.round(wHalf * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      for (let x = -xSpan; x <= xSpan; x++) {
        const px = cx + x;
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          // Shading: border dark, top-left highlight, center base
          const isEdge = x === -xSpan || x === xSpan || y === -ry || y === ry;
          const isTopLeft = x < 0 && y <= 0;
          let col = goldBase;

          if (isEdge) {
            col = goldDark;
          } else if (isTopLeft && f % 3 !== 2) {
            col = goldLight;
          }

          data[idx] = col[0];
          data[idx + 1] = col[1];
          data[idx + 2] = col[2];
          data[idx + 3] = 255;
        }
      }
    }

    // Sparkle glint on frame 0 and 3
    if (f === 0) {
      const glintIdx = (5 * width + 6) * 4;
      data[glintIdx] = shine[0];
      data[glintIdx + 1] = shine[1];
      data[glintIdx + 2] = shine[2];
      data[glintIdx + 3] = 255;
    }

    // Shadow on separate layer
    const shadowData = new Uint8ClampedArray(width * height * 4);
    const shadowCol = hexToRgba('#1D2B53', 0.5);
    for (let x = cx - wHalf; x <= cx + wHalf; x++) {
      if (x >= 0 && x < width) {
        const sIdx = (14 * width + x) * 4;
        shadowData[sIdx] = shadowCol[0];
        shadowData[sIdx + 1] = shadowCol[1];
        shadowData[sIdx + 2] = shadowCol[2];
        shadowData[sIdx + 3] = shadowCol[3];
      }
    }

    frames.push({
      id: `frame-${f + 1}`,
      duration: 100,
      layers: [
        {
          id: `shadow-${f + 1}`,
          name: 'Shadow',
          visible: true,
          opacity: 0.6,
          locked: false,
          data: shadowData,
        },
        {
          id: `coin-${f + 1}`,
          name: 'Coin Body',
          visible: true,
          opacity: 1,
          locked: false,
          data: data,
        },
      ],
    });
  }

  return {
    id: `project-${Date.now()}`,
    name: 'Spinning Gold Coin',
    width: 16,
    height: 16,
    fps: 10,
    palette: [...PALETTE_PRESETS[0].colors],
    frames,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Creates an animated 4-frame Knight Hero character (32x32)
 */
export function createHeroCharacterProject(): Project {
  const width = 32;
  const height = 32;
  const frames: Frame[] = [];

  const armorCol = hexToRgba('#C2C3C7');
  const armorDark = hexToRgba('#5F574F');
  const armorLight = hexToRgba('#FFF1E8');
  const visorCol = hexToRgba('#00E436');
  const capeCol = hexToRgba('#FF004D');
  const swordCol = hexToRgba('#29ADFF');
  const goldTrim = hexToRgba('#FFA300');
  const shadowCol = hexToRgba('#1D2B53', 0.4);

  // 4 idle bounce frames (offsets: 0, 1, 0, -1)
  const yOffsets = [0, 1, 0, 0];

  for (let f = 0; f < 4; f++) {
    const yOff = yOffsets[f];
    const charData = new Uint8ClampedArray(width * height * 4);
    const shadowData = new Uint8ClampedArray(width * height * 4);

    const setPixel = (target: Uint8ClampedArray, x: number, y: number, col: [number, number, number, number]) => {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        target[idx] = col[0];
        target[idx + 1] = col[1];
        target[idx + 2] = col[2];
        target[idx + 3] = col[3];
      }
    };

    // Shadow under character
    for (let x = 11; x <= 21; x++) {
      for (let y = 28; y <= 30; y++) {
        if ((x === 11 || x === 21) && (y === 28 || y === 30)) continue;
        setPixel(shadowData, x, y, shadowCol);
      }
    }

    // Helmet & Head (center around x=16, y=10 + yOff)
    const hy = 8 + yOff;
    for (let y = 0; y <= 7; y++) {
      for (let x = -4; x <= 4; x++) {
        const px = 16 + x;
        const py = hy + y;
        let c = armorCol;
        if (x === -4 || x === 4 || y === 0) c = armorDark;
        if (x === -2 && y === 1) c = armorLight;
        setPixel(charData, px, py, c);
      }
    }
    // Visor glowing slit
    for (let x = -3; x <= 3; x++) {
      setPixel(charData, 16 + x, hy + 4, visorCol);
    }
    // Helmet plume/crest
    for (let y = -3; y <= 0; y++) {
      setPixel(charData, 16, hy + y, capeCol);
      setPixel(charData, 17, hy + y, capeCol);
    }

    // Torso & Armor (hy+8 to hy+13)
    for (let y = 8; y <= 13; y++) {
      for (let x = -5; x <= 5; x++) {
        const px = 16 + x;
        const py = hy + y;
        let c = armorCol;
        if (x === -5 || x === 5) c = capeCol; // Cape shoulders
        if (y === 8) c = goldTrim; // Golden gorget
        setPixel(charData, px, py, c);
      }
    }

    // Belt
    for (let x = -4; x <= 4; x++) {
      setPixel(charData, 16 + x, hy + 14, goldTrim);
    }

    // Legs / Boots
    for (let y = 15; y <= 19; y++) {
      // Left leg
      setPixel(charData, 14, hy + y, armorDark);
      setPixel(charData, 15, hy + y, armorCol);
      // Right leg
      setPixel(charData, 17, hy + y, armorCol);
      setPixel(charData, 18, hy + y, armorDark);
    }

    // Sword in right hand (animated slight sway on f=1, f=3)
    const swordX = 23;
    const swordY = hy + 6 + (f % 2 === 1 ? 1 : 0);
    // Hilt
    setPixel(charData, swordX, swordY + 6, goldTrim);
    setPixel(charData, swordX - 1, swordY + 5, goldTrim);
    setPixel(charData, swordX + 1, swordY + 5, goldTrim);
    // Blade
    for (let b = 0; b <= 5; b++) {
      setPixel(charData, swordX, swordY - b + 4, swordCol);
      setPixel(charData, swordX + 1, swordY - b + 4, armorLight);
    }

    // Shield in left hand
    const shieldX = 9;
    for (let sy = 7; sy <= 13; sy++) {
      for (let sx = -2; sx <= 2; sx++) {
        const sc = sx === 0 ? goldTrim : capeCol;
        setPixel(charData, shieldX + sx, hy + sy, sc);
      }
    }

    frames.push({
      id: `hero-f-${f + 1}`,
      duration: 120,
      layers: [
        {
          id: `shadow-layer-${f + 1}`,
          name: 'Ground Shadow',
          visible: true,
          opacity: 0.5,
          locked: false,
          data: shadowData,
        },
        {
          id: `hero-layer-${f + 1}`,
          name: 'Knight Character',
          visible: true,
          opacity: 1,
          locked: false,
          data: charData,
        },
      ],
    });
  }

  return {
    id: `project-${Date.now()}`,
    name: 'Brave Knight (Idle)',
    width: 32,
    height: 32,
    fps: 8,
    palette: [...PALETTE_PRESETS[0].colors],
    frames,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
