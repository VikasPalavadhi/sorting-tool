import { create } from 'zustand';
import type { Project, Sticky, CanvasInstance, StoreState } from '../types';
import { getSession, login as authLogin, logout as authLogout } from '../services/authService';
import { websocketService } from '../services/websocketService';

const STORAGE_KEY = 'card-sorting-tool-project';
const MAX_HISTORY = 50;

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// Load project from localStorage
const loadFromStorage = (): Project | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Save project to localStorage
const saveToStorage = (project: Project) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

// Create initial project
const createInitialProject = (session?: ReturnType<typeof getSession>): Project => ({
  id: generateId(),
  name: 'Untitled Project',
  stickies: [],
  canvasInstances: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ownerId: session?.userId,
  ownerUsername: session?.username,
});

const initialSession = getSession();
const initialProject = loadFromStorage() || createInitialProject(initialSession);
const initialIsOwner = initialSession !== null && initialProject.ownerId === initialSession.userId;

export const useStore = create<StoreState>((set, get) => ({
  project: initialProject,
  history: [initialProject],
  historyIndex: 0,
  canUndo: false,
  canRedo: false,

  // Auth state
  session: initialSession,
  isAuthenticated: initialSession !== null,

  // Collaboration state
  boardId: null,
  isOwner: initialIsOwner,
  connectedUsers: [],
  isConnectedToServer: false,
  stickyActivities: new Map(),
  _skipBroadcast: false,

  // Auth actions
  login: (username: string, password: string): boolean => {
    const session = authLogin(username, password);
    if (session) {
      set({ session, isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    authLogout();
    websocketService.disconnect();
    set({
      session: null,
      isAuthenticated: false,
      boardId: null,
      isOwner: false,
      connectedUsers: [],
      isConnectedToServer: false
    });
  },

  // Collaboration actions
  setBoardId: (boardId: string, ownerId: string, ownerUsername: string) => {
    const { project, session } = get();
    const isOwner = session?.userId === ownerId;

    const updatedProject = {
      ...project,
      boardId,
      ownerId,
      ownerUsername,
      updatedAt: Date.now()
    };

    set({
      boardId,
      isOwner,
      project: updatedProject
    });

    saveToStorage(updatedProject);
  },

  setConnectedUsers: (users: Array<{ userId: string; username: string }>) => {
    set({ connectedUsers: users });
  },

  setConnectionStatus: (connected: boolean) => {
    set({ isConnectedToServer: connected });
  },

  setStickyActivity: (instanceId: string, activity: any | null) => {
    const { stickyActivities } = get();
    const newActivities = new Map(stickyActivities);

    if (activity === null) {
      // Remove activity
      newActivities.delete(instanceId);
    } else {
      // Add/update activity
      newActivities.set(instanceId, activity);
    }

    set({ stickyActivities: newActivities });

    // Auto-clear activity after 3 seconds of inactivity
    if (activity !== null) {
      setTimeout(() => {
        const current = get().stickyActivities.get(instanceId);
        if (current && current.timestamp === activity.timestamp) {
          get().setStickyActivity(instanceId, null);
        }
      }, 3000);
    }
  },

  applyRemoteUpdate: (eventType: string, data: any) => {
    const { project } = get();

    // Set flag to prevent broadcast loop
    set({ _skipBroadcast: true });

    try {
      switch (eventType) {
        case 'sticky:created': {
          const updatedProject = {
            ...project,
            stickies: [...project.stickies, data.sticky],
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'sticky:updated': {
          const updatedProject = {
            ...project,
            stickies: project.stickies.map((s) =>
              s.id === data.stickyId ? { ...s, ...data.updates } : s
            ),
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'sticky:deleted': {
          const updatedProject = {
            ...project,
            stickies: project.stickies.filter((s) => s.id !== data.stickyId),
            canvasInstances: project.canvasInstances.filter((ci) => ci.stickyId !== data.stickyId),
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'instance:created': {
          const updatedProject = {
            ...project,
            canvasInstances: [...project.canvasInstances, data.instance],
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'instance:updated': {
          const updatedProject = {
            ...project,
            canvasInstances: project.canvasInstances.map((ci) =>
              ci.id === data.instanceId ? { ...ci, ...data.updates } : ci
            ),
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'instance:deleted': {
          const updatedProject = {
            ...project,
            canvasInstances: project.canvasInstances.filter((ci) => ci.id !== data.instanceId),
            updatedAt: Date.now()
          };
          set({ project: updatedProject });
          saveToStorage(updatedProject);
          break;
        }

        case 'board:sync': {
          // Full board state sync when joining
          const syncedProject = {
            ...project,
            ...data.project,
            updatedAt: Date.now()
          };
          set({
            project: syncedProject,
            history: [syncedProject],
            historyIndex: 0,
            canUndo: false,
            canRedo: false
          });
          saveToStorage(syncedProject);
          break;
        }

        default:
          console.warn('Unknown event type:', eventType);
      }
    } finally {
      // Reset flag
      set({ _skipBroadcast: false });
    }
  },

  // Update history after state change
  _addToHistory: (newProject: Project) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newProject);

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    const newIndex = newHistory.length - 1;

    set({
      project: newProject,
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    });

    saveToStorage(newProject);
  },

  // Sticky actions
  createSticky: (text: string, color: string) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const newSticky: Sticky = {
      id: generateId(),
      text,
      color,
      createdAt: Date.now(),
    };

    const updatedProject = {
      ...project,
      stickies: [...project.stickies, newSticky],
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('sticky:create', { boardId, sticky: newSticky });
    }

    return newSticky.id;
  },

  updateSticky: (id: string, updates: Partial<Sticky>) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const updatedProject = {
      ...project,
      stickies: project.stickies.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('sticky:update', { boardId, stickyId: id, updates });
    }
  },

  deleteSticky: (id: string) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const updatedProject = {
      ...project,
      stickies: project.stickies.filter((s) => s.id !== id),
      // Also remove all canvas instances referencing this sticky
      canvasInstances: project.canvasInstances.filter((ci) => ci.stickyId !== id),
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('sticky:delete', { boardId, stickyId: id });
    }
  },

  duplicateSticky: (id: string) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const stickyToDuplicate = project.stickies.find((s) => s.id === id);
    if (!stickyToDuplicate) return;

    const newSticky: Sticky = {
      ...stickyToDuplicate,
      id: generateId(),
      text: `${stickyToDuplicate.text} (Copy)`,
      createdAt: Date.now(),
    };

    const updatedProject = {
      ...project,
      stickies: [...project.stickies, newSticky],
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('sticky:create', { boardId, sticky: newSticky });
    }
  },

  // Canvas instance actions
  createCanvasInstance: (stickyId: string, x: number, y: number) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const sticky = project.stickies.find((s) => s.id === stickyId);
    if (!sticky) return;

    // Get the highest zIndex and add 1
    const maxZ = project.canvasInstances.reduce(
      (max, ci) => Math.max(max, ci.zIndex),
      0
    );

    const newInstance: CanvasInstance = {
      id: generateId(),
      stickyId,
      x,
      y,
      width: 200,
      height: 120,
      zIndex: maxZ + 1,
    };

    const updatedProject = {
      ...project,
      canvasInstances: [...project.canvasInstances, newInstance],
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('instance:create', { boardId, instance: newInstance });
    }
  },

  updateCanvasInstance: (id: string, updates: Partial<CanvasInstance>) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const updatedProject = {
      ...project,
      canvasInstances: project.canvasInstances.map((ci) =>
        ci.id === id ? { ...ci, ...updates } : ci
      ),
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('instance:update', { boardId, instanceId: id, updates });
    }
  },

  deleteCanvasInstance: (id: string) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const updatedProject = {
      ...project,
      canvasInstances: project.canvasInstances.filter((ci) => ci.id !== id),
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('instance:delete', { boardId, instanceId: id });
    }
  },

  duplicateCanvasInstance: (id: string) => {
    const { project, boardId, _skipBroadcast, isConnectedToServer } = get();
    const instanceToDuplicate = project.canvasInstances.find((ci) => ci.id === id);
    if (!instanceToDuplicate) return;

    const maxZ = project.canvasInstances.reduce(
      (max, ci) => Math.max(max, ci.zIndex),
      0
    );

    const newInstance: CanvasInstance = {
      ...instanceToDuplicate,
      id: generateId(),
      x: instanceToDuplicate.x + 20,
      y: instanceToDuplicate.y + 20,
      zIndex: maxZ + 1,
    };

    const updatedProject = {
      ...project,
      canvasInstances: [...project.canvasInstances, newInstance],
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);

    // Broadcast to WebSocket if connected
    if (isConnectedToServer && boardId && !_skipBroadcast) {
      websocketService.emit('instance:create', { boardId, instance: newInstance });
    }
  },

  // Undo/Redo
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const project = history[newIndex];

    set({
      project,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    });

    saveToStorage(project);
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const project = history[newIndex];

    set({
      project,
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    });

    saveToStorage(project);
  },

  // Project actions
  exportToJSON: () => {
    const { project } = get();
    return JSON.stringify(project, null, 2);
  },

  loadProject: (project: Project) => {
    const { session } = get();
    const isOwner = session !== null && project.ownerId === session.userId;
    set({
      project,
      history: [project],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
      isOwner,
      boardId: null, // Clear board when loading a new project
      connectedUsers: [],
      isConnectedToServer: false,
    });
    saveToStorage(project);
  },

  updateProjectName: (name: string) => {
    const { project } = get();
    const updatedProject = {
      ...project,
      name,
      updatedAt: Date.now(),
    };

    get()._addToHistory(updatedProject);
  },
}));
