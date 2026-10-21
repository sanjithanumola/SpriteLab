import React, { useState, useRef } from 'react';
import {
  Layers,
  Palette,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ArrowDown,
  ArrowUp,
  ArrowDownToLine,
  ChevronDown,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Download,
} from 'lucide-react';
import { Layer, RGBA, ReferenceImage } from '../types';
import { PALETTE_PRESETS, PalettePreset } from '../utils/palettes';
import { hexToRgba, rgbaToHex } from '../utils/pixelMath';

interface RightSidebarProps {
  primaryColor: string; // HEX
  secondaryColor: string; // HEX
  onSelectPrimaryColor: (color: string) => void;
  onSelectSecondaryColor: (color: string) => void;
  onSwapColors: () => void;
  palette: string[];
  onChangePalette: (palette: string[]) => void;
  recentColors: string[];
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onAddLayer: () => void;
  onDuplicateLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleLayerVisible: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onChangeLayerOpacity: (layerId: string, opacity: number) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  onReorderLayer: (layerId: string, direction: 'up' | 'down') => void;
  onMergeLayerDown: (layerId: string) => void;
  referenceImage: ReferenceImage | null;
  onSetReferenceImage: (ref: ReferenceImage | null) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  primaryColor,
  secondaryColor,
  onSelectPrimaryColor,
  onSelectSecondaryColor,
  onSwapColors,
  palette,
  onChangePalette,
  recentColors,
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onToggleLayerVisible,
  onToggleLayerLock,
  onChangeLayerOpacity,
  onRenameLayer,
  onReorderLayer,
  onMergeLayerDown,
  referenceImage,
  onSetReferenceImage,
  isOpenOnMobile,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'layers' | 'reference'>('colors');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [hexInput, setHexInput] = useState(primaryColor);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Sync hexInput when primaryColor changes
  React.useEffect(() => {
    setHexInput(primaryColor);
  }, [primaryColor]);

  const activeRgba = hexToRgba(primaryColor);

