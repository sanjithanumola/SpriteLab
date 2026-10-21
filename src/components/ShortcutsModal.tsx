import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'Drawing Tools', items: [
      { key: 'B', desc: 'Pencil Tool' },
      { key: 'E', desc: 'Eraser Tool' },
      { key: 'G', desc: 'Fill Bucket Tool' },
      { key: 'I', desc: 'Eyedropper Tool' },
      { key: 'L', desc: 'Line Tool' },
      { key: 'U', desc: 'Rectangle Tool' },
      { key: 'Shift + U', desc: 'Filled Rectangle' },
      { key: 'C', desc: 'Circle Tool' },
      { key: 'Shift + C', desc: 'Filled Circle' },
      { key: 'M', desc: 'Marquee Selection' },
      { key: 'V', desc: 'Move Pixels' },
      { key: 'R', desc: 'Color Replace Tool' },
      { key: 'S', desc: 'Shading Brush (Lighten/Darken)' },
    ]},
    { category: 'Colors & Navigation', items: [
      { key: 'X', desc: 'Swap Primary / Secondary Colors' },
      { key: 'G', desc: 'Toggle Pixel Grid' },
      { key: 'H / Space', desc: 'Pan View' },
      { key: 'Mouse Wheel', desc: 'Zoom in / out centered at cursor' },
      { key: '[ / ]', desc: 'Decrease / Increase brush size' },
    ]},
    { category: 'History & Editing', items: [
      { key: 'Ctrl + Z', desc: 'Undo stroke / action' },
      { key: 'Ctrl + Y / Shift+Z', desc: 'Redo stroke / action' },
      { key: 'Ctrl + S', desc: 'Save Project to local library' },
      { key: 'Escape', desc: 'Deselect current selection' },
      { key: 'Delete', desc: 'Clear selected pixels' },
    ]},
    { category: 'Animation Timeline', items: [
      { key: 'Space', desc: 'Play / Pause Animation' },
      { key: ', (Comma)', desc: 'Previous frame' },
      { key: '. (Period)', desc: 'Next frame' },
      { key: 'Shift + D', desc: 'Duplicate current frame' },
      { key: 'O', desc: 'Toggle Onion Skinning' },
    ]},
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#14171F] border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-12 bg-[#12151B] border-b border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-slate-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5 text-xs">
          {shortcuts.map((cat) => (
            <div key={cat.category} className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-teal-400">
                {cat.category}
              </span>
              <div className="grid grid-cols-1 gap-1.5 bg-[#181B22] p-2.5 rounded-lg border border-slate-800/80">
                {cat.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-0.5">
                    <span className="text-slate-300">{item.desc}</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-teal-300 font-semibold shadow-inner">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
