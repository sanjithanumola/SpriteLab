import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ToolType,
  SymmetryMode,
  Layer,
  Frame,
  SelectionState,
  ReferenceImage,
  RGBA,
} from '../types';
import {
  hexToRgba,
  rgbaToHex,
  bresenhamLine,
  rectangleOutline,
  filledRectangle,
  midpointCircle,
  filledCircle,
  floodFill,
  pixelPerfectStroke,
  getSymmetricPoints,
  replaceColor,
  adjustPixelShade,
  composeLayers,
} from '../utils/pixelMath';

interface CanvasAreaProps {
  width: number;
  height: number;
  activeLayer: Layer;
  allLayers: Layer[];
  onUpdateLayerData: (layerId: string, newData: Uint8ClampedArray) => void;
  activeTool: ToolType;
  brushSize: number;
  primaryColor: string;
  secondaryColor: string;
  onSelectPrimaryColor: (color: string) => void;
  pixelPerfect: boolean;
  symmetryMode: SymmetryMode;
  shadingMode: 'lighten' | 'darken';
  selection: SelectionState | null;
  onSetSelection: (sel: SelectionState | null) => void;
  showGrid: boolean;
  zoom: number;
  onSetZoom: (zoom: number) => void;
  onionSkinEnabled: boolean;
  previousFrame: Frame | null;
  nextFrame: Frame | null;
  referenceImage: ReferenceImage | null;
  onAddRecentColor: (color: string) => void;
  onRecordHistory: () => void;
}

