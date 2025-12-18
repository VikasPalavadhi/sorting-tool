import { useState } from 'react';
import { Plus, Search, Edit2, Copy, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StickyModal } from './StickyModal';
import type { Sticky } from '../types';

const LibrarySticky = ({ sticky }: { sticky: Sticky }) => {
  const { updateSticky, deleteSticky, duplicateSticky } = useStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'library',
      stickyId: sticky.id,
    }));
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`relative group p-3 rounded-md shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
        }`}
        style={{ backgroundColor: sticky.color }}
      >
        <div className="text-sm font-medium text-gray-800 pr-8 break-words">
          {sticky.text}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditModalOpen(true);
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-gray-100 transition-colors"
            title="Edit"
          >
            <Edit2 size={14} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateSticky(sticky.id);
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-gray-100 transition-colors"
            title="Duplicate"
          >
            <Copy size={14} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this sticky?')) {
                deleteSticky(sticky.id);
              }
            }}
            className="p-1 bg-white rounded shadow-sm hover:bg-red-100 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      </div>

      <StickyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(text, color) => updateSticky(sticky.id, { text, color })}
        initialText={sticky.text}
        initialColor={sticky.color}
        title="Edit Sticky"
      />
    </>
  );
};

export const Library = () => {
  const { project, createSticky } = useStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStickies = project.stickies.filter((sticky) =>
    sticky.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Library</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus size={16} />
              New Sticky
            </button>
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stickies..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredStickies.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              {searchQuery ? (
                <p className="text-sm">No stickies match your search</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">No stickies yet</p>
                  <p className="text-xs text-gray-400">
                    Click "New Sticky" to create your first content block
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">
                {filteredStickies.length} sticky{filteredStickies.length !== 1 ? 's' : ''}
              </div>
              {filteredStickies.map((sticky) => (
                <LibrarySticky key={sticky.id} sticky={sticky} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white text-xs text-gray-500">
          <p>💡 Drag stickies to the canvas to place them</p>
        </div>
      </div>

      <StickyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={createSticky}
      />
    </>
  );
};
