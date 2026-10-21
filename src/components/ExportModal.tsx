import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Image as ImageIcon,
  Grid,
  Film,
  FileCode,
  Check,
  Loader2,
} from 'lucide-react';
import { Project, SpriteSheetConfig } from '../types';
import { composeLayers } from '../utils/pixelMath';
import { renderSpriteSheet } from '../utils/spriteSheet';
import { encodeGif } from '../utils/gifEncoder';
import { serializeProject } from '../utils/storage';

interface ExportModalProps {
  project: Project;
  activeFrameIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  activeFrameIndex,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'png' | 'spritesheet' | 'gif' | 'project'>('png');

  // PNG settings
  const [pngScale, setPngScale] = useState<number>(4);
  const [pngMode, setPngMode] = useState<'current' | 'all'>('current');
  const [pngTransparent, setPngTransparent] = useState<boolean>(true);
  const [pngBgColor, setPngBgColor] = useState<string>('#000000');

  // Sprite Sheet settings
  const [sheetColumns, setSheetColumns] = useState<number>(
    Math.min(project.frames.length, 6)
  );
  const [sheetSpacing, setSheetSpacing] = useState<number>(1);
  const [sheetPadding, setSheetPadding] = useState<number>(1);
  const [sheetTransparent, setSheetTransparent] = useState<boolean>(true);
  const [sheetBgColor, setSheetBgColor] = useState<string>('#000000');
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);

  // GIF settings
  const [gifScale, setGifScale] = useState<number>(4);
  const [gifLoop, setGifLoop] = useState<boolean>(true);
  const [gifTransparent, setGifTransparent] = useState<boolean>(true);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);
  const [gifSuccess, setGifSuccess] = useState<boolean>(false);

  // Update sprite sheet preview canvas when tab is 'spritesheet'
  useEffect(() => {
    if (activeTab === 'spritesheet' && sheetCanvasRef.current) {
      const rows = Math.ceil(project.frames.length / Math.max(1, sheetColumns));
      const config: SpriteSheetConfig = {
        columns: Math.max(1, sheetColumns),
        rows: Math.max(1, rows),
        spacing: sheetSpacing,
        padding: sheetPadding,
        transparentBg: sheetTransparent,
        bgColor: sheetBgColor,
      };

      try {
        const { canvas } = renderSpriteSheet(project, config);
        const display = sheetCanvasRef.current;
        display.width = canvas.width;
        display.height = canvas.height;
        const ctx = display.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, display.width, display.height);
          ctx.drawImage(canvas, 0, 0);
        }
      } catch (err) {
        console.error('Error rendering sheet preview:', err);
      }
    }
  }, [
    activeTab,
    project,
    sheetColumns,
    sheetSpacing,
    sheetPadding,
    sheetTransparent,
    sheetBgColor,
  ]);

  if (!isOpen) return null;

  /**
   * Helper to download blob
   */
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * 1. Export PNG (Current frame or all individual frames)
   */
  const handleExportPng = () => {
    const framesToExport =
      pngMode === 'current'
        ? [{ frame: project.frames[activeFrameIndex], index: activeFrameIndex }]
        : project.frames.map((f, i) => ({ frame: f, index: i }));

    for (const item of framesToExport) {
      const { frame, index } = item;
      const targetW = project.width * pngScale;
      const targetH = project.height * pngScale;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      if (!pngTransparent) {
        ctx.fillStyle = pngBgColor;
        ctx.fillRect(0, 0, targetW, targetH);
      }

      const composite = composeLayers(frame.layers, project.width, project.height);
      const imgData = new ImageData(
        new Uint8ClampedArray(composite),
        project.width,
        project.height
      );

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = project.width;
      tempCanvas.height = project.height;
      tempCanvas.getContext('2d')!.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, targetW, targetH);

      canvas.toBlob((blob) => {
        if (blob) {
          const suffix = pngMode === 'current' ? '' : `_frame_${index + 1}`;
          triggerDownload(blob, `${project.name || 'sprite'}${suffix}_${pngScale}x.png`);
        }
      }, 'image/png');
    }
  };

  /**
   * 2. Export Sprite Sheet PNG & Metadata JSON
   */
  const handleExportSpriteSheet = (exportMetadata = false) => {
    const rows = Math.ceil(project.frames.length / Math.max(1, sheetColumns));
    const config: SpriteSheetConfig = {
      columns: Math.max(1, sheetColumns),
      rows: Math.max(1, rows),
      spacing: sheetSpacing,
      padding: sheetPadding,
      transparentBg: sheetTransparent,
      bgColor: sheetBgColor,
    };

    const { canvas, metadata } = renderSpriteSheet(project, config);

    canvas.toBlob((blob) => {
      if (blob) {
        triggerDownload(blob, `${project.name || 'sprite'}_spritesheet.png`);
      }
    }, 'image/png');

    if (exportMetadata) {
      const jsonStr = JSON.stringify(metadata, null, 2);
      const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      triggerDownload(jsonBlob, `${project.name || 'sprite'}_spritesheet.json`);
    }
  };

  /**
   * 3. Export Real Animated GIF
   */
  const handleExportGif = async () => {
    setIsExportingGif(true);
    setGifSuccess(false);

    // Yield to let UI update spinner
    await new Promise((r) => setTimeout(r, 50));

    try {
      const scaledW = project.width * gifScale;
      const scaledH = project.height * gifScale;

      const gifFrames = project.frames.map((frame) => {
        const composite = composeLayers(frame.layers, project.width, project.height);
        const temp = document.createElement('canvas');
        temp.width = project.width;
        temp.height = project.height;
        const tempCtx = temp.getContext('2d')!;
        tempCtx.putImageData(
          new ImageData(new Uint8ClampedArray(composite), project.width, project.height),
          0,
          0
        );

        // Scale to target gif resolution with nearest-neighbor crisp edges
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledW;
        scaledCanvas.height = scaledH;
        const sCtx = scaledCanvas.getContext('2d')!;
        sCtx.imageSmoothingEnabled = false;
        sCtx.drawImage(temp, 0, 0, scaledW, scaledH);

        const scaledData = sCtx.getImageData(0, 0, scaledW, scaledH).data;

        return {
          data: scaledData,
          width: scaledW,
          height: scaledH,
          delayMs: Math.round(1000 / project.fps),
        };
      });

      const gifBytes = encodeGif(gifFrames, {
        width: scaledW,
        height: scaledH,
        loop: gifLoop ? 0 : 1,
        transparentBg: gifTransparent,
      });

      const blob = new Blob([gifBytes as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
      triggerDownload(blob, `${project.name || 'animation'}_${gifScale}x.gif`);
      setGifSuccess(true);
      setTimeout(() => setGifSuccess(false), 2500);
    } catch (err) {
      console.error('GIF Export error:', err);
      alert('Error generating GIF: ' + err);
    } finally {
      setIsExportingGif(false);
    }
  };

  /**
   * 4. Export Project JSON (.spritelab)
   */
  const handleExportProjectJson = () => {
    const serialized = serializeProject(project);
    const jsonStr = JSON.stringify(serialized, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    triggerDownload(blob, `${project.name || 'project'}.spritelab.json`);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#14171F] border border-slate-700/80 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-12 bg-[#12151B] border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100">Export Sprite & Assets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#161922] px-4 gap-2 pt-2">
          {[
            { id: 'png', label: 'PNG Image', icon: <ImageIcon className="w-3.5 h-3.5" /> },
            { id: 'spritesheet', label: 'Sprite Sheet', icon: <Grid className="w-3.5 h-3.5" /> },
            { id: 'gif', label: 'Animated GIF', icon: <Film className="w-3.5 h-3.5" /> },
            { id: 'project', label: 'Editable Project', icon: <FileCode className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-teal-400 text-teal-300 bg-[#14171F] rounded-t'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs text-slate-300">
          {/* TAB 1: PNG IMAGE */}
          {activeTab === 'png' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Scale selection */}
                <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-200">Scale Factor</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 4, 8, 16].map((scale) => (
                      <button
                        key={scale}
                        onClick={() => setPngScale(scale)}
                        className={`py-1.5 rounded font-mono font-medium transition-colors ${
                          pngScale === scale
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {scale}x
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-1">
                    Output size: {project.width * pngScale} × {project.height * pngScale} px
                  </span>
                </div>

                {/* Frames to export */}
                <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-200">Frames</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPngMode('current')}
                      className={`flex-1 py-1.5 rounded font-medium transition-colors ${
                        pngMode === 'current'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Current Frame (#{activeFrameIndex + 1})
                    </button>
                    <button
                      onClick={() => setPngMode('all')}
                      className={`flex-1 py-1.5 rounded font-medium transition-colors ${
                        pngMode === 'all'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({project.frames.length} frames)
                    </button>
                  </div>
                </div>
              </div>

              {/* Background transparency */}
              <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Transparent Background</span>
                  <span className="text-[11px] text-slate-400">
                    Preserves transparent pixels without background fill
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pngTransparent}
                  onChange={(e) => setPngTransparent(e.target.checked)}
                  className="w-4 h-4 accent-teal-400 cursor-pointer"
                />
              </div>

              <button
                onClick={handleExportPng}
                className="mt-2 py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG ({project.width * pngScale}×{project.height * pngScale}px)</span>
              </button>
            </div>
          )}

          {/* TAB 2: SPRITE SHEET */}
          {activeTab === 'spritesheet' && (
            <div className="flex flex-col gap-4">
              {/* Controls */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#181B22] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
                  <span className="font-semibold text-slate-300">Columns</span>
                  <input
                    type="number"
                    min={1}
                    max={project.frames.length}
                    value={sheetColumns}
                    onChange={(e) => setSheetColumns(parseInt(e.target.value) || 1)}
                    className="bg-[#12151B] border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div className="bg-[#181B22] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
                  <span className="font-semibold text-slate-300">Spacing (px)</span>
                  <input
                    type="number"
                    min={0}
                    max={32}
                    value={sheetSpacing}
                    onChange={(e) => setSheetSpacing(parseInt(e.target.value) || 0)}
                    className="bg-[#12151B] border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
                <div className="bg-[#181B22] p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
                  <span className="font-semibold text-slate-300">Padding (px)</span>
                  <input
                    type="number"
                    min={0}
                    max={32}
                    value={sheetPadding}
                    onChange={(e) => setSheetPadding(parseInt(e.target.value) || 0)}
                    className="bg-[#12151B] border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Sheet preview canvas container */}
              <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                <span className="font-semibold text-slate-300">Sprite Sheet Preview</span>
                <div className="max-h-48 overflow-auto bg-checker p-4 rounded border border-slate-800 flex items-center justify-center">
                  <canvas ref={sheetCanvasRef} className="pixelated shadow-md" />
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleExportSpriteSheet(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sprite Sheet PNG</span>
                </button>
                <button
                  onClick={() => handleExportSpriteSheet(true)}
                  className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border border-teal-500/30"
                  title="Download PNG image plus JSON metadata for game engines (Godot, Phaser, Unity)"
                >
                  <FileCode className="w-4 h-4" />
                  <span>PNG + JSON Meta</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ANIMATED GIF */}
          {activeTab === 'gif' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <span className="font-semibold text-slate-200">Scale Factor</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 4, 8].map((scale) => (
                      <button
                        key={scale}
                        onClick={() => setGifScale(scale)}
                        className={`py-1.5 rounded font-mono font-medium transition-colors ${
                          gifScale === scale
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {scale}x
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono mt-1">
                    GIF Size: {project.width * gifScale} × {project.height * gifScale} px @ {project.fps} FPS
                  </span>
                </div>

                <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 flex flex-col gap-3 justify-center">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-medium text-slate-200">Infinite Looping</span>
                    <input
                      type="checkbox"
                      checked={gifLoop}
                      onChange={(e) => setGifLoop(e.target.checked)}
                      className="w-4 h-4 accent-teal-400 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-medium text-slate-200">Preserve Transparency</span>
                    <input
                      type="checkbox"
                      checked={gifTransparent}
                      onChange={(e) => setGifTransparent(e.target.checked)}
                      className="w-4 h-4 accent-teal-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-[#181B22] p-3 rounded-lg border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                Uses SpriteLab's high-performance pure GIF89a LZW encoder. Outputs a genuine,
                standalone animated GIF respecting your timeline frame rates and transparency.
              </div>

              <button
                onClick={handleExportGif}
                disabled={isExportingGif}
                className="py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20"
              >
                {isExportingGif ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Encoding GIF...</span>
                  </>
                ) : gifSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950" />
                    <span>GIF Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate & Download Animated GIF</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 4: PROJECT FILE */}
          {activeTab === 'project' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#181B22] p-3.5 rounded-lg border border-slate-800 flex flex-col gap-2">
                <span className="font-semibold text-slate-200 text-sm">
                  Full Project Backup (.spritelab.json)
                </span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Export an editable project file containing all your animation frames, layers,
                  color palettes, opacity settings, and project metadata. You can re-import this file
                  at any time on any computer to continue editing right where you left off.
                </p>
              </div>

              <button
                onClick={handleExportProjectJson}
                className="py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Export Project File (.spritelab.json)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
