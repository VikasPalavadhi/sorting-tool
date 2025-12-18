import { useState } from 'react';
import { X, Save, Copy } from 'lucide-react';

interface SaveProjectModalProps {
  isOpen: boolean;
  currentProjectName: string;
  isExistingProject: boolean; // Whether this is a saved project
  onSave: (projectName: string) => void;
  onSaveAs: (projectName: string) => void;
  onClose: () => void;
}

export const SaveProjectModal = ({
  isOpen,
  currentProjectName,
  isExistingProject,
  onSave,
  onSaveAs,
  onClose
}: SaveProjectModalProps) => {
  const [showNameInput, setShowNameInput] = useState(!isExistingProject);
  const [projectName, setProjectName] = useState(currentProjectName);
  const [error, setError] = useState('');

  const handleDirectSave = () => {
    // Save to existing project without asking for name
    onSave(currentProjectName);
    onClose();
  };

  const handleSaveAsNew = () => {
    // Validate name
    const trimmedName = projectName.trim();

    if (!trimmedName) {
      setError('Project name cannot be empty');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Project name must be at least 3 characters');
      return;
    }

    onSaveAs(trimmedName);
    onClose();
  };

  const handleSaveNewProject = () => {
    // For new projects, validate and save
    const trimmedName = projectName.trim();

    if (!trimmedName) {
      setError('Project name cannot be empty');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Project name must be at least 3 characters');
      return;
    }

    onSave(trimmedName);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showNameInput) {
        isExistingProject ? handleSaveAsNew() : handleSaveNewProject();
      }
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
          {isExistingProject && !showNameInput ? (
            // Existing project - show two button options
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Current project: <span className="font-semibold text-gray-800">"{currentProjectName}"</span>
              </p>

              <button
                onClick={handleDirectSave}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Save size={18} />
                Save
              </button>

              <button
                onClick={() => setShowNameInput(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Copy size={18} />
                Save As New
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                "Save" will update the current project. "Save As New" will create a copy.
              </p>
            </div>
          ) : (
            // New project or Save As New - show name input
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isExistingProject ? 'New Project Name' : 'Project Name'}
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
                {isExistingProject
                  ? 'This will create a new project copy with a different name.'
                  : 'Choose a name for your project (min 3 characters).'}
              </p>

              <div className="flex gap-3 mt-6">
                {isExistingProject && (
                  <button
                    onClick={() => {
                      setShowNameInput(false);
                      setError('');
                      setProjectName(currentProjectName);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={isExistingProject ? handleSaveAsNew : handleSaveNewProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  {isExistingProject ? 'Save As New' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer - only show cancel if not in two-button mode */}
        {(!isExistingProject || showNameInput) && (
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
