import { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen, Calendar, StickyNote, LogOut } from 'lucide-react';
import { getAllProjects, loadProject, deleteProject, migrateOldProjects, type ProjectMetadata } from '../store/projectStorage';
import { apiGetAllBoards, apiGetBoard, apiDeleteBoard } from '../services/apiService';
import { useStore } from '../store/useStore';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  showAsMainScreen?: boolean; // When true, shows logout button instead of close
}

export const Dashboard = ({ isOpen, onClose, onNewProject, showAsMainScreen = false }: DashboardProps) => {
  const { loadProject: loadProjectToStore, session, logout } = useStore();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);

  useEffect(() => {
    if (isOpen) {
      refreshProjects();
    }
  }, [isOpen, session?.userId]);

  const refreshProjects = async () => {
    console.log('🔄 Dashboard: Refreshing projects');
    console.log('👤 Current session:', session);

    // Try to fetch from database first
    try {
      const dbBoards = await apiGetAllBoards();
      console.log('📊 Boards from database:', dbBoards);

      if (dbBoards && dbBoards.length > 0) {
        // Convert to ProjectMetadata format
        const boardMetadata = dbBoards.map(board => ({
          id: board.id,
          name: board.name,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          stickyCount: board.stickyCount || 0,
          canvasCount: board.canvasCount || 0,
          ownerId: board.ownerId,
          ownerUsername: board.ownerUsername
        }));

        setProjects(boardMetadata);
        return;
      }
    } catch (error) {
      console.error('❌ Failed to fetch boards from database:', error);
    }

    // Fallback to localStorage
    console.log('💾 Falling back to localStorage');

    // Migrate any old projects first
    migrateOldProjects();

    const allProjects = getAllProjects();
    console.log('📋 All projects from localStorage:', allProjects);

    // Filter projects to only show current user's projects
    const userProjects = session
      ? allProjects.filter(p => {
          console.log(`🔍 Checking project ${p.name}:`, {
            projectOwnerId: p.ownerId,
            sessionUserId: session.userId,
            match: p.ownerId === session.userId
          });
          return p.ownerId === session.userId;
        })
      : allProjects;

    console.log('✅ User projects after filter:', userProjects);

    // Sort by updated date (most recent first)
    const sorted = userProjects.sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(sorted);
  };

  const handleLoadProject = async (projectId: string) => {
    try {
      // Try to load from database first
      const dbProject = await apiGetBoard(projectId);

      if (dbProject) {
        console.log('📊 Loaded project from database:', dbProject);

        // Update the URL with the boardId
        const newUrl = `${window.location.pathname}?boardId=${dbProject.boardId}`;
        window.history.replaceState({}, '', newUrl);

        // Load the project into store
        loadProjectToStore(dbProject);

        onClose();

        // Reload page to properly initialize WebSocket connection with new boardId
        window.location.reload();
        return;
      }
    } catch (error) {
      console.error('❌ Failed to load project from database:', error);
    }

    // Fallback to localStorage
    const project = loadProject(projectId);
    if (project) {
      // Generate a new boardId if project doesn't have one
      const generateBoardId = () => `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const boardId = project.boardId || generateBoardId();

      // Update the URL with the new boardId
      const newUrl = `${window.location.pathname}?boardId=${boardId}`;
      window.history.replaceState({}, '', newUrl);

      // Load the project into store
      loadProjectToStore(project);

      // If boardId was newly generated, we need to ensure it's saved
      if (!project.boardId && session) {
        const { setBoardId } = useStore.getState();
        setBoardId(boardId, session.userId, session.username);
      }

      onClose();

      // Reload page to properly initialize WebSocket connection with new boardId
      window.location.reload();
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
      // Delete from database
      try {
        const success = await apiDeleteBoard(projectId);
        if (success) {
          console.log('✅ Board deleted from database');
        }
      } catch (error) {
        console.error('❌ Failed to delete from database:', error);
      }

      // Also delete from localStorage
      deleteProject(projectId);

      // Refresh the list
      refreshProjects();
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      // Clear URL params to prevent next user from joining this board
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center gap-2">
            <FolderOpen className="text-blue-600" size={20} />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">My Boards</h2>
          </div>
          <div className="flex items-center gap-2">
            {showAsMainScreen ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
                <span className="text-sm">Logout</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400">
              <FolderOpen size={48} className="mb-4 sm:w-16 sm:h-16" />
              <p className="text-base sm:text-lg font-medium mb-2">No boards yet</p>
              <p className="text-xs sm:text-sm">Create your first board to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleLoadProject(project.id)}
                >
                  {/* Board Name */}
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
                      title="Delete board"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>

                  {/* Board Stats */}
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
            {projects.length} board{projects.length !== 1 ? 's' : ''} saved
          </p>
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Board
          </button>
        </div>
      </div>
    </div>
  );
};
