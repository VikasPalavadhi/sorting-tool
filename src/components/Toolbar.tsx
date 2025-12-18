import { useState } from 'react';
import { Edit3, Sparkles, FileDown, Save, FolderOpen, Plus, LogOut, Share2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AIModal } from './AIModal';
import { SaveProjectModal } from './SaveProjectModal';
import { Dashboard } from './Dashboard';
import { CollaborationStatus } from './CollaborationStatus';
import { saveProject, isProjectSaved, saveProjectAs } from '../store/projectStorage';
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

  const handleSaveProject = (name: string) => {
    // Update project name if changed
    if (name !== project.name) {
      updateProjectName(name);
    }
    // Save to localStorage (overwrites existing)
    // Ensure owner info is set
    const updatedProject = {
      ...project,
      name,
      updatedAt: Date.now(),
      ownerId: project.ownerId || session?.userId,
      ownerUsername: project.ownerUsername || session?.username,
    };
    saveProject(updatedProject);
    setIsSaveModalOpen(false);
  };

  const handleSaveAsProject = (name: string) => {
    // Save as a new project with new ID
    // Set current user as owner of the new project
    const projectWithOwner = {
      ...project,
      ownerId: session?.userId,
      ownerUsername: session?.username,
    };
    const newProject = saveProjectAs(projectWithOwner, name);
    // Load the new project into the store
    const { loadProject } = useStore.getState();
    loadProject(newProject);
    setIsSaveModalOpen(false);
  };

  const handleNewProject = () => {
    // Ask for project name
    const projectName = prompt('Enter new project name:');

    if (!projectName || projectName.trim().length < 3) {
      if (projectName !== null) {
        alert('Project name must be at least 3 characters');
      }
      return;
    }

    // Create new project with the given name
    const { loadProject } = useStore.getState();
    const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const newProject = {
      id: generateId(),
      name: projectName.trim(),
      stickies: [],
      canvasInstances: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: session?.userId,
      ownerUsername: session?.username,
    };

    // Save it immediately to localStorage
    saveProject(newProject);

    // Load it into the editor
    loadProject(newProject);

    // Clear URL params to create fresh board
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
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
              title="Edit project name"
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

        {/* Project Management */}
        <div className="flex items-center gap-1 mr-2 border-r pr-2">
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!isOwner}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isOwner ? "Save Project" : "Only board owner can save"}
          >
            <Save size={18} />
            <span className="text-sm">Save</span>
          </button>
          <button
            onClick={() => setIsDashboardOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            title="View All Projects"
          >
            <FolderOpen size={18} />
            <span className="text-sm">Dashboard</span>
          </button>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            title="New Project"
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

      {/* Save Project Modal */}
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