export const CanvasArea: React.FC<CanvasAreaProps> = ({
  width,
  height,
  activeLayer,
  allLayers,
  onUpdateLayerData,
  activeTool,
  brushSize,
  primaryColor,
  secondaryColor,
  onSelectPrimaryColor,
  pixelPerfect,
  symmetryMode,
  shadingMode,
  selection,
  onSetSelection,
  showGrid,
  zoom,
  onSetZoom,
  onionSkinEnabled,
  previousFrame,
  nextFrame,
  referenceImage,
  onAddRecentColor,
  onRecordHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pan offsets (in screen pixels)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover coordinate state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Active drawing gesture state
  const isDrawingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);
  const startPixelRef = useRef<{ x: number; y: number } | null>(null);
  const strokeHistoryRef = useRef<Array<{ x: number; y: number }>>([]);
  const draftDataRef = useRef<Uint8ClampedArray | null>(null);
  const drawButtonRef = useRef<number>(0); // 0 = left (primary), 2 = right (secondary)

  // Floating selection moving state
  const isMovingSelectionRef = useRef(false);
  const selectionStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Center canvas on mount, dimension change, or container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const centerCanvas = () => {
      const rect = container.getBoundingClientRect();
      const canvasDisplayW = width * zoom;
      const canvasDisplayH = height * zoom;
      setPan({
        x: Math.round((rect.width - canvasDisplayW) / 2),
        y: Math.round((rect.height - canvasDisplayH) / 2),
      });
    };

    centerCanvas();

    const observer = new ResizeObserver(() => {
      centerCanvas();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [width, height, zoom]);

  // Convert screen clientX/clientY to pixel coordinates (0 to width-1, 0 to height-1)
  const screenToPixel = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!mainCanvasRef.current) return null;
      const rect = mainCanvasRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
      }

      const pixelX = Math.floor(relX / zoom);
      const pixelY = Math.floor(relY / zoom);

      if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
        return null;
      }
      return { x: pixelX, y: pixelY };
    },
    [width, height, zoom]
  );

  /**
   * Render the main canvas content (all layers + onion skin)
   */
  const renderMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Onion Skin: Previous Frame (Red/Warm tint)
    if (onionSkinEnabled && previousFrame) {
      const prevData = composeLayers(previousFrame.layers, width, height);
      const prevImg = new ImageData(new Uint8ClampedArray(prevData), width, height);
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      temp.getContext('2d')!.putImageData(prevImg, 0, 0);

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(temp, 0, 0);
      // Red tint overlay
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#FF004D';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2. Main Layers composite
    // If user is actively drawing on the activeLayer, use draftDataRef if present
    const layersToComposite = allLayers.map((l) => {
      if (l.id === activeLayer.id && draftDataRef.current) {
        return { ...l, data: draftDataRef.current };
      }
      return l;
    });

    const composite = composeLayers(layersToComposite, width, height);
    const imgData = new ImageData(new Uint8ClampedArray(composite), width, height);

    // Put image data
    const tempMain = document.createElement('canvas');
    tempMain.width = width;
    tempMain.height = height;
    tempMain.getContext('2d')!.putImageData(imgData, 0, 0);
    ctx.drawImage(tempMain, 0, 0);

    // 3. Onion Skin: Next Frame (Blue/Cyan tint)
    if (onionSkinEnabled && nextFrame) {
      const nextData = composeLayers(nextFrame.layers, width, height);
      const nextImg = new ImageData(new Uint8ClampedArray(nextData), width, height);
      const tempNext = document.createElement('canvas');
      tempNext.width = width;
      tempNext.height = height;
      tempNext.getContext('2d')!.putImageData(nextImg, 0, 0);

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(tempNext, 0, 0);
      // Cyan tint overlay
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#29ADFF';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }, [allLayers, activeLayer.id, width, height, onionSkinEnabled, previousFrame, nextFrame]);

  // Re-render main canvas when layers or dimensions update
  useEffect(() => {
    renderMainCanvas();
  }, [renderMainCanvas]);

  /**
   * Render overlay (Pixel grid, selection outline, symmetry lines, cursor hover preview)
   */
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const canvasDisplayW = width * zoom;
    const canvasDisplayH = height * zoom;

    // 1. Pixel Grid lines
    if (showGrid && zoom >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) {
        const sx = Math.floor(x * zoom) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvasDisplayH);
      }
      for (let y = 0; y <= height; y++) {
        const sy = Math.floor(y * zoom) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(canvasDisplayW, sy);
      }
      ctx.stroke();
    }

    // 2. Symmetry Guide Lines
    if (symmetryMode !== 'none') {
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();

      if (symmetryMode === 'horizontal' || symmetryMode === 'both') {
        const midX = Math.floor((width / 2) * zoom) + 0.5;
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, canvasDisplayH);
      }
      if (symmetryMode === 'vertical' || symmetryMode === 'both') {
        const midY = Math.floor((height / 2) * zoom) + 0.5;
        ctx.moveTo(0, midY);
        ctx.lineTo(canvasDisplayW, midY);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Selection Marquee Box
    if (selection) {
      const sx = selection.x * zoom;
      const sy = selection.y * zoom;
      const sw = selection.width * zoom;
      const sh = selection.height * zoom;

      ctx.save();
      ctx.strokeStyle = '#2DD4BF';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(sx, sy, sw, sh);

      // Semi-transparent highlight
      ctx.fillStyle = 'rgba(45, 212, 191, 0.12)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
    }

    // 4. Hover Cursor Preview
    if (hoverCoord && !isDrawingRef.current) {
      const { x, y } = hoverCoord;
      const points = getSymmetricPoints(x, y, width, height, symmetryMode);

      ctx.save();
      for (const pt of points) {
        const hx = pt.x * zoom;
        const hy = pt.y * zoom;
        const hw = brushSize * zoom;
        const hh = brushSize * zoom;

        if (activeTool === 'eraser') {
          ctx.strokeStyle = '#FF004D';
          ctx.lineWidth = 1;
          ctx.strokeRect(hx, hy, hw, hh);
        } else if (activeTool === 'eyedropper') {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hx, hy, zoom, zoom);
        } else {
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(hx, hy, hw, hh);
        }
      }
      ctx.restore();
    }
  }, [width, height, zoom, showGrid, symmetryMode, selection, hoverCoord, brushSize, activeTool, primaryColor]);

  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  /**
   * Stamp brush pixels onto layer buffer
   */
  const stampPoints = (
    targetData: Uint8ClampedArray,
    points: Array<{ x: number; y: number }>,
    color: RGBA
  ) => {
    for (const pt of points) {
      const symPoints = getSymmetricPoints(pt.x, pt.y, width, height, symmetryMode);
      for (const sp of symPoints) {
        for (let dy = 0; dy < brushSize; dy++) {
          for (let dx = 0; dx < brushSize; dx++) {
            const px = sp.x + dx;
            const py = sp.y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              targetData[idx] = color[0];
              targetData[idx + 1] = color[1];
              targetData[idx + 2] = color[2];
              targetData[idx + 3] = color[3];
            }
          }
        }
      }
    }
  };

  /**
   * Mouse Wheel: Zoom centered at cursor
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
    const newZoom = Math.max(1, Math.min(32, Math.round(zoom * zoomFactor * 10) / 10));

    if (newZoom !== zoom) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust pan so the pixel under cursor stays stationary
      const newPanX = mouseX - ((mouseX - pan.x) / zoom) * newZoom;
      const newPanY = mouseY - ((mouseY - pan.y) / zoom) * newZoom;

      onSetZoom(newZoom);
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    }
  };

  /**
   * Pointer Down: Start drawing, moving, or panning
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    // Middle click or Space held or Pan tool active -> Pan
    if (e.button === 1 || activeTool === 'pan' || e.shiftKey && e.button === 0) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (activeLayer.locked) return;

    const pixel = screenToPixel(e.clientX, e.clientY);
    if (!pixel) return;

    drawButtonRef.current = e.button;
    const activeColorHex = e.button === 2 ? secondaryColor : primaryColor;
    const activeColorRgba =
      activeTool === 'eraser'
        ? ([0, 0, 0, 0] as RGBA)
        : hexToRgba(activeColorHex);

    if (activeTool !== 'eraser' && activeTool !== 'eyedropper') {
      onAddRecentColor(activeColorHex);
    }

    // Record history state before modifying
    onRecordHistory();

    // 1. Eyedropper Tool
    if (activeTool === 'eyedropper') {
      const composed = composeLayers(allLayers, width, height);
      const idx = (pixel.y * width + pixel.x) * 4;
      const pickedHex = rgbaToHex(composed[idx], composed[idx + 1], composed[idx + 2]);
      onSelectPrimaryColor(pickedHex);
      return;
    }

    // 2. Fill Bucket Tool
    if (activeTool === 'bucket') {
      const filled = floodFill(
        activeLayer.data,
        width,
        height,
        pixel.x,
        pixel.y,
        activeColorRgba
      );
      onUpdateLayerData(activeLayer.id, filled);
      return;
    }

    // 3. Color Replace Tool
    if (activeTool === 'colorReplace') {
      const idx = (pixel.y * width + pixel.x) * 4;
      const targetCol: RGBA = [
        activeLayer.data[idx],
        activeLayer.data[idx + 1],
        activeLayer.data[idx + 2],
        activeLayer.data[idx + 3],
      ];
      const replaced = replaceColor(activeLayer.data, targetCol, activeColorRgba);
      onUpdateLayerData(activeLayer.id, replaced);
      return;
    }

    // 4. Shading Tool
    if (activeTool === 'shading') {
      const idx = (pixel.y * width + pixel.x) * 4;
      const curCol: RGBA = [
        activeLayer.data[idx],
        activeLayer.data[idx + 1],
        activeLayer.data[idx + 2],
        activeLayer.data[idx + 3],
      ];
      const amount = shadingMode === 'lighten' ? 20 : -20;
      const shaded = adjustPixelShade(curCol, amount);
      const nextData = new Uint8ClampedArray(activeLayer.data);
      nextData[idx] = shaded[0];
      nextData[idx + 1] = shaded[1];
      nextData[idx + 2] = shaded[2];
      nextData[idx + 3] = shaded[3];
      onUpdateLayerData(activeLayer.id, nextData);
      return;
    }

    // 5. Marquee Selection
    if (activeTool === 'select') {
      isDrawingRef.current = true;
      startPixelRef.current = pixel;
      onSetSelection({
        x: pixel.x,
        y: pixel.y,
        width: 1,
        height: 1,
      });
      return;
    }

    // 6. Move Tool
    if (activeTool === 'move') {
      isDrawingRef.current = true;
      startPixelRef.current = pixel;
      lastPixelRef.current = pixel;
      draftDataRef.current = new Uint8ClampedArray(activeLayer.data);
      return;
    }

    // 7. Pencil / Eraser / Shapes
    isDrawingRef.current = true;
    startPixelRef.current = pixel;
    lastPixelRef.current = pixel;
    strokeHistoryRef.current = [pixel];
    draftDataRef.current = new Uint8ClampedArray(activeLayer.data);

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      stampPoints(draftDataRef.current, [pixel], activeColorRgba);
      renderMainCanvas();
    }
  };

  /**
   * Pointer Move: Continue drawing, dragging shape, or panning
   */
  const handlePointerMove = (e: React.PointerEvent) => {
    // Update panning if active
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    const pixel = screenToPixel(e.clientX, e.clientY);
    setHoverCoord(pixel);

    if (!isDrawingRef.current || !startPixelRef.current || !pixel) return;

    const activeColorHex = drawButtonRef.current === 2 ? secondaryColor : primaryColor;
    const activeColorRgba =
      activeTool === 'eraser'
        ? ([0, 0, 0, 0] as RGBA)
        : hexToRgba(activeColorHex);

    // 1. Marquee Selection Drag
    if (activeTool === 'select') {
      const minX = Math.min(startPixelRef.current.x, pixel.x);
      const minY = Math.min(startPixelRef.current.y, pixel.y);
      const maxX = Math.max(startPixelRef.current.x, pixel.x);
      const maxY = Math.max(startPixelRef.current.y, pixel.y);
      onSetSelection({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      });
      return;
    }

    // 2. Move Tool Drag
    if (activeTool === 'move' && lastPixelRef.current) {
      const dx = pixel.x - lastPixelRef.current.x;
      const dy = pixel.y - lastPixelRef.current.y;
      if (dx !== 0 || dy !== 0) {
        lastPixelRef.current = pixel;
        const next = new Uint8ClampedArray(width * height * 4);
        const cur = draftDataRef.current || activeLayer.data;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const destX = x + dx;
            const destY = y + dy;
            if (destX >= 0 && destX < width && destY >= 0 && destY < height) {
              const destIdx = (destY * width + destX) * 4;
              next[destIdx] = cur[srcIdx];
              next[destIdx + 1] = cur[srcIdx + 1];
              next[destIdx + 2] = cur[srcIdx + 2];
              next[destIdx + 3] = cur[srcIdx + 3];
            }
          }
        }
        draftDataRef.current = next;
        renderMainCanvas();
      }
      return;
    }

    // 3. Pencil or Eraser Continuous Freehand Drawing
    if (activeTool === 'pencil' || activeTool === 'eraser') {
      if (!draftDataRef.current) return;
      const last = lastPixelRef.current || startPixelRef.current;
      const linePoints = bresenhamLine(last.x, last.y, pixel.x, pixel.y);

      strokeHistoryRef.current.push(...linePoints);
      lastPixelRef.current = pixel;

      // Apply pixel-perfect filter if enabled
      let pointsToDraw = linePoints;
      if (pixelPerfect && strokeHistoryRef.current.length > 2) {
        pointsToDraw = pixelPerfectStroke(linePoints);
      }

      stampPoints(draftDataRef.current, pointsToDraw, activeColorRgba);
      renderMainCanvas();
      return;
    }

    // 4. Shape Tools Preview (Line, Rect, Circle)
    if (['line', 'rect', 'filledRect', 'circle', 'filledCircle'].includes(activeTool)) {
      // Revert to original layer data and stamp shape onto clean copy
      const previewData = new Uint8ClampedArray(activeLayer.data);
      let shapePoints: Array<{ x: number; y: number }> = [];

      const x0 = startPixelRef.current.x;
      const y0 = startPixelRef.current.y;
      const x1 = pixel.x;
      const y1 = pixel.y;

      if (activeTool === 'line') {
        shapePoints = bresenhamLine(x0, y0, x1, y1);
      } else if (activeTool === 'rect') {
        shapePoints = rectangleOutline(x0, y0, x1, y1);
      } else if (activeTool === 'filledRect') {
        shapePoints = filledRectangle(x0, y0, x1, y1);
      } else if (activeTool === 'circle') {
        const radius = Math.round(
          Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
        );
        shapePoints = midpointCircle(x0, y0, radius);
      } else if (activeTool === 'filledCircle') {
        const radius = Math.round(
          Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
        );
        shapePoints = filledCircle(x0, y0, radius);
      }

      stampPoints(previewData, shapePoints, activeColorRgba);
      draftDataRef.current = previewData;
      renderMainCanvas();
    }
  };

  /**
   * Pointer Up: Commit stroke or shape to active layer
   */
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    startPixelRef.current = null;
    lastPixelRef.current = null;
    strokeHistoryRef.current = [];

    if (draftDataRef.current && activeTool !== 'select') {
      onUpdateLayerData(activeLayer.id, draftDataRef.current);
      draftDataRef.current = null;
    }
  };

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        handlePointerUp();
        setHoverCoord(null);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="flex-1 h-full bg-[#0D1016] relative overflow-hidden select-none cursor-crosshair touch-none"
    >
      {/* Canvas Board Area with Pan & Zoom */}
      <div
        className="absolute transition-transform duration-75 ease-out shadow-2xl"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          width: width * zoom,
          height: height * zoom,
        }}
      >
        {/* Checkerboard Background for transparency */}
        <div className="absolute inset-0 bg-checker border border-slate-800" />

        {/* Reference Image Overlay (if visible) */}
        {referenceImage && referenceImage.visible && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ opacity: referenceImage.opacity }}
          >
            <img
              src={referenceImage.url}
              alt="Reference overlay"
              className="w-full h-full object-contain pixelated"
            />
          </div>
        )}

        {/* Main Pixel Canvas */}
        <canvas
          ref={mainCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full pixelated z-10 pointer-events-none"
        />

        {/* Overlay Canvas (Grid, Selection Marquee, Cursor Preview, Symmetry Guides) */}
        <canvas
          ref={overlayCanvasRef}
          width={width * zoom}
          height={height * zoom}
          className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        />
      </div>

      {/* Coordinate & Zoom HUD in bottom-left */}
      <div className="absolute bottom-3 left-3 bg-[#12151B]/90 backdrop-blur-sm border border-slate-800 rounded px-2.5 py-1 text-[11px] font-mono text-slate-300 flex items-center gap-3 shadow-lg pointer-events-none z-30">
        <div>
          {hoverCoord ? (
            <span>
              X: <span className="text-teal-400 font-bold">{hoverCoord.x}</span>, Y:{' '}
              <span className="text-teal-400 font-bold">{hoverCoord.y}</span>
            </span>
          ) : (
            <span className="text-slate-500">Canvas</span>
          )}
        </div>
        <div className="text-slate-600">|</div>
        <span className="text-slate-400">
          {width}×{height}px
        </span>
        <div className="text-slate-600">|</div>
        <span className="text-teal-400 font-semibold">{Math.round(zoom * 100)}%</span>
      </div>
    </main>
  );
};
