import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Plus,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Play,
  Download,
  HelpCircle,
  Sparkles,
  Layers,
} from 'lucide-react';

interface TopNavbarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  width: number;
  height: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onOpenProjectModal: () => void;
  onSaveProject: () => void;
  isAutosaving: boolean;
  onOpenExportModal: () => void;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  onOpenShortcutsModal: () => void;
  onLoadTemplate: (template: 'blank' | 'coin' | 'hero') => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  projectName,
  onRenameProject,
  width,
  height,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  showGrid,
  onToggleGrid,
  onOpenProjectModal,
  onSaveProject,
  isAutosaving,
  onOpenExportModal,
  onTogglePreview,
  isPreviewOpen,
  onOpenShortcutsModal,
  onLoadTemplate,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const handleFinishRename = () => {
    setIsEditingName(false);
    if (tempName.trim()) {
      onRenameProject(tempName.trim());
    } else {
      setTempName(projectName);
    }
  };

  return (
    <header className="h-12 bg-[#12151B] border-b border-slate-800/80 px-3 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <div className="w-7 h-7 rounded bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-xs tracking-wider shadow-inner">
            <span className="font-mono text-sm leading-none">SL</span>
          </div>
          <span className="font-bold text-slate-100 text-sm tracking-tight hidden sm:inline">
            SpriteLab
          </span>
        </div>

        {/* Project Name & Dimensions Badge */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') {
                  setTempName(projectName);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="bg-slate-900 border border-teal-500/50 rounded px-2 py-0.5 text-xs text-white outline-none w-36 font-medium"
            />
          ) : (
            <button
              onClick={() => {
                setTempName(projectName);
                setIsEditingName(true);
              }}
              className="text-xs font-semibold text-slate-200 hover:text-teal-300 transition-colors cursor-pointer flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-800/60"
              title="Click to rename project"
            >
              <span>{projectName}</span>
            </button>
          )}

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
            {width}×{height}px
          </span>

          {/* Autosave Status */}
          <span className="text-[10px] text-slate-500 hidden md:inline flex items-center gap-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                isAutosaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400/80'
              }`}
            />
            {isAutosaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>

      {/* Center: File, Edit, Zoom, Grid Actions */}
      <div className="flex items-center gap-1">
        {/* Project & Storage Actions */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-800/80">
          <button
            onClick={onOpenProjectModal}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Projects Library & New (Ctrl+N)"
            aria-label="Projects Library"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Projects</span>
          </button>

          <button
            onClick={onSaveProject}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Save Project (Ctrl+S)"
            aria-label="Save Project"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Save</span>
          </button>

          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Starter Art & Presets"
              aria-label="Starter Art Presets"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline">Templates</span>
            </button>

            {showTemplateDropdown && (
              <div
                className="absolute left-0 mt-1 w-44 bg-[#181B22] border border-slate-700/80 rounded-md shadow-xl py-1 z-50 text-xs"
                onMouseLeave={() => setShowTemplateDropdown(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                  Starter Sprites
                </div>
                <button
                  onClick={() => {
                    onLoadTemplate('coin');
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-slate-200 flex items-center justify-between"
                >
                  <span>Spinning Coin (6f)</span>
                  <span className="text-[10px] text-amber-400 font-mono">16×16</span>
                </button>
                <button
                  onClick={() => {
                    onLoadTemplate('hero');
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-slate-200 flex items-center justify-between"
                >
                  <span>Brave Knight (4f)</span>
                  <span className="text-[10px] text-teal-400 font-mono">32×32</span>
                </button>
                <button
                  onClick={() => {
                    onLoadTemplate('blank');
                    setShowTemplateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800/80 text-slate-200 flex items-center justify-between border-t border-slate-800/60 mt-0.5"
                >
                  <span>New Blank Canvas</span>
                  <span className="text-[10px] text-slate-400 font-mono">32×32</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800/80">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Grid */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-800/80">
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomFit}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fit to Screen"
            aria-label="Fit to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleGrid}
            className={`p-1.5 rounded transition-colors ${
              showGrid
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Pixel Grid (G)"
            aria-label="Toggle Pixel Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animation Preview Toggle */}
        <button
          onClick={onTogglePreview}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
            isPreviewOpen
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Animation Preview Window"
          aria-label="Toggle Animation Preview"
        >
          <Play className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      {/* Right: Mobile Sidebar toggle, Shortcuts & Export Action */}
      <div className="flex items-center gap-1.5">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`md:hidden p-1.5 rounded transition-colors ${
            isSidebarOpen
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Color Studio & Layers"
          aria-label="Toggle Color Studio & Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors hidden sm:inline-flex"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition-all shadow-sm shadow-teal-500/20 hover:shadow-teal-500/40 active:scale-95 cursor-pointer"
          title="Export Sprite Sheet, GIF, PNG, or JSON"
          aria-label="Export"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
