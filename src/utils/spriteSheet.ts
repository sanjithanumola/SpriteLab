import { Project, SpriteSheetConfig } from '../types';
import { composeLayers } from './pixelMath';

export interface SheetMetadata {
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
  };
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
      rotated: boolean;
      trimmed: boolean;
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
      duration: number;
    }
  >;
}

export function renderSpriteSheet(
  project: Project,
  config: SpriteSheetConfig
): { canvas: HTMLCanvasElement; metadata: SheetMetadata } {
  const { width: fw, height: fh, frames } = project;
  const { columns, rows, spacing, padding, transparentBg, bgColor } = config;

  const totalWidth = padding * 2 + columns * fw + (columns - 1) * spacing;
  const totalHeight = padding * 2 + rows * fh + (rows - 1) * spacing;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, totalWidth);
  canvas.height = Math.max(1, totalHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context for sprite sheet');

  // Background
  if (!transparentBg) {
    ctx.fillStyle = bgColor || '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const metaFrames: SheetMetadata['frames'] = {};

  // Render each frame at calculated grid position
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const col = i % columns;
    const row = Math.floor(i / columns);

    if (row >= rows) break; // Exceeds grid capacity

    const destX = padding + col * (fw + spacing);
    const destY = padding + row * (fh + spacing);

    // Composite layers
    const compositeData = composeLayers(frame.layers, fw, fh);
    const frameImageData = new ImageData(
      new Uint8ClampedArray(compositeData),
      fw,
      fh
    );

    // Put image data via temp canvas to avoid pixel offset blurring
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = fw;
    tempCanvas.height = fh;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(frameImageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, destX, destY);

    const frameKey = `${project.name || 'sprite'}_${i}.png`;
    metaFrames[frameKey] = {
      frame: { x: destX, y: destY, w: fw, h: fh },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
      sourceSize: { w: fw, h: fh },
      duration: frame.duration || 100,
    };
  }

  const metadata: SheetMetadata = {
    meta: {
      app: 'SpriteLab Studio',
      version: '1.0',
      image: `${project.name || 'spritesheet'}.png`,
      format: 'RGBA8888',
      size: { w: canvas.width, h: canvas.height },
      scale: '1',
    },
    frames: metaFrames,
  };

  return { canvas, metadata };
}
