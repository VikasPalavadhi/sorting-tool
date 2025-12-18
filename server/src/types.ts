export interface UserInfo {
  userId: string;
  username: string;
  socketId: string;
  joinedAt: number;
}

export interface BoardData {
  id: string;
  ownerId: string;
  ownerUsername: string;
  project: any; // Full project state
  connectedUsers: Map<string, UserInfo>;
  createdAt: number;
  updatedAt: number;
}

export interface BoardJoinData {
  boardId: string;
  username: string;
  userId: string;
  project?: any;
}

export interface StickyUpdateData {
  boardId: string;
  sticky?: any;
  stickyId?: string;
  updates?: any;
}

export interface InstanceUpdateData {
  boardId: string;
  instance?: any;
  instanceId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  updates?: any;
}

export interface ProjectSaveData {
  boardId: string;
  project: any;
}
