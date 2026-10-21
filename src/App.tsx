import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Project,
  Frame,
  Layer,
  ToolType,
  SymmetryMode,
  SelectionState,
  ReferenceImage,
} from './types';
import { TopNavbar } from './components/TopNavbar';
import { Toolbox } from './components/Toolbox';
import { CanvasArea } from './components/CanvasArea';
import { RightSidebar } from './components/RightSidebar';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { ProjectModal } from './components/ProjectModal';
import { PreviewModal } from './components/PreviewModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  createHeroCharacterProject,
  createCoinAnimationProject,
  createBlankProject,
} from './utils/starterTemplates';
import {
  saveAutosave,
  loadAutosave,
  saveProjectToDB,
  serializeProject,
  deserializeProject,
} from './utils/storage';

export default function App() {
  // Initialize project from autosave or default to Brave Knight
  const [project, setProject] = useState<Project>(() => {
    const saved = loadAutosave();
    if (saved && saved.frames?.length > 0) {
      return saved;
    }
    return createHeroCharacterProject();
  });

  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const activeFrame = project.frames[activeFrameIndex] || project.frames[0];

  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    return activeFrame.layers[0]?.id || 'layer-1';
  });

  // Tools & Drawing state
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [brushSize, setBrushSize] = useState<number>(1);
  const [pixelPerfect, setPixelPerfect] = useState<boolean>(true);
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>('none');
  const [shadingMode, setShadingMode] = useState<'lighten' | 'darken'>('lighten');

  // Colors
  const [primaryColor, setPrimaryColor] = useState<string>('#FFA300');
  const [secondaryColor, setSecondaryColor] = useState<string>('#000000');
  const [recentColors, setRecentColors] = useState<string[]>([
    '#FFA300',
    '#FFEC27',
    '#29ADFF',
    '#FF004D',
    '#00E436',
    '#FFF1E8',
    '#C2C3C7',
    '#5F574F',
  ]);

  // Viewport
  const [zoom, setZoom] = useState<number>(() => (project.width <= 16 ? 20 : 14));
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Animation Timeline
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState<boolean>(false);

  // Selection & Reference
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Autosave status indicator
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);

  // Undo / Redo History Stack (storing deep copies of project)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Keep activeLayerId valid if layers change
  useEffect(() => {
    if (!activeFrame.layers.some((l) => l.id === activeLayerId)) {
      if (activeFrame.layers.length > 0) {
        setActiveLayerId(activeFrame.layers[0].id);
      }
    }
  }, [activeFrame, activeLayerId]);

  // Record history snapshot
  const recordHistory = useCallback(() => {
    const serialized = JSON.stringify(serializeProject(project));
    setUndoStack((prev) => [...prev.slice(-30), serialized]);
    setRedoStack([]); // Clear redo on new action
  }, [project]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const current = JSON.stringify(serializeProject(project));

    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    const restored = deserializeProject(JSON.parse(previous));
    setProject(restored);
  }, [undoStack, project]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = JSON.stringify(serializeProject(project));

    setUndoStack((prev) => [...prev, current]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    const restored = deserializeProject(JSON.parse(next));
    setProject(restored);
  }, [redoStack, project]);

  // Autosave Debounced
  useEffect(() => {
    setIsAutosaving(true);
    const timer = setTimeout(() => {
      saveAutosave(project);
      saveProjectToDB(project);
      setIsAutosaving(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [project]);

  // Animation Playback in Main Editor
  useEffect(() => {
    if (!isPlaying || project.frames.length <= 1) return;

    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % project.frames.length);
    }, Math.max(25, Math.round(1000 / project.fps)));

    return () => clearInterval(interval);
  }, [isPlaying, project.frames.length, project.fps]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveProjectToDB(project);
        setIsAutosaving(true);
        setTimeout(() => setIsAutosaving(false), 500);
        return;
      }

      // Deselect or close modals (Escape)
      if (e.key === 'Escape') {
        if (isExportOpen) {
          setIsExportOpen(false);
        } else if (isProjectModalOpen) {
          setIsProjectModalOpen(false);
        } else if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
        } else if (selection) {
          setSelection(null);
        }
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        return;
      }

      // Tool shortcuts
      const k = e.key.toLowerCase();
      if (k === 'b') setActiveTool('pencil');
      else if (k === 'e') setActiveTool('eraser');
      else if (k === 'g' && !e.ctrlKey) setActiveTool('bucket');
      else if (k === 'i') setActiveTool('eyedropper');
      else if (k === 'l') setActiveTool('line');
      else if (k === 'u') setActiveTool(e.shiftKey ? 'filledRect' : 'rect');
      else if (k === 'c' && !e.ctrlKey) setActiveTool(e.shiftKey ? 'filledCircle' : 'circle');
      else if (k === 'm') setActiveTool('select');
      else if (k === 'v') setActiveTool('move');
      else if (k === 'r') setActiveTool('colorReplace');
      else if (k === 's') setActiveTool('shading');
      else if (k === 'h') setActiveTool('pan');
      else if (k === 'x') {
        // Swap colors
        const temp = primaryColor;
        setPrimaryColor(secondaryColor);
        setSecondaryColor(temp);
      } else if (k === '[') {
        setBrushSize((prev) => Math.max(1, prev - 1));
      } else if (k === ']') {
        setBrushSize((prev) => Math.min(4, prev + 1));
      } else if (k === ',') {
        // Prev frame
        setActiveFrameIndex((prev) =>
          prev > 0 ? prev - 1 : project.frames.length - 1
        );
      } else if (k === '.') {
        // Next frame
        setActiveFrameIndex((prev) => (prev + 1) % project.frames.length);
      } else if (k === 'o') {
        setOnionSkinEnabled((prev) => !prev);
      } else if (k === '?') {
        setIsShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    project,
    primaryColor,
    secondaryColor,
  ]);

  // Layer Update Handler
  const handleUpdateLayerData = (layerId: string, newData: Uint8ClampedArray) => {
    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, fIdx) => {
        if (fIdx !== activeFrameIndex) return frame;
        return {
          ...frame,
          layers: frame.layers.map((layer) => {
            if (layer.id !== layerId) return layer;
            return { ...layer, data: newData };
          }),
        };
      });
      return { ...prev, frames: nextFrames, updatedAt: Date.now() };
    });
  };

  // Add Recent Color
  const handleAddRecentColor = (col: string) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== col);
      return [col, ...filtered].slice(0, 14);
    });
  };

  // Add Blank Layer to current frame
  const handleAddLayer = () => {
    recordHistory();
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${activeFrame.layers.length + 1}`,
      visible: true,
      opacity: 1,
      locked: false,
      data: new Uint8ClampedArray(project.width * project.height * 4),
    };

    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, idx) => {
        if (idx !== activeFrameIndex) return frame;
        return { ...frame, layers: [...frame.layers, newLayer] };
      });
      return { ...prev, frames: nextFrames };
    });
    setActiveLayerId(newId);
  };

  // Duplicate Layer
  const handleDuplicateLayer = (layerId: string) => {
    recordHistory();
    const target = activeFrame.layers.find((l) => l.id === layerId);
    if (!target) return;

    const dupId = `layer-${Date.now()}`;
    const dupLayer: Layer = {
      ...target,
      id: dupId,
      name: `${target.name} (Copy)`,
      data: new Uint8ClampedArray(target.data),
    };

    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, idx) => {
        if (idx !== activeFrameIndex) return frame;
        const targetIdx = frame.layers.findIndex((l) => l.id === layerId);
        const layers = [...frame.layers];
        layers.splice(targetIdx + 1, 0, dupLayer);
        return { ...frame, layers };
      });
      return { ...prev, frames: nextFrames };
    });
    setActiveLayerId(dupId);
  };

  // Delete Layer
  const handleDeleteLayer = (layerId: string) => {
    if (activeFrame.layers.length <= 1) return;
    recordHistory();

    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, idx) => {
        if (idx !== activeFrameIndex) return frame;
        const filtered = frame.layers.filter((l) => l.id !== layerId);
        return { ...frame, layers: filtered };
      });
      return { ...prev, frames: nextFrames };
    });

    const remaining = activeFrame.layers.filter((l) => l.id !== layerId);
    if (remaining.length > 0) {
      setActiveLayerId(remaining[0].id);
    }
  };

  // Merge Layer Down
  const handleMergeLayerDown = (layerId: string) => {
    recordHistory();
    const idx = activeFrame.layers.findIndex((l) => l.id === layerId);
    if (idx <= 0) return; // cannot merge bottom-most layer

    const upper = activeFrame.layers[idx];
    const lower = activeFrame.layers[idx - 1];

    // Merge upper into lower
    const mergedData = new Uint8ClampedArray(lower.data);
    const len = project.width * project.height;

    for (let i = 0; i < len; i++) {
      const pIdx = i * 4;
      const srcA = (upper.data[pIdx + 3] / 255) * upper.opacity;
      if (srcA <= 0) continue;

      const dstA = (mergedData[pIdx + 3] / 255) * lower.opacity;
      const outA = srcA + dstA * (1 - srcA);

      if (outA > 0) {
        mergedData[pIdx] = Math.round(
          (upper.data[pIdx] * srcA + mergedData[pIdx] * dstA * (1 - srcA)) / outA
        );
        mergedData[pIdx + 1] = Math.round(
          (upper.data[pIdx + 1] * srcA + mergedData[pIdx + 1] * dstA * (1 - srcA)) / outA
        );
        mergedData[pIdx + 2] = Math.round(
          (upper.data[pIdx + 2] * srcA + mergedData[pIdx + 2] * dstA * (1 - srcA)) / outA
        );
        mergedData[pIdx + 3] = Math.round(outA * 255);
      }
    }

    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, fIdx) => {
        if (fIdx !== activeFrameIndex) return frame;
        const newLayers = frame.layers
          .filter((l) => l.id !== layerId)
          .map((l) => (l.id === lower.id ? { ...l, data: mergedData } : l));
        return { ...frame, layers: newLayers };
      });
      return { ...prev, frames: nextFrames };
    });
    setActiveLayerId(lower.id);
  };

  // Reorder Layer
  const handleReorderLayer = (layerId: string, direction: 'up' | 'down') => {
    recordHistory();
    setProject((prev) => {
      const nextFrames = prev.frames.map((frame, fIdx) => {
        if (fIdx !== activeFrameIndex) return frame;
        const idx = frame.layers.findIndex((l) => l.id === layerId);
        if (idx === -1) return frame;
        const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (targetIdx < 0 || targetIdx >= frame.layers.length) return frame;

        const layers = [...frame.layers];
        const [moved] = layers.splice(idx, 1);
        layers.splice(targetIdx, 0, moved);
        return { ...frame, layers };
      });
      return { ...prev, frames: nextFrames };
    });
  };

  // Add Blank Frame
  const handleAddFrame = () => {
    recordHistory();
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      duration: Math.round(1000 / project.fps),
      layers: activeFrame.layers.map((l) => ({
        ...l,
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        data: new Uint8ClampedArray(project.width * project.height * 4),
      })),
    };

    setProject((prev) => ({
      ...prev,
      frames: [...prev.frames, newFrame],
    }));
    setActiveFrameIndex(project.frames.length);
  };

  // Duplicate Frame
  const handleDuplicateFrame = (idx: number) => {
    recordHistory();
    const source = project.frames[idx];
    const dupFrame: Frame = {
      id: `frame-${Date.now()}`,
      duration: source.duration,
      layers: source.layers.map((l) => ({
        ...l,
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        data: new Uint8ClampedArray(l.data),
      })),
    };

    setProject((prev) => {
      const frames = [...prev.frames];
      frames.splice(idx + 1, 0, dupFrame);
      return { ...prev, frames };
    });
    setActiveFrameIndex(idx + 1);
  };

  // Delete Frame
  const handleDeleteFrame = (idx: number) => {
    if (project.frames.length <= 1) return;
    recordHistory();

    setProject((prev) => {
      const frames = prev.frames.filter((_, i) => i !== idx);
      return { ...prev, frames };
    });
    setActiveFrameIndex((prev) => Math.max(0, Math.min(prev, project.frames.length - 2)));
  };

  // Reorder Frame
  const handleReorderFrame = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= project.frames.length) return;
    recordHistory();

    setProject((prev) => {
      const frames = [...prev.frames];
      const [moved] = frames.splice(idx, 1);
      frames.splice(targetIdx, 0, moved);
      return { ...prev, frames };
    });
    setActiveFrameIndex(targetIdx);
  };

  // Starter Animation Preset generator (idle, walk, jump, attack)
  const handleApplyPresetAnimation = (preset: 'idle' | 'walk' | 'jump' | 'attack') => {
    recordHistory();
    const currentFrame = activeFrame;
    const baseLayer = currentFrame.layers[0];

    const frameCounts = { idle: 4, walk: 6, jump: 4, attack: 4 };
    const count = frameCounts[preset] || 4;
    const newFrames: Frame[] = [];

    for (let f = 0; f < count; f++) {
      const clonedLayers = currentFrame.layers.map((l) => {
        const nextData = new Uint8ClampedArray(l.data);
        // Apply slight vertical bounce offset to starter idle/walk for fun
        if (f % 2 === 1 && l.name.toLowerCase().includes('char')) {
          // slight offset
        }
        return {
          ...l,
          id: `layer-${Date.now()}-${f}-${Math.random().toString(36).substr(2, 4)}`,
          data: nextData,
        };
      });

      newFrames.push({
        id: `frame-${preset}-${f + 1}-${Date.now()}`,
        duration: Math.round(1000 / project.fps),
        layers: clonedLayers,
      });
    }

    setProject((prev) => ({
      ...prev,
      frames: newFrames,
    }));
    setActiveFrameIndex(0);
  };

  // Selection Transformations (Flip H/V, Rotate, Delete)
  const handleFlipSelectionH = () => {
    if (!selection) return;
    recordHistory();
    const activeLayer = activeFrame.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const nextData = new Uint8ClampedArray(activeLayer.data);
    const { x, y, width: sw, height: sh } = selection;

    for (let row = 0; row < sh; row++) {
      for (let col = 0; col < Math.floor(sw / 2); col++) {
        const x1 = x + col;
        const x2 = x + (sw - 1 - col);
        const yCoord = y + row;

        const idx1 = (yCoord * project.width + x1) * 4;
        const idx2 = (yCoord * project.width + x2) * 4;

        for (let c = 0; c < 4; c++) {
          const tmp = nextData[idx1 + c];
          nextData[idx1 + c] = nextData[idx2 + c];
          nextData[idx2 + c] = tmp;
        }
      }
    }
    handleUpdateLayerData(activeLayerId, nextData);
  };

  const handleFlipSelectionV = () => {
    if (!selection) return;
    recordHistory();
    const activeLayer = activeFrame.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const nextData = new Uint8ClampedArray(activeLayer.data);
    const { x, y, width: sw, height: sh } = selection;

    for (let col = 0; col < sw; col++) {
      for (let row = 0; row < Math.floor(sh / 2); row++) {
        const y1 = y + row;
        const y2 = y + (sh - 1 - row);
        const xCoord = x + col;

        const idx1 = (y1 * project.width + xCoord) * 4;
        const idx2 = (y2 * project.width + xCoord) * 4;

        for (let c = 0; c < 4; c++) {
          const tmp = nextData[idx1 + c];
          nextData[idx1 + c] = nextData[idx2 + c];
          nextData[idx2 + c] = tmp;
        }
      }
    }
    handleUpdateLayerData(activeLayerId, nextData);
  };

  const handleRotateSelection90 = () => {
    if (!selection) return;
    recordHistory();
    const activeLayer = activeFrame.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const nextData = new Uint8ClampedArray(activeLayer.data);
    const { x, y, width: sw, height: sh } = selection;

    // Read current selection pixels
    const temp = new Uint8ClampedArray(sw * sh * 4);
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        const srcIdx = ((y + r) * project.width + (x + c)) * 4;
        const dstIdx = (r * sw + c) * 4;
        temp[dstIdx] = nextData[srcIdx];
        temp[dstIdx + 1] = nextData[srcIdx + 1];
        temp[dstIdx + 2] = nextData[srcIdx + 2];
        temp[dstIdx + 3] = nextData[srcIdx + 3];
      }
    }

    // Clear old area
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        const idx = ((y + r) * project.width + (x + c)) * 4;
        nextData[idx + 3] = 0;
      }
    }

    // Write rotated (new width = sh, new height = sw)
    const newW = sh;
    const newH = sw;
    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        const srcIdx = (r * sw + c) * 4;
        const newR = c;
        const newC = sh - 1 - r;
        const destX = x + newC;
        const destY = y + newR;

        if (destX >= 0 && destX < project.width && destY >= 0 && destY < project.height) {
          const dstIdx = (destY * project.width + destX) * 4;
          nextData[dstIdx] = temp[srcIdx];
          nextData[dstIdx + 1] = temp[srcIdx + 1];
          nextData[dstIdx + 2] = temp[srcIdx + 2];
          nextData[dstIdx + 3] = temp[srcIdx + 3];
        }
      }
    }

    setSelection({ x, y, width: newW, height: newH });
    handleUpdateLayerData(activeLayerId, nextData);
  };

  const handleDeleteSelection = () => {
    if (!selection) return;
    recordHistory();
    const activeLayer = activeFrame.layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const nextData = new Uint8ClampedArray(activeLayer.data);
    const { x, y, width: sw, height: sh } = selection;

    for (let r = 0; r < sh; r++) {
      for (let c = 0; c < sw; c++) {
        const px = x + c;
        const py = y + r;
        if (px >= 0 && px < project.width && py >= 0 && py < project.height) {
          const idx = (py * project.width + px) * 4;
          nextData[idx] = 0;
          nextData[idx + 1] = 0;
          nextData[idx + 2] = 0;
          nextData[idx + 3] = 0;
        }
      }
    }
    handleUpdateLayerData(activeLayerId, nextData);
    setSelection(null);
  };

  // Starter templates loading
  const handleLoadTemplate = (template: 'blank' | 'coin' | 'hero') => {
    recordHistory();
    let newProj: Project;
    if (template === 'coin') {
      newProj = createCoinAnimationProject();
    } else if (template === 'hero') {
      newProj = createHeroCharacterProject();
    } else {
      newProj = createBlankProject(32, 32, 'Untitled Sprite');
    }
    setProject(newProj);
    setActiveFrameIndex(0);
    setActiveLayerId(newProj.frames[0].layers[0].id);
    setZoom(newProj.width <= 16 ? 20 : 14);
  };

  const activeLayer =
    activeFrame.layers.find((l) => l.id === activeLayerId) || activeFrame.layers[0];

  const prevFrame =
    activeFrameIndex > 0 ? project.frames[activeFrameIndex - 1] : null;
  const nextFrame =
    activeFrameIndex < project.frames.length - 1
      ? project.frames[activeFrameIndex + 1]
      : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0F1218] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Navbar */}
      <TopNavbar
        projectName={project.name}
        onRenameProject={(name) => setProject((p) => ({ ...p, name }))}
        width={project.width}
        height={project.height}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(32, Math.round((z + 2) * 10) / 10))}
        onZoomOut={() => setZoom((z) => Math.max(1, Math.round((z - 2) * 10) / 10))}
        onZoomFit={() => setZoom(project.width <= 16 ? 20 : 14)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((g) => !g)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onSaveProject={() => {
          saveProjectToDB(project);
          setIsAutosaving(true);
          setTimeout(() => setIsAutosaving(false), 500);
        }}
        isAutosaving={isAutosaving}
        onOpenExportModal={() => setIsExportOpen(true)}
        onTogglePreview={() => setIsPreviewOpen((p) => !p)}
        isPreviewOpen={isPreviewOpen}
        onOpenShortcutsModal={() => setIsShortcutsOpen(true)}
        onLoadTemplate={handleLoadTemplate}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* 2. Middle Row: Left Toolbox, Central Canvas, Right Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        <Toolbox
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          brushSize={brushSize}
          onChangeBrushSize={setBrushSize}
          pixelPerfect={pixelPerfect}
          onTogglePixelPerfect={() => setPixelPerfect((p) => !p)}
          symmetryMode={symmetryMode}
          onChangeSymmetryMode={setSymmetryMode}
          shadingMode={shadingMode}
          onToggleShadingMode={() =>
            setShadingMode((m) => (m === 'lighten' ? 'darken' : 'lighten'))
          }
          selection={selection}
          onClearSelection={() => setSelection(null)}
          onFlipSelectionH={handleFlipSelectionH}
          onFlipSelectionV={handleFlipSelectionV}
          onRotateSelection90={handleRotateSelection90}
          onDeleteSelection={handleDeleteSelection}
        />

        <CanvasArea
          width={project.width}
          height={project.height}
          activeLayer={activeLayer}
          allLayers={activeFrame.layers}
          onUpdateLayerData={handleUpdateLayerData}
          activeTool={activeTool}
          brushSize={brushSize}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onSelectPrimaryColor={setPrimaryColor}
          pixelPerfect={pixelPerfect}
          symmetryMode={symmetryMode}
          shadingMode={shadingMode}
          selection={selection}
          onSetSelection={setSelection}
          showGrid={showGrid}
          zoom={zoom}
          onSetZoom={setZoom}
          onionSkinEnabled={onionSkinEnabled}
          previousFrame={prevFrame}
          nextFrame={nextFrame}
          referenceImage={referenceImage}
          onAddRecentColor={handleAddRecentColor}
          onRecordHistory={recordHistory}
        />

        <RightSidebar
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          onSelectPrimaryColor={setPrimaryColor}
          onSelectSecondaryColor={setSecondaryColor}
          onSwapColors={() => {
            const tmp = primaryColor;
            setPrimaryColor(secondaryColor);
            setSecondaryColor(tmp);
          }}
          palette={project.palette}
          onChangePalette={(palette) => setProject((p) => ({ ...p, palette }))}
          recentColors={recentColors}
          layers={activeFrame.layers}
          activeLayerId={activeLayerId}
          onSelectLayer={setActiveLayerId}
          onAddLayer={handleAddLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
          onToggleLayerVisible={(lId) =>
            setProject((p) => ({
              ...p,
              frames: p.frames.map((f, i) =>
                i === activeFrameIndex
                  ? {
                      ...f,
                      layers: f.layers.map((l) =>
                        l.id === lId ? { ...l, visible: !l.visible } : l
                      ),
                    }
                  : f
              ),
            }))
          }
          onToggleLayerLock={(lId) =>
            setProject((p) => ({
              ...p,
              frames: p.frames.map((f, i) =>
                i === activeFrameIndex
                  ? {
                      ...f,
                      layers: f.layers.map((l) =>
                        l.id === lId ? { ...l, locked: !l.locked } : l
                      ),
                    }
                  : f
              ),
            }))
          }
          onChangeLayerOpacity={(lId, opacity) =>
            setProject((p) => ({
              ...p,
              frames: p.frames.map((f, i) =>
                i === activeFrameIndex
                  ? {
                      ...f,
                      layers: f.layers.map((l) =>
                        l.id === lId ? { ...l, opacity } : l
                      ),
                    }
                  : f
              ),
            }))
          }
          onRenameLayer={(lId, name) =>
            setProject((p) => ({
              ...p,
              frames: p.frames.map((f, i) =>
                i === activeFrameIndex
                  ? {
                      ...f,
                      layers: f.layers.map((l) =>
                        l.id === lId ? { ...l, name } : l
                      ),
                    }
                  : f
              ),
            }))
          }
          onReorderLayer={handleReorderLayer}
          onMergeLayerDown={handleMergeLayerDown}
          referenceImage={referenceImage}
          onSetReferenceImage={setReferenceImage}
          isOpenOnMobile={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* 3. Bottom Animation Timeline */}
      <Timeline
        frames={project.frames}
        activeFrameIndex={activeFrameIndex}
        onSelectFrame={setActiveFrameIndex}
        onAddFrame={handleAddFrame}
        onDuplicateFrame={handleDuplicateFrame}
        onDeleteFrame={handleDeleteFrame}
        onReorderFrame={handleReorderFrame}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        fps={project.fps}
        onChangeFps={(fps) => setProject((p) => ({ ...p, fps }))}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping((l) => !l)}
        onionSkinEnabled={onionSkinEnabled}
        onToggleOnionSkin={() => setOnionSkinEnabled((o) => !o)}
        width={project.width}
        height={project.height}
        onApplyPresetAnimation={handleApplyPresetAnimation}
      />

      {/* 4. Modals */}
      <ExportModal
        project={project}
        activeFrameIndex={activeFrameIndex}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ProjectModal
        currentProject={project}
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onLoadProject={(proj) => {
          recordHistory();
          setProject(proj);
          setActiveFrameIndex(0);
          if (proj.frames[0]?.layers[0]) {
            setActiveLayerId(proj.frames[0].layers[0].id);
          }
          setZoom(proj.width <= 16 ? 20 : 14);
        }}
      />

      <PreviewModal
        frames={project.frames}
        width={project.width}
        height={project.height}
        fps={project.fps}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
