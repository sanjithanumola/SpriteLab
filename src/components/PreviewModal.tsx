import React, { useRef, useEffect, useState } from 'react';
import { X, Play, Pause, Repeat, Maximize2 } from 'lucide-react';
import { Frame } from '../types';
import { composeLayers } from '../utils/pixelMath';

interface PreviewModalProps {
  frames: Frame[];
  width: number;
  height: number;
  fps: number;
  isOpen: boolean;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  frames,
  width,
  height,
  fps,
  isOpen,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [zoom, setZoom] = useState<number>(4);
  const [bgType, setBgType] = useState<'check' | 'dark' | 'light' | 'green'>('check');
  const [showOutline, setShowOutline] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, Math.max(20, Math.round(1000 / fps)));

    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  // Keep index in bounds if frames array changes
  useEffect(() => {
    if (currentFrameIdx >= frames.length) {
      setCurrentFrameIdx(0);
    }
  }, [frames.length, currentFrameIdx]);

  // Render current frame to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = frames[currentFrameIdx] || frames[0];
    const composed = composeLayers(frame.layers, width, height);

    const imgData = new ImageData(new Uint8ClampedArray(composed), width, height);
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    temp.getContext('2d')!.putImageData(imgData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Optional black pixel outline effect (often used in 2D games)
    if (showOutline) {
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
  }, [frames, currentFrameIdx, width, height, zoom, showOutline]);

  if (!isOpen) return null;

  const bgClasses = {
    check: 'bg-checker',
    dark: 'bg-[#0f1218]',
    light: 'bg-slate-200',
    green: 'bg-[#00FF00]',
  };

  return (
    <div className="fixed bottom-32 right-6 z-40 bg-[#14171F] border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden flex flex-col w-64 select-none">
      {/* Window Header */}
      <div className="h-8 bg-[#12151B] border-b border-slate-800 px-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Play className="w-3 h-3 text-teal-400" />
          <span>Animation Preview</span>
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Close Preview Window"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview Viewport */}
      <div
        className={`h-48 flex items-center justify-center p-3 relative overflow-hidden transition-colors ${bgClasses[bgType]}`}
      >
        <canvas
          ref={canvasRef}
          width={width * zoom}
          height={height * zoom}
          className="pixelated"
        />

        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-slate-300">
          #{currentFrameIdx + 1}/{frames.length}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-2.5 bg-[#12151B] border-t border-slate-800 flex flex-col gap-2 text-xs">
        {/* Playback & Zoom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[11px] font-mono text-slate-400 pl-1">{fps} FPS</span>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 4, 8].map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`w-5 h-5 rounded text-[10px] font-mono font-medium ${
                  zoom === z
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>

        {/* Background Selector & Outline Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1">
            {(['check', 'dark', 'light', 'green'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => setBgType(bg)}
                className={`w-4 h-4 rounded-full border transition-all ${
                  bgType === bg ? 'ring-2 ring-teal-400 scale-110' : 'border-slate-700'
                } ${
                  bg === 'check'
                    ? 'bg-checker'
                    : bg === 'dark'
                    ? 'bg-slate-900'
                    : bg === 'light'
                    ? 'bg-slate-200'
                    : 'bg-[#00FF00]'
                }`}
                title={`Background: ${bg}`}
              />
            ))}
          </div>

          <button
            onClick={() => setShowOutline(!showOutline)}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              showOutline
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                : 'text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
            title="Toggle Sprite Outline"
          >
            Outline
          </button>
        </div>
      </div>
    </div>
  );
};