  const handleHexChange = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#')) clean = '#' + clean;
    setHexInput(clean);
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      onSelectPrimaryColor(clean.toUpperCase());
    }
  };

  const handleRgbChange = (channel: 0 | 1 | 2, val: number) => {
    const next: RGBA = [...activeRgba];
    next[channel] = Math.max(0, Math.min(255, val));
    onSelectPrimaryColor(rgbaToHex(next[0], next[1], next[2]));
  };

  const handleAddCurrentToPalette = () => {
    if (!palette.includes(primaryColor)) {
      onChangePalette([...palette, primaryColor]);
    }
  };

  const handleRemoveFromPalette = (col: string) => {
    if (palette.length > 2) {
      onChangePalette(palette.filter((c) => c !== col));
    }
  };

  const handleExportPalette = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ name: 'SpriteLab Palette', colors: palette }, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'spritelab-palette.json';
    a.click();
  };

  const handleImportPalette = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.colors)) {
          onChangePalette(parsed.colors);
        } else if (Array.isArray(parsed)) {
          onChangePalette(parsed);
        }
      } catch {
        alert('Invalid palette JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onSetReferenceImage({
          url: event.target?.result as string,
          opacity: 0.5,
          x: 0,
          y: 0,
          scale: 1,
          visible: true,
          originalWidth: img.width,
          originalHeight: img.height,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        className={`bg-[#14171F] border-l border-slate-800/80 flex flex-col h-full select-none z-40 transition-transform duration-200 ease-in-out ${
          isOpenOnMobile
            ? 'fixed inset-y-0 right-0 w-80 shadow-2xl flex'
            : 'hidden md:flex md:relative md:w-72'
        }`}
      >
      {/* Tab Switcher */}
      <div className="h-10 bg-[#12151B] border-b border-slate-800 flex items-center px-2 gap-1">
        <button
          onClick={() => setActiveTab('colors')}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'colors'
              ? 'bg-[#181B22] text-teal-300 border border-slate-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Colors</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-[#181B22] text-teal-300 border border-slate-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-400">
            {layers.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('reference')}
          className={`py-1.5 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
            activeTab === 'reference'
              ? 'bg-[#181B22] text-teal-300 border border-slate-700/60 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
          title="Reference Image Overlay"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab 1: Colors & Palettes */}
      {activeTab === 'colors' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {/* Primary & Secondary Color Swatches */}
          <div className="flex items-center justify-between bg-[#181B22] p-2.5 rounded-md border border-slate-800">
            <div className="flex items-center gap-2">
              {/* Overlapping swatches */}
              <div className="relative w-12 h-10">
                {/* Secondary swatch */}
                <button
                  onClick={() => onSelectPrimaryColor(secondaryColor)}
                  className="absolute right-0 bottom-0 w-7 h-7 rounded border-2 border-slate-700 shadow-md cursor-pointer transition-transform hover:scale-105"
                  style={{ backgroundColor: secondaryColor }}
                  title="Secondary Color (Click to make primary)"
                  aria-label="Secondary Color"
                />
                {/* Primary swatch */}
                <div
                  className="absolute left-0 top-0 w-8 h-8 rounded border-2 border-white shadow-lg z-10"
                  style={{ backgroundColor: primaryColor }}
                  title="Primary Active Color"
                  aria-label="Primary Active Color"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Active Color
                </span>
                <span className="text-xs font-mono font-bold text-slate-100">{primaryColor}</span>
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={onSwapColors}
              className="p-1.5 rounded hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Swap Colors (X)"
              aria-label="Swap Colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Picker HTML5 & HEX / RGB Inputs */}
          <div className="bg-[#181B22] p-2.5 rounded-md border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => onSelectPrimaryColor(e.target.value.toUpperCase())}
                className="w-10 h-7 rounded cursor-pointer border border-slate-700 bg-transparent"
                title="System Color Picker"
              />
              <div className="flex-1 flex items-center bg-[#12151B] border border-slate-700/80 rounded px-2 py-1">
                <span className="text-[10px] text-slate-500 font-mono mr-1">HEX</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  maxLength={7}
                  className="bg-transparent text-xs font-mono text-slate-200 outline-none w-full uppercase"
                />
              </div>
            </div>

            {/* RGB Sliders */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(['R', 'G', 'B'] as const).map((channel, idx) => (
                <div key={channel} className="flex flex-col bg-[#12151B] p-1.5 rounded border border-slate-800">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>{channel}</span>
                    <span className="text-slate-200">{activeRgba[idx]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={activeRgba[idx]}
                    onChange={(e) => handleRgbChange(idx as 0 | 1 | 2, parseInt(e.target.value))}
                    className="w-full accent-teal-400 h-1 mt-1 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Retro Preset Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-300">Retro Palette Presets</span>
            </div>
            <select
              onChange={(e) => {
                const preset = PALETTE_PRESETS.find((p) => p.id === e.target.value);
                if (preset) onChangePalette([...preset.colors]);
              }}
              className="w-full bg-[#181B22] border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
            >
              {PALETTE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.author ? `(${p.author})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Active Palette Swatches */}
          <div className="bg-[#181B22] p-2.5 rounded-md border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                Palette ({palette.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleAddCurrentToPalette}
                  className="p-1 rounded text-teal-400 hover:bg-slate-800 transition-colors"
                  title="Add Current Color to Palette"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleExportPalette}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Export Palette JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <label
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Import Palette JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportPalette}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Color Swatch Grid */}
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto p-1 bg-[#12151B] rounded border border-slate-800/80">
              {palette.map((col, idx) => {
                const isSelected = primaryColor === col;
                return (
                  <button
                    key={`${col}-${idx}`}
                    onClick={() => onSelectPrimaryColor(col)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSelectSecondaryColor(col);
                    }}
                    onDoubleClick={() => handleRemoveFromPalette(col)}
                    className={`w-6 h-6 rounded-sm cursor-pointer transition-transform hover:scale-110 relative ${
                      isSelected ? 'ring-2 ring-teal-400 z-10' : 'border border-slate-700/60'
                    }`}
                    style={{ backgroundColor: col }}
                    title={`${col} (Click: Primary, Right-click: Secondary, Double-click: Remove)`}
                    aria-label={`Palette color ${col}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="bg-[#181B22] p-2.5 rounded-md border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Recently Used
              </span>
              <div className="flex flex-wrap gap-1">
                {recentColors.map((col, idx) => (
                  <button
                    key={`rec-${col}-${idx}`}
                    onClick={() => onSelectPrimaryColor(col)}
                    className="w-5 h-5 rounded-sm border border-slate-700/60 hover:scale-110 transition-transform cursor-pointer"
                    style={{ backgroundColor: col }}
                    title={col}
                    aria-label={`Recent color ${col}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Layers Manager */}
      {activeTab === 'layers' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          {/* Layer Actions Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Canvas Layers</span>
            <div className="flex items-center gap-1">
              <button
                onClick={onAddLayer}
                className="flex items-center gap-1 px-2 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 text-xs font-medium cursor-pointer"
                title="Add New Blank Layer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Layer</span>
              </button>
            </div>
          </div>

          {/* Active Layer Opacity Slider */}
          {activeLayer && (
            <div className="bg-[#181B22] p-2.5 rounded-md border border-slate-800 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Layer Opacity</span>
                <span className="font-mono text-teal-300 font-medium">
                  {Math.round((activeLayer.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((activeLayer.opacity ?? 1) * 100)}
                onChange={(e) =>
                  onChangeLayerOpacity(activeLayer.id, parseInt(e.target.value) / 100)
                }
                className="w-full accent-teal-400 h-1.5 cursor-pointer"
              />
            </div>
          )}

          {/* Layers List (Top of list = top rendered layer) */}
          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {layers
              .slice()
              .reverse()
              .map((layer, reverseIdx) => {
                const actualIdx = layers.length - 1 - reverseIdx;
                const isActive = layer.id === activeLayerId;
                const isTop = actualIdx === layers.length - 1;
                const isBottom = actualIdx === 0;

                return (
                  <div
                    key={layer.id}
                    onClick={() => onSelectLayer(layer.id)}
                    className={`p-2 rounded-md border flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-800/90 border-teal-500/60 shadow-sm'
                        : 'bg-[#181B22] border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Left: Visibility & Lock */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLayerVisible(layer.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-700/60 transition-colors ${
                          layer.visible ? 'text-teal-400' : 'text-slate-600'
                        }`}
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLayerLock(layer.id);
                        }}
                        className={`p-1 rounded hover:bg-slate-700/60 transition-colors ${
                          layer.locked ? 'text-amber-400' : 'text-slate-600'
                        }`}
                        title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                      >
                        {layer.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Center: Layer Name (Click to edit) */}
                    <div className="flex-1 min-w-0">
                      {editingLayerId === layer.id ? (
                        <input
                          type="text"
                          value={editingLayerName}
                          onChange={(e) => setEditingLayerName(e.target.value)}
                          onBlur={() => {
                            if (editingLayerName.trim()) {
                              onRenameLayer(layer.id, editingLayerName.trim());
                            }
                            setEditingLayerId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingLayerName.trim()) {
                                onRenameLayer(layer.id, editingLayerName.trim());
                              }
                              setEditingLayerId(null);
                            }
                            if (e.key === 'Escape') setEditingLayerId(null);
                          }}
                          autoFocus
                          className="bg-slate-900 border border-teal-500 rounded px-1.5 py-0.5 text-xs text-white w-full outline-none"
                        />
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingLayerId(layer.id);
                            setEditingLayerName(layer.name);
                          }}
                          className="text-xs font-medium text-slate-200 truncate select-none"
                          title="Double-click to rename"
                        >
                          {layer.name}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions (Move up/down, duplicate, delete) */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderLayer(layer.id, 'up');
                        }}
                        disabled={isTop}
                        className={`p-1 rounded transition-colors ${
                          isTop
                            ? 'text-slate-700 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderLayer(layer.id, 'down');
                        }}
                        disabled={isBottom}
                        className={`p-1 rounded transition-colors ${
                          isBottom
                            ? 'text-slate-700 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      {!isBottom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMergeLayerDown(layer.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-700 transition-colors"
                          title="Merge Down"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateLayer(layer.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Duplicate Layer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {layers.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                          }}
                          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 3: Reference Image Overlay */}
      {activeTab === 'reference' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Reference Overlay</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Import a reference image for tracing or inspiration. It is displayed on a separate
              overlay and never flattens into your sprite.
            </p>
          </div>

          {referenceImage ? (
            <div className="bg-[#181B22] p-3 rounded-md border border-slate-800 flex flex-col gap-3">
              {/* Reference preview */}
              <div className="relative rounded overflow-hidden border border-slate-700/80 bg-[#12151B] max-h-36 flex items-center justify-center">
                <img
                  src={referenceImage.url}
                  alt="Reference"
                  className="max-h-32 object-contain"
                  style={{ opacity: referenceImage.opacity }}
                />
              </div>

              {/* Opacity slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Overlay Opacity</span>
                  <span className="font-mono text-teal-300">
                    {Math.round(referenceImage.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(referenceImage.opacity * 100)}
                  onChange={(e) =>
                    onSetReferenceImage({
                      ...referenceImage,
                      opacity: parseInt(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-teal-400 h-1.5 cursor-pointer"
                />
              </div>

              {/* Visibility & Clear */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() =>
                    onSetReferenceImage({
                      ...referenceImage,
                      visible: !referenceImage.visible,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  {referenceImage.visible ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSetReferenceImage(null)}
                  className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs border border-rose-500/30 transition-colors"
                >
                  Remove Overlay
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-lg text-center bg-[#181B22]/50">
              <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs font-medium text-slate-300">No Reference Image</span>
              <p className="text-[11px] text-slate-500 mt-1 mb-3">
                Upload any PNG, JPG, or WEBP image to trace over
              </p>
              <button
                onClick={() => refFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Reference</span>
              </button>
              <input
                ref={refFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReferenceUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
      </aside>
    </>
  );
};
