import React from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Crop,
  Move,
  Replace,
  Sun,
  Hand,
  SplitSquareVertical,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  XSquare,
} from 'lucide-react';
import { ToolType, SymmetryMode, SelectionState } from '../types';

interface ToolboxProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  pixelPerfect: boolean;
  onTogglePixelPerfect: () => void;
  symmetryMode: SymmetryMode;
  onChangeSymmetryMode: (mode: SymmetryMode) => void;
  shadingMode: 'lighten' | 'darken';
  onToggleShadingMode: () => void;
  selection: SelectionState | null;
  onClearSelection: () => void;
  onFlipSelectionH: () => void;
  onFlipSelectionV: () => void;
  onRotateSelection90: () => void;
  onDeleteSelection: () => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  activeTool,
  onSelectTool,
  brushSize,
  onChangeBrushSize,
  pixelPerfect,
  onTogglePixelPerfect,
  symmetryMode,
  onChangeSymmetryMode,
  shadingMode,
  onToggleShadingMode,
  selection,
  onClearSelection,
  onFlipSelectionH,
  onFlipSelectionV,
  onRotateSelection90,
  onDeleteSelection,
}) => {
  const tools: Array<{ id: ToolType; label: string; shortcut: string; icon: React.ReactNode }> = [
    { id: 'pencil', label: 'Pencil', shortcut: 'B', icon: <Pencil className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: <Eraser className="w-4 h-4" /> },
    { id: 'bucket', label: 'Fill Bucket', shortcut: 'G', icon: <PaintBucket className="w-4 h-4" /> },
    { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: <Pipette className="w-4 h-4" /> },
    { id: 'line', label: 'Line Tool', shortcut: 'L', icon: <Minus className="w-4 h-4" /> },
    { id: 'rect', label: 'Rectangle', shortcut: 'U', icon: <Square className="w-4 h-4" /> },
    {
      id: 'filledRect',
      label: 'Filled Rectangle',
      shortcut: 'Shift+U',
      icon: (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3.5 h-3.5 bg-current rounded-[1px]" />
        </div>
      ),
    },
    { id: 'circle', label: 'Circle Outline', shortcut: 'C', icon: <Circle className="w-4 h-4" /> },
    {
      id: 'filledCircle',
      label: 'Filled Circle',
      shortcut: 'Shift+C',
      icon: (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3.5 h-3.5 bg-current rounded-full" />
        </div>
      ),
    },
    { id: 'select', label: 'Marquee Selection', shortcut: 'M', icon: <Crop className="w-4 h-4" /> },
    { id: 'move', label: 'Move Pixels', shortcut: 'V', icon: <Move className="w-4 h-4" /> },
    { id: 'colorReplace', label: 'Replace Color', shortcut: 'R', icon: <Replace className="w-4 h-4" /> },
    { id: 'shading', label: 'Shading Brush', shortcut: 'S', icon: <Sun className="w-4 h-4" /> },
    { id: 'pan', label: 'Pan Canvas', shortcut: 'H / Space', icon: <Hand className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-14 bg-[#14171F] border-r border-slate-800/80 flex flex-col items-center py-2 select-none z-20 gap-1">
      {/* Tool Buttons */}
      <div className="flex flex-col gap-1 w-full px-2 overflow-y-auto max-h-[calc(100vh-220px)]">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-10 h-10 rounded flex items-center justify-center relative group transition-colors cursor-pointer ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={`${t.label} (${t.shortcut})`}
              aria-label={t.label}
            >
              {t.icon}
              {/* Tooltip */}
              <div className="absolute left-12 ml-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                <span className="font-medium">{t.label}</span>
                <span className="ml-1.5 text-teal-400 font-mono">[{t.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="w-8 h-[1px] bg-slate-800/80 my-1" />

      {/* Brush Size (1 - 4px) */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Size</span>
        <div className="flex flex-col gap-0.5">
          {[1, 2, 3, 4].map((size) => (
            <button
              key={size}
              onClick={() => onChangeBrushSize(size)}
              className={`w-7 h-5 rounded text-[10px] font-mono font-medium transition-colors ${
                brushSize === size
                  ? 'bg-teal-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={`Brush Size ${size}px`}
              aria-label={`Brush Size ${size}px`}
            >
              {size}p
            </button>
          ))}
        </div>
      </div>

      {/* Pencil Pixel-Perfect Toggle */}
      {activeTool === 'pencil' && (
        <button
          onClick={onTogglePixelPerfect}
          className={`mt-1 w-9 h-7 rounded text-[9px] font-bold tracking-tight border transition-colors ${
            pixelPerfect
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
              : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
          }`}
          title="Pixel-Perfect Mode: removes stray corner pixels from freehand strokes"
        >
          PERF
        </button>
      )}

      {/* Shading Mode Toggle (Lighten / Darken) */}
      {activeTool === 'shading' && (
        <button
          onClick={onToggleShadingMode}
          className={`mt-1 w-9 h-7 rounded text-[9px] font-bold tracking-tight border transition-colors ${
            shadingMode === 'lighten'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
          }`}
          title={`Shading: Click to toggle (Currently ${shadingMode})`}
        >
          {shadingMode === 'lighten' ? '+LGT' : '-DRK'}
        </button>
      )}

      {/* Symmetry Quick Switcher */}
      <div className="mt-1 flex flex-col items-center gap-1">
        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">SYM</span>
        <div className="grid grid-cols-2 gap-0.5">
          <button
            onClick={() => onChangeSymmetryMode(symmetryMode === 'horizontal' ? 'none' : 'horizontal')}
            className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold ${
              symmetryMode === 'horizontal' || symmetryMode === 'both'
                ? 'bg-teal-500 text-slate-950'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900'
            }`}
            title="Horizontal Mirror Symmetry"
          >
            H
          </button>
          <button
            onClick={() => onChangeSymmetryMode(symmetryMode === 'vertical' ? 'none' : 'vertical')}
            className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-bold ${
              symmetryMode === 'vertical' || symmetryMode === 'both'
                ? 'bg-teal-500 text-slate-950'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900'
            }`}
            title="Vertical Mirror Symmetry"
          >
            V
          </button>
        </div>
      </div>

      {/* Floating Selection Controls (if marquee active) */}
      {selection && (
        <div className="mt-2 flex flex-col gap-1 items-center border-t border-slate-800 pt-1">
          <button
            onClick={onFlipSelectionH}
            className="w-7 h-7 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            title="Flip Selection Horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFlipSelectionV}
            className="w-7 h-7 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            title="Flip Selection Vertical"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRotateSelection90}
            className="w-7 h-7 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center"
            title="Rotate Selection 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDeleteSelection}
            className="w-7 h-7 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 flex items-center justify-center"
            title="Clear Selected Pixels (Delete)"
          >
            <XSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearSelection}
            className="text-[9px] text-slate-400 hover:text-white underline mt-0.5"
            title="Deselect (Escape)"
          >
            Deselect
          </button>
        </div>
      )}
    </aside>
  );
};
