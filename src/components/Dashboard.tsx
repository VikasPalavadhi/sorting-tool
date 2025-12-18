import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen, Calendar, StickyNote } from 'lucide-react';
import { getAllProjects, loadProject, deleteProject, migrateOldProjects, type ProjectMetadata } from '../store/projectStorage';
import { useStore } from '../store/useStore';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
}

export const Dashboard = ({ isOpen, onClose, onNewProject }: DashboardProps) => {
  const { loadProject: loadProjectToStore, session } = useStore();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);

  useEffect(() => {
    if (isOpen) {
      refreshProjects();
    }
  }, [isOpen]);

  const refreshProjects = () => {
    // Migrate any old projects first
    migrateOldProjects();

    const allProjects = getAllProjects();

    // Filter projects to only show current user's projects
    const userProjects = session
      ? allProjects.filter(p => {
          // Load full project to check ownerId
          const fullProject = loadProject(p.id);
          return fullProject && fullProject.ownerId === session.userId;
        })
      : allProjects;

    // Sort by updated date (most recent first)
    const sorted = userProjects.sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(sorted);
  };

  const handleLoadProject = (projectId: string) => {
    const project = loadProject(projectId);
    if (project) {
      loadProjectToStore(project);
      onClose();
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteProject(projectId);
      refreshProjects();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">My Projects</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FolderOpen size={64} className="mb-4" />
              <p className="text-lg font-medium mb-2">No projects yet</p>
              <p className="text-sm">Create your first project to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleLoadProject(project.id)}
                >
                  {/* Project Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {project.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id, project.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                      title="Delete project"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>

                  {/* Project Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <StickyNote size={14} />
                      <span>{project.stickyCount} stickies</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">•</span>
                      <span>{project.canvasCount} on canvas</span>
                    </div>
                  </div>

                  {/* Last Updated */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>

                  {/* Load indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-200 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-blue-600 font-medium">Click to open</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {projects.length} project{projects.length !== 1 ? 's' : ''} saved
          </p>
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>
    </div>
  );
};
