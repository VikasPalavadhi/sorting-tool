import { useState } from 'react';
import { Edit3, Sparkles, FileDown, Save, FolderOpen, Plus, LogOut, Share2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AIModal } from './AIModal';
import { SaveProjectModal } from './SaveProjectModal';
import { Dashboard } from './Dashboard';
import { CollaborationStatus } from './CollaborationStatus';
import { saveProject, isProjectSaved, saveProjectAs, getAllProjects } from '../store/projectStorage';
import { apiCreateBoard, apiSaveBoardState, apiGetBoard, apiGetBoardByBoardId } from '../services/apiService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const Toolbar = () => {
  const { project, updateProjectName, logout, isOwner, boardId, session } = useStore();

  // Copy board URL function (not using hook to avoid duplicate subscription)
  const copyBoardUrl = () => {
    if (!boardId) {
      alert('No board ID available');
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?boardId=${boardId}`;

    navigator.clipboard.writeText(url).then(
      () => {
        alert('Board link copied to clipboard!\n\nShare this link with others to collaborate.');
      },
      (err) => {
        console.error('Failed to copy:', err);
        alert(`Failed to copy link. URL: ${url}`);
      }
    );
  };
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const handleSaveProject = async (name: string) => {
    // Update project name if changed
    if (name !== project.name) {
      updateProjectName(name);
    }
    // Ensure owner info is set
    const updatedProject = {
      ...project,
      name,
      updatedAt: Date.now(),
      ownerId: project.ownerId || session?.userId,
      ownerUsername: project.ownerUsername || session?.username,
    };

    // Save to localStorage for local caching
    saveProject(updatedProject);

    // Also save to database
    try {
      // Convert data format from camelCase to snake_case for database
      const dbStickies = updatedProject.stickies.map(s => ({
        id: s.id,
        text: s.text,
        color: s.color,
        created_at: s.createdAt
      }));

      const dbInstances = updatedProject.canvasInstances.map(ci => ({
        id: ci.id,
        sticky_id: ci.stickyId,
        x: ci.x,
        y: ci.y,
        width: ci.width,
        height: ci.height,
        z_index: ci.zIndex,
        overridden_text: ci.overriddenText
      }));

      // Check if board exists in database
      let dbBoardId = updatedProject.id;
      let existingBoard = null;

      // First, try to find by database ID (if it's numeric)
      const isDatabaseId = updatedProject.id && /^\d+$/.test(updatedProject.id);
      if (isDatabaseId) {
        existingBoard = await apiGetBoard(updatedProject.id);
      }

      // If not found by ID, try to find by boardId (collaboration ID)
      if (!existingBoard && updatedProject.boardId) {
        existingBoard = await apiGetBoardByBoardId(updatedProject.boardId);
        if (existingBoard) {
          console.log('✅ Found existing board by boardId:', existingBoard.id);
          dbBoardId = existingBoard.id;
        }
      }

      // If board still doesn't exist, create it
      if (!existingBoard) {
        console.log('⚠️ Board not found in database, creating...');

        // Ensure we have a boardId (for collaboration)
        const collaborationBoardId = updatedProject.boardId ||
          `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const newBoard = await apiCreateBoard(updatedProject.name, collaborationBoardId);

        if (newBoard) {
          dbBoardId = newBoard.id;
          console.log('✅ Board created in database:', newBoard);

          // Update the local project with the new database ID and boardId
          const { loadProject } = useStore.getState();
          loadProject({
            ...updatedProject,
            id: newBoard.id,
            boardId: collaborationBoardId
          });
        } else {
          throw new Error('Failed to create board in database');
        }
      }

      // Now save the board state
      await apiSaveBoardState(
        dbBoardId,
        dbStickies,
        dbInstances
      );
      console.log('✅ Board saved to database');
    } catch (error) {
      console.error('❌ Failed to save to database:', error);
      alert('Warning: Board saved locally but failed to sync to database');
    }

    setIsSaveModalOpen(false);
  };

  const handleSaveAsProject = async (name: string) => {
    // Generate new IDs for the duplicate
    const generateBoardId = () => `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newBoardId = generateBoardId();

    const projectWithOwner = {
      ...project,
      ownerId: session?.userId,
      ownerUsername: session?.username,
    };

    // Save locally first
    const newProject = saveProjectAs(projectWithOwner, name);

    // Create in database
    try {
      const dbBoard = await apiCreateBoard(name, newBoardId);
      if (dbBoard) {
        console.log('✅ New board created in database:', dbBoard);

        // Save the stickies and instances (convert to database format)
        const dbStickies = newProject.stickies.map(s => ({
          id: s.id,
          text: s.text,
          color: s.color,
          created_at: s.createdAt
        }));

        const dbInstances = newProject.canvasInstances.map(ci => ({
          id: ci.id,
          sticky_id: ci.stickyId,
          x: ci.x,
          y: ci.y,
          width: ci.width,
          height: ci.height,
          z_index: ci.zIndex,
          overridden_text: ci.overriddenText
        }));

        await apiSaveBoardState(
          dbBoard.id,
          dbStickies,
          dbInstances
        );
      }
    } catch (error) {
      console.error('❌ Failed to create board in database:', error);
    }

    // Load the new project into the store
    const { loadProject } = useStore.getState();
    loadProject(newProject);
    setIsSaveModalOpen(false);
  };

  const handleNewProject = async () => {
    // Ask for board name
    const boardName = prompt('Enter new board name:');

    if (!boardName || boardName.trim().length < 3) {
      if (boardName !== null) {
        alert('Board name must be at least 3 characters');
      }
      return;
    }

    // Create new board with the given name
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const generateBoardId = () => `board-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    // Create a new boardId for this board
    const newBoardId = generateBoardId();

    console.log('🆕 Creating new board:', boardName);
    console.log('📝 Current session:', session);

    // Create in database first
    let dbBoardId = generateId();
    try {
      const dbBoard = await apiCreateBoard(boardName.trim(), newBoardId);
      if (dbBoard) {
        dbBoardId = dbBoard.id;
        console.log('✅ Board created in database:', dbBoard);
      }
    } catch (error) {
      console.error('❌ Failed to create board in database:', error);
      alert('Warning: Could not save to database. Board will be local only.');
    }

    const newProject = {
      id: dbBoardId,
      name: boardName.trim(),
      stickies: [],
      canvasInstances: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: session?.userId,
      ownerUsername: session?.username,
      boardId: newBoardId,
    };

    // Save it to localStorage
    saveProject(newProject);
    console.log('💾 Board saved to localStorage with boardId:', newBoardId);

    // Verify it was saved
    const allProjects = getAllProjects();
    console.log('📋 All saved boards:', allProjects);

    // Load the project into the store (updates UI immediately)
    const { loadProject, setBoardId } = useStore.getState();
    loadProject(newProject);

    // Set the boardId in store
    if (session) {
      setBoardId(newBoardId, session.userId, session.username);
    }

    // Update URL and reload to properly initialize WebSocket connection
    const newUrl = `${window.location.pathname}?boardId=${newBoardId}`;
    window.history.replaceState({}, '', newUrl);

    // Reload page to properly initialize WebSocket connection with new boardId
    window.location.reload();
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      // Clear URL params to prevent next user from joining this board
      window.history.replaceState({}, '', window.location.pathname);
      window.location.reload();
    }
  };

  const handleExportPDF = async () => {
    if (project.canvasInstances.length === 0) {
      alert('Canvas is empty. Please add some stickies first.');
      return;
    }

    setIsExportingPDF(true);

    try {
      // Find the canvas container and UI elements
      const canvasElement = document.querySelector('[data-canvas-content]') as HTMLElement;
      const zoomControls = document.querySelector('[data-zoom-controls]') as HTMLElement;

      if (!canvasElement) {
        throw new Error('Canvas element not found');
      }

      // Store original styles
      const originalBgImage = canvasElement.style.backgroundImage;
      const originalBgSize = canvasElement.style.backgroundSize;

      // Hide UI elements and grid for PDF
      if (zoomControls) zoomControls.style.display = 'none';
      canvasElement.style.backgroundImage = 'none';
      canvasElement.style.backgroundSize = 'auto';

      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the canvas as an image
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
      });

      // Restore UI elements and grid
      if (zoomControls) zoomControls.style.display = '';
      canvasElement.style.backgroundImage = originalBgImage;
      canvasElement.style.backgroundSize = originalBgSize;

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add image to PDF (split into pages if needed)
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`${project.name.replace(/\s+/g, '-').toLowerCase()}-canvas.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSaveName = () => {
    if (projectName.trim() && projectName !== project.name) {
      updateProjectName(projectName.trim());
    } else {
      setProjectName(project.name);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    }
    if (e.key === 'Escape') {
      setProjectName(project.name);
      setIsEditingName(false);
    }
  };


  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {isEditingName ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="text-xl font-semibold text-gray-800 border-b-2 border-blue-500 focus:outline-none px-1"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-xl font-semibold text-gray-800">{project.name}</h1>
            <button
              onClick={() => setIsEditingName(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
              title="Edit board name"
            >
              <Edit3 size={16} className="text-gray-500" />
            </button>
          </div>
        )}

        <div className="text-sm text-gray-500">
          {project.stickies.length} stickies • {project.canvasInstances.length} on canvas
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Collaboration Status */}
        <CollaborationStatus />

        {/* Board Management */}
        <div className="flex items-center gap-1 mr-2 border-r pr-2">
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!isOwner}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isOwner ? "Save Board" : "Only board owner can save"}
          >
            <Save size={18} />
            <span className="text-sm">Save</span>
          </button>
          <button
            onClick={() => setIsDashboardOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            title="View All Boards"
          >
            <FolderOpen size={18} />
            <span className="text-sm">Dashboard</span>
          </button>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            title="New Board"
          >
            <Plus size={18} />
            <span className="text-sm">New</span>
          </button>
        </div>

        {/* Share Board (Owner Only) */}
        {isOwner && boardId && (
          <button
            onClick={copyBoardUrl}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            title="Share board link with collaborators"
          >
            <Share2 size={18} />
            <span className="text-sm">Share</span>
          </button>
        )}

        {/* AI Review */}
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-colors"
          title="AI Review Assistant"
        >
          <Sparkles size={18} />
          <span className="text-sm">AI Review</span>
        </button>

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF || project.canvasInstances.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export canvas as PDF"
        >
          <FileDown size={18} />
          <span className="text-sm">{isExportingPDF ? 'Exporting...' : 'Export PDF'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ml-2"
          title="Logout"
        >
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </button>
      </div>

      {/* AI Modal */}
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

      {/* Save Board Modal */}
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        currentProjectName={project.name}
        isExistingProject={isProjectSaved(project.id)}
        onSave={handleSaveProject}
        onSaveAs={handleSaveAsProject}
        onClose={() => setIsSaveModalOpen(false)}
      />

      {/* Dashboard Modal */}
      <Dashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onNewProject={handleNewProject}
      />
    </div>
  );
};
