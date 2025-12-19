// Sticky (Library Item)
export interface Sticky {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

// Canvas Instance (placed on canvas)
export interface CanvasInstance {
  id: string;
  stickyId: string; // Reference to library sticky
  x: number;
  y: number;
  width: number;
  height: number;
  overriddenText?: string; // Optional local text override
  zIndex: number;
}

// Project
export interface Project {
  id: string;
  name: string;
  stickies: Sticky[];
  canvasInstances: CanvasInstance[];
  createdAt: number;
  updatedAt: number;
  boardId?: string; // For collaboration
  ownerId?: string; // User who created the board
  ownerUsername?: string; // For display
}

// Store State
export interface StoreState {
  project: Project;
  history: Project[];
  historyIndex: number;

  // Auth state
  session: import('./auth').Session | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Collaboration state
  boardId: string | null;
  isOwner: boolean;
  connectedUsers: Array<{ userId: string; username: string }>;
  isConnectedToServer: boolean;
  stickyActivities: Map<string, StickyActivity>; // instanceId -> activity
  setBoardId: (boardId: string, ownerId: string, ownerUsername: string) => void;
  setConnectedUsers: (users: Array<{ userId: string; username: string }>) => void;
  setConnectionStatus: (connected: boolean) => void;
  applyRemoteUpdate: (eventType: string, data: any) => void;
  setStickyActivity: (instanceId: string, activity: StickyActivity | null) => void;

  // Internal helper
  _addToHistory: (newProject: Project) => void;
  _skipBroadcast: boolean; // Flag to prevent broadcast loops

  // Sticky actions
  createSticky: (text: string, color: string) => string;
  updateSticky: (id: string, updates: Partial<Sticky>) => void;
  deleteSticky: (id: string) => void;
  duplicateSticky: (id: string) => void;

  // Canvas instance actions
  createCanvasInstance: (stickyId: string, x: number, y: number) => void;
  updateCanvasInstance: (id: string, updates: Partial<CanvasInstance>) => void;
  deleteCanvasInstance: (id: string) => void;
  duplicateCanvasInstance: (id: string) => void;

  // Undo/Redo (removed from UI but keeping functionality)
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Project actions
  exportToJSON: () => string;
  loadProject: (project: Project) => void;
  updateProjectName: (name: string) => void;
}

// Activity tracking
export interface StickyActivity {
  instanceId: string;
  userId: string;
  username: string;
  action: 'moving' | 'editing';
  timestamp: number;
}

// UI State
export interface DragData {
  type: 'library' | 'canvas';
  stickyId?: string;
  instanceId?: string;
}
