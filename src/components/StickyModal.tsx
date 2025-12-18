import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface StickyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, color: string) => void;
  initialText?: string;
  initialColor?: string;
  title?: string;
}

const PRESET_COLORS = [
  '#FEF3C7', // Yellow
  '#DBEAFE', // Blue
  '#FCE7F3', // Pink
  '#D1FAE5', // Green
  '#E0E7FF', // Indigo
  '#FED7AA', // Orange
  '#E9D5FF', // Purple
  '#F3F4F6', // Gray
];

export const StickyModal = ({
  isOpen,
  onClose,
  onSave,
  initialText = '',
  initialColor = '#FEF3C7',
  title = 'Create Sticky',
}: StickyModalProps) => {
  const [text, setText] = useState(initialText);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    setText(initialText);
    setColor(initialColor);
  }, [initialText, initialColor, isOpen]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), color);
      setText('');
      setColor('#FEF3C7');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sticky Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter content block name (e.g., Hero Banner, Profit Rate)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => setColor(presetColor)}
                  className={`w-10 h-10 rounded-md border-2 transition-all ${
                    color === presetColor
                      ? 'border-blue-500 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-gray-700">
              Custom:
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <span className="text-sm text-gray-500 ml-2">{color}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded">⌘/Ctrl + Enter</kbd> to save
        </div>
      </div>
    </div>
  );
};
