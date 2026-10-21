import React, { useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Layers,
  Settings,
} from 'lucide-react';
import { Frame, Layer } from '../types';
import { composeLayers } from '../utils/pixelMath';

interface TimelineProps {
  frames: Frame[];
  activeFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onReorderFrame: (index: number, direction: 'left' | 'right') => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  fps: number;
  onChangeFps: (fps: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
  width: number;
  height: number;
  onApplyPresetAnimation: (preset: 'idle' | 'walk' | 'jump' | 'attack') => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  activeFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onReorderFrame,
  isPlaying,
  onTogglePlay,
  fps,
  onChangeFps,
  isLooping,
  onToggleLoop,
  onionSkinEnabled,
  onToggleOnionSkin,
  width,
  height,
  onApplyPresetAnimation,
}) => {
  return (
    <footer className="h-28 bg-[#12151B] border-t border-slate-800/80 flex flex-col select-none z-20">
      {/* Top Controls Row */}
      <div className="h-9 border-b border-slate-800/70 px-3 flex items-center justify-between text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectFrame(0)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:inline-flex"
            title="First Frame"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              onSelectFrame(
                activeFrameIndex > 0 ? activeFrameIndex - 1 : frames.length - 1
              )
            }
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Previous Frame (, or <)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-2.5 sm:px-3 py-1 rounded font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-sm shadow-teal-500/20'
            }`}
            title="Play / Pause Animation (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Play</span>
              </>
            )}
          </button>

          <button
            onClick={() =>
              onSelectFrame((activeFrameIndex + 1) % frames.length)
            }
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Next Frame (. or >)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSelectFrame(frames.length - 1)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:inline-flex"
            title="Last Frame"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-0.5 sm:mx-1" />

          {/* Loop toggle */}
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded transition-colors ${
              isLooping
                ? 'text-teal-400 bg-teal-500/15 border border-teal-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={isLooping ? 'Looping: On' : 'Looping: Off'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Onion skin toggle */}
          <button
            onClick={onToggleOnionSkin}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-xs transition-colors ${
              onionSkinEnabled
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Onion Skinning"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Onion Skin</span>
          </button>
        </div>

        {/* Center: Frame Count & FPS Slider */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            <span className="hidden sm:inline">Frame </span>
            <span className="text-teal-300 font-bold">{activeFrameIndex + 1}</span>/{frames.length}
          </span>

          <div className="flex items-center gap-1 bg-[#181B22] px-1.5 py-0.5 rounded border border-slate-800">
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">{fps} FPS</span>
            <input
              type="range"
              min={1}
              max={24}
              value={fps}
              onChange={(e) => onChangeFps(parseInt(e.target.value))}
              className="w-12 sm:w-16 accent-teal-400 h-1 cursor-pointer"
              title="Animation Playback Speed (FPS)"
            />
          </div>
        </div>

        {/* Right: Starter Animation Presets */}
        <div className="hidden lg:flex items-center gap-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">
            Presets:
          </span>
          {(['idle', 'walk', 'jump', 'attack'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onApplyPresetAnimation(preset)}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] capitalize transition-colors"
              title={`Create starter ${preset} timeline`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Thumbnails Row */}
      <div className="flex-1 px-3 py-1.5 flex items-center gap-2 overflow-x-auto">
        {frames.map((frame, idx) => {
          const isActive = idx === activeFrameIndex;

          return (
            <div
              key={frame.id}
              onClick={() => onSelectFrame(idx)}
              className={`relative flex-shrink-0 flex flex-col items-center group cursor-pointer transition-all ${
                isActive
                  ? 'ring-2 ring-teal-400 bg-slate-800/90 rounded'
                  : 'bg-[#181B22] hover:bg-slate-800/60 rounded border border-slate-800'
              }`}
            >
              {/* Frame Number Label */}
              <div className="w-full bg-[#14171F] px-1 py-0.5 flex items-center justify-between text-[9px] font-mono border-b border-slate-800/80 rounded-t">
                <span className={isActive ? 'text-teal-300 font-bold' : 'text-slate-400'}>
                  #{idx + 1}
                </span>
                <span className="text-[8px] text-slate-500">{Math.round(1000 / fps)}ms</span>
              </div>

              {/* Canvas Preview Thumbnail */}
              <div className="w-14 h-12 p-1 flex items-center justify-center bg-checker relative overflow-hidden rounded-b">
                <FrameThumbnailCanvas
                  layers={frame.layers}
                  width={width}
                  height={height}
                />
              </div>

              {/* Hover Quick Frame Actions: Duplicate, Move, Delete */}
              <div className="absolute -top-3 right-0 hidden group-hover:flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded shadow-md px-0.5 py-0.5 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderFrame(idx, 'left');
                  }}
                  disabled={idx === 0}
                  className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Frame Left"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateFrame(idx);
                  }}
                  className="p-0.5 text-slate-400 hover:text-teal-300"
                  title="Duplicate Frame (Shift+D)"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {frames.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFrame(idx);
                    }}
                    className="p-0.5 text-rose-400 hover:text-rose-300"
                    title="Delete Frame"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReorderFrame(idx, 'right');
                  }}
                  disabled={idx === frames.length - 1}
                  className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
                  title="Move Frame Right"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Blank Frame Button */}
        <button
          onClick={onAddFrame}
          className="flex-shrink-0 w-12 h-14 rounded border border-dashed border-slate-700 hover:border-teal-400 hover:bg-slate-800/40 text-slate-400 hover:text-teal-300 flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
          title="Add Blank Frame"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[9px] font-medium">Add</span>
        </button>
      </div>
    </footer>
  );
};

/**
 * Optimized mini canvas thumbnail component for timeline
 */
const FrameThumbnailCanvas: React.FC<{
  layers: Layer[];
  width: number;
  height: number;
}> = ({ layers, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const composed = composeLayers(layers, width, height);
    const imgData = new ImageData(new Uint8ClampedArray(composed), width, height);

    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    temp.getContext('2d')!.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Draw centered with aspect ratio preserved
    const scale = Math.min(canvas.width / width, canvas.height / height);
    const sw = width * scale;
    const sh = height * scale;
    const sx = (canvas.width - sw) / 2;
    const sy = (canvas.height - sh) / 2;

    ctx.drawImage(temp, sx, sy, sw, sh);
  }, [layers, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={40}
      className="pixelated pointer-events-none"
    />
  );
};
