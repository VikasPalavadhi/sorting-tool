import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  currentProjectName: string;
  isExistingProject: boolean; // Whether this is a saved project
  onSave: (projectName: string) => void;
  onSaveAs: (projectName: string) => void;
  onClose: () => void;
}

export const SaveProjectModal = ({ isOpen, currentProjectName, isExistingProject, onSave, onSaveAs, onClose }: SaveProjectModalProps) => {
  const [projectName, setProjectName] = useState(currentProjectName);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'save' | 'saveAs'>(isExistingProject ? 'save' : 'saveAs');

  const handleSave = () => {
    if (mode === 'save' && isExistingProject) {
      // Direct save - no name change
      onSave(currentProjectName);
      onClose();
      return;
    }

    // Save As - validate name
    const trimmedName = projectName.trim();

    if (!trimmedName) {
      setError('Project name cannot be empty');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Project name must be at least 3 characters');
      return;
    }

    if (mode === 'save') {
      onSave(trimmedName);
    } else {
      onSaveAs(trimmedName);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Save className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Save Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Save mode selector for existing projects */}
          {isExistingProject && (
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setMode('save')}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  mode === 'save'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Save
              </button>
              <button
                onClick={() => setMode('saveAs')}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  mode === 'saveAs'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Save As New
              </button>
            </div>
          )}

          {mode === 'save' && isExistingProject ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-gray-700">
                Save changes to <span className="font-semibold">"{currentProjectName}"</span>
              </p>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter project name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {mode === 'saveAs' ? 'This will create a new project copy.' : 'This will save your project to the dashboard.'}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Save size={18} />
            {mode === 'save' && isExistingProject ? 'Save Changes' : mode === 'saveAs' ? 'Save As New' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  );
};
