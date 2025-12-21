import { useState } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CanvasSticky } from './CanvasSticky';

const CanvasContent = () => {
  const { project, createCanvasInstance } = useStore();
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale] = useState(1);
  const [positionX] = useState(0);
  const [positionY] = useState(0);
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'library' && data.stickyId) {
        // Calculate position relative to canvas with zoom/pan
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left - positionX) / scale;
        const y = (e.clientY - rect.top - positionY) / scale;

        createCanvasInstance(data.stickyId, x, y);
      }
    } catch (error) {
      console.error('Failed to parse drop data:', error);
    }
  };

  return (
    <>
      {/* Zoom controls */}
      <div data-zoom-controls className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={() => zoomIn()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} className="text-gray-700" />
        </button>
        <button
          onClick={() => zoomOut()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} className="text-gray-700" />
        </button>
        <button
          onClick={() => resetTransform()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Reset View"
        >
          <Maximize2 size={18} className="text-gray-700" />
        </button>
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Canvas area */}
      <TransformComponent
        wrapperStyle={{ width: '100%', height: '100%' }}
        contentStyle={{ width: '100%', height: '100%' }}
      >
        <div
          data-canvas-content
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative ${
            isOver ? 'bg-blue-50' : 'bg-white'
          } transition-colors`}
          style={{
            width: '4000px',
            height: '3000px',
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
          }}
        >
          {/* Render all canvas instances */}
          {project.canvasInstances.map((instanceItem) => (
            <CanvasSticky
              key={instanceItem.id}
              instance={instanceItem}
              scale={scale}
            />
          ))}

          {/* Empty state */}
          {project.canvasInstances.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium mb-2">
                  Canvas is empty
                </p>
                <p className="text-sm">
                  Drag stickies from the library to start planning
                </p>
              </div>
            </div>
          )}
        </div>
      </TransformComponent>
    </>
  );
};

export const Canvas = () => {
  return (
    <div className="flex-1 relative bg-gray-100 overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={2}
        limitToBounds={false}
        centerOnInit={false}
        wheel={{ step: 0.1 }}
        panning={{ velocityDisabled: true }}
      >
        <CanvasContent />
      </TransformWrapper>
    </div>
  );
};
