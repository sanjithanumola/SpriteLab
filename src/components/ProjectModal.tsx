import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  FolderOpen,
  Trash2,
  Copy,
  Upload,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Project } from '../types';
import {
  listSavedProjects,
  loadProjectFromDB,
  deleteProjectFromDB,
  deserializeProject,
  saveProjectToDB,
} from '../utils/storage';
import {
  createBlankProject,
  createCoinAnimationProject,
  createHeroCharacterProject,
} from '../utils/starterTemplates';

interface ProjectModalProps {
  currentProject: Project;
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: Project) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  currentProject,
  isOpen,
  onClose,
  onLoadProject,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'saved' | 'import'>('new');
  const [savedList, setSavedList] = useState<
    Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      framesCount: number;
      updatedAt: number;
    }>
  >([]);

  // New Project Form State
  const [newWidth, setNewWidth] = useState<number>(32);
  const [newHeight, setNewHeight] = useState<number>(32);
  const [newName, setNewName] = useState<string>('New Sprite');
  const [starterTemplate, setStarterTemplate] = useState<'blank' | 'coin' | 'hero'>('blank');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSavedList = async () => {
    const list = await listSavedProjects();
    setSavedList(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSavedList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateNew = () => {
    let proj: Project;
    if (starterTemplate === 'coin') {
      proj = createCoinAnimationProject();
    } else if (starterTemplate === 'hero') {
      proj = createHeroCharacterProject();
    } else {
      proj = createBlankProject(newWidth, newHeight, newName || 'Untitled Sprite');
    }
    onLoadProject(proj);
    onClose();
  };

  const handleOpenSaved = async (id: string) => {
    const proj = await loadProjectFromDB(id);
    if (proj) {
      onLoadProject(proj);
      onClose();
    }
  };

  const handleDeleteSaved = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      await deleteProjectFromDB(id);
      refreshSavedList();
    }
  };

  const handleDuplicateSaved = async (id: string) => {
    const proj = await loadProjectFromDB(id);
    if (proj) {
      const duplicate: Project = {
        ...proj,
        id: `project-${Date.now()}`,
        name: `${proj.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProjectToDB(duplicate);
      refreshSavedList();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const restored = deserializeProject(parsed);
        onLoadProject(restored);
        onClose();
      } catch (err) {
        alert('Could not read project JSON file: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#14171F] border border-slate-700/80 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 bg-[#12151B] border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100">Project Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-[#161922] px-4 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'new'
                ? 'border-teal-400 text-teal-300 bg-[#14171F] rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'saved'
                ? 'border-teal-400 text-teal-300 bg-[#14171F] rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Saved Projects ({savedList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-teal-400 text-teal-300 bg-[#14171F] rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import File</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs text-slate-300">
          {/* TAB 1: NEW PROJECT */}
          {activeTab === 'new' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-200">Project Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Knight Character, Dragon, Sword"
                  className="bg-[#181B22] border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              {/* Starter Template Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-200">Start With Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'blank', title: 'Blank Canvas', desc: 'Custom dimensions' },
                    { id: 'coin', title: 'Spinning Coin', desc: '16×16 · 6 frames' },
                    { id: 'hero', title: 'Brave Knight', desc: '32×32 · 4 frames' },
                  ].map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setStarterTemplate(tmpl.id as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        starterTemplate === tmpl.id
                          ? 'bg-teal-500/15 border-teal-500/60 shadow-sm'
                          : 'bg-[#181B22] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-100">{tmpl.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{tmpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension Presets if Blank */}
              {starterTemplate === 'blank' && (
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-slate-200">Canvas Dimensions</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { w: 16, h: 16, label: '16×16 (Icon)' },
                      { w: 32, h: 32, label: '32×32 (Character)' },
                      { w: 64, h: 64, label: '64×64 (Detailed)' },
                      { w: 128, h: 128, label: '128×128 (Scene)' },
                    ].map((p) => (
                      <button
                        key={`${p.w}x${p.h}`}
                        onClick={() => {
                          setNewWidth(p.w);
                          setNewHeight(p.h);
                        }}
                        className={`p-2 rounded-lg border text-center transition-colors font-mono ${
                          newWidth === p.w && newHeight === p.h
                            ? 'bg-teal-500 text-slate-950 font-bold border-teal-400'
                            : 'bg-[#181B22] border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {p.w}×{p.h}
                      </button>
                    ))}
                  </div>

                  {/* Custom width & height */}
                  <div className="flex items-center gap-3 mt-1 bg-[#181B22] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Custom size:</span>
                    <div className="flex items-center gap-2 font-mono">
                      <input
                        type="number"
                        min={8}
                        max={256}
                        value={newWidth}
                        onChange={(e) => setNewWidth(Math.max(8, parseInt(e.target.value) || 8))}
                        className="w-16 bg-[#12151B] border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                      <span className="text-slate-500">×</span>
                      <input
                        type="number"
                        min={8}
                        max={256}
                        value={newHeight}
                        onChange={(e) => setNewHeight(Math.max(8, parseInt(e.target.value) || 8))}
                        className="w-16 bg-[#12151B] border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                      <span className="text-slate-400 text-[11px]">pixels</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateNew}
                className="mt-2 py-2.5 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          )}

          {/* TAB 2: SAVED PROJECTS */}
          {activeTab === 'saved' && (
            <div className="flex flex-col gap-2">
              {savedList.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No saved projects in local library yet.</p>
                  <p className="text-[11px] mt-1">Your work is automatically saved as you draw!</p>
                </div>
              ) : (
                savedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#181B22] border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-100 text-xs flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-teal-400">
                          {item.width}×{item.height}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {item.framesCount} frames
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenSaved(item.id)}
                        className="px-2.5 py-1.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 text-xs font-medium transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDuplicateSaved(item.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(item.id, item.name)}
                        className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: IMPORT FILE */}
          {activeTab === 'import' && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-xl bg-[#181B22]/50 text-center gap-3">
              <Upload className="w-10 h-10 text-teal-400" />
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Open .spritelab.json Project</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Upload an existing SpriteLab JSON file to restore all layers, frames, colors, and settings.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 py-2 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all cursor-pointer"
              >
                Choose Project File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
