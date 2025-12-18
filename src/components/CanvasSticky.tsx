import { useState, useRef, useEffect } from 'react';
import { Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { websocketService } from '../services/websocketService';
import type { CanvasInstance } from '../types';

interface CanvasStickyProps {
  instance: CanvasInstance;
  scale: number;
}

export const CanvasSticky = ({ instance, scale }: CanvasStickyProps) => {
  const { project, updateCanvasInstance, deleteCanvasInstance, duplicateCanvasInstance, session, boardId, stickyActivities } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const stickyRef = useRef<HTMLDivElement>(null);

  const sticky = project.stickies.find((s) => s.id === instance.stickyId);
  if (!sticky) return null;

  const displayText = instance.overriddenText || sticky.text;

  // Check if another user is currently moving this sticky
  const activity = stickyActivities.get(instance.id);
  const isBeingMovedByOther = activity && activity.userId !== session?.userId;

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle, .actions')) return;

    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - instance.x * scale,
      y: e.clientY - instance.y * scale,
    });

    // Broadcast activity to other users
    if (boardId && session && websocketService.isConnected()) {
      websocketService.emit('sticky:activity', {
        boardId,
        instanceId: instance.id,
        action: 'moving',
        username: session.username,
        userId: session.userId
      });
    }

    // Bring to front
    const maxZ = project.canvasInstances.reduce(
      (max, ci) => Math.max(max, ci.zIndex),
      0
    );
    if (instance.zIndex < maxZ) {
      updateCanvasInstance(instance.id, { zIndex: maxZ + 1 });
    }
  };

  // Handle resize
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: instance.width,
      height: instance.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = (e.clientX - dragStart.x) / scale;
        const newY = (e.clientY - dragStart.y) / scale;
        updateCanvasInstance(instance.id, { x: newX, y: newY });
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(100, resizeStart.width + deltaX / scale);
        const newHeight = Math.max(60, resizeStart.height + deltaY / scale);
        updateCanvasInstance(instance.id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        // Clear activity when user stops moving/resizing
        if (boardId && websocketService.isConnected()) {
          websocketService.emit('sticky:activity:clear', {
            boardId,
            instanceId: instance.id
          });
        }
      }
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, instance, scale, updateCanvasInstance]);

  const handleBringForward = () => {
    const maxZ = project.canvasInstances.reduce(
      (max, ci) => Math.max(max, ci.zIndex),
      0
    );
    updateCanvasInstance(instance.id, { zIndex: maxZ + 1 });
  };

  const handleSendBackward = () => {
    const minZ = project.canvasInstances.reduce(
      (min, ci) => Math.min(min, ci.zIndex),
      Infinity
    );
    updateCanvasInstance(instance.id, { zIndex: Math.max(0, minZ - 1) });
  };

  return (
    <div
      ref={stickyRef}
      onMouseDown={handleMouseDown}
      className={`absolute rounded-md shadow-lg border-2 ${
        isBeingMovedByOther ? 'border-blue-500 border-4' : 'border-gray-300'
      } group ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${isResizing ? 'select-none' : ''}`}
      style={{
        left: `${instance.x}px`,
        top: `${instance.y}px`,
        width: `${instance.width}px`,
        height: `${instance.height}px`,
        backgroundColor: sticky.color,
        zIndex: instance.zIndex,
      }}
    >
      {/* Activity Indicator - shows when another user is moving this sticky */}
      {isBeingMovedByOther && activity && (
        <div className="absolute -top-7 left-0 right-0 flex justify-center z-10">
          <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="font-medium">{activity.username} is moving...</span>
          </div>
        </div>
      )}

      <div className="p-3 h-full flex items-center justify-center text-center overflow-hidden">
        <div className="text-sm font-medium text-gray-800 break-words">
          {displayText}
        </div>
      </div>

      {/* Actions (visible on hover) - positioned close to sticky */}
      <div className="actions absolute -top-9 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-white rounded shadow-md flex gap-1 p-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBringForward();
            }}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Bring Forward"
          >
            <ArrowUp size={14} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSendBackward();
            }}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Send Backward"
          >
            <ArrowDown size={14} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateCanvasInstance(instance.id);
            }}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Duplicate"
          >
            <Copy size={14} className="text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteCanvasInstance(instance.id);
            }}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} className="text-red-600" />
          </button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400"></div>
      </div>

      {/* Z-index indicator (subtle) */}
      <div className="absolute top-1 left-1 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
        z:{instance.zIndex}
      </div>
    </div>
  );
};
