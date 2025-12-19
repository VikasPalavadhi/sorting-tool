import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { BoardData, BoardJoinData, StickyUpdateData, InstanceUpdateData, ProjectSaveData, UserInfo } from './types';

// Import database services
import {
  getBoardByBoardId,
  getFullBoard,
  createBoard,
  createSticky,
  updateSticky,
  deleteSticky,
  createCanvasInstance,
  updateCanvasInstance,
  deleteCanvasInstance,
  saveBoardState
} from './database/service';

// Import API routes
import authRoutes from './routes/auth';
import boardsRoutes from './routes/boards';

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory storage for boards
const boards = new Map<string, BoardData>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeBoards: boards.size,
    timestamp: Date.now()
  });
});

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  let currentBoardId: string | null = null;
  let currentUserId: string | null = null;

  // Handle board join
  socket.on('board:join', (data: BoardJoinData) => {
    const { boardId, username, userId, project } = data;

    console.log(`User ${username} joining board ${boardId}`);

    currentBoardId = boardId;
    currentUserId = userId;

    // Join the board room
    socket.join(boardId);

    // Get or create board in memory
    let board = boards.get(boardId);

    if (!board) {
      // Try to load from database first
      const dbBoard = getBoardByBoardId(boardId);

      if (dbBoard) {
        // Load existing board from database
        const fullBoard = getFullBoard(dbBoard.id);

        if (fullBoard) {
          console.log(`Loaded board from database: ${boardId} owned by ${fullBoard.owner_username}`);

          board = {
            id: boardId,
            ownerId: fullBoard.owner_id,
            ownerUsername: fullBoard.owner_username,
            project: {
              stickies: fullBoard.stickies.map(s => ({
                id: s.id,
                text: s.text,
                color: s.color,
                createdAt: s.created_at
              })),
              canvasInstances: fullBoard.canvasInstances.map(ci => ({
                id: ci.id,
                stickyId: ci.sticky_id,
                x: ci.x,
                y: ci.y,
                width: ci.width,
                height: ci.height,
                zIndex: ci.z_index,
                overriddenText: ci.overridden_text
              }))
            },
            connectedUsers: new Map(),
            createdAt: fullBoard.created_at,
            updatedAt: fullBoard.updated_at
          };
        }
      }

      // If still no board, create new one (both in memory and database)
      if (!board) {
        console.log(`Creating new board: ${boardId} owned by ${username}`);

        board = {
          id: boardId,
          ownerId: userId,
          ownerUsername: username,
          project: project || { stickies: [], canvasInstances: [] },
          connectedUsers: new Map(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        // Create in database (if project data provided)
        if (project && project.name) {
          try {
            createBoard(project.name, userId, boardId);
            console.log(`Board ${boardId} created in database`);
          } catch (error) {
            console.error('Failed to create board in database:', error);
          }
        }
      }

      boards.set(boardId, board);
    }

    // Add user to connected users
    const userInfo: UserInfo = {
      userId,
      username,
      socketId: socket.id,
      joinedAt: Date.now()
    };
    board.connectedUsers.set(userId, userInfo);

    // Send current board state to the joining user
    socket.emit('board:sync', {
      project: board.project,
      ownerId: board.ownerId,
      ownerUsername: board.ownerUsername,
      connectedUsers: Array.from(board.connectedUsers.values()).map(u => ({
        userId: u.userId,
        username: u.username
      }))
    });

    // Notify others in the board
    socket.to(boardId).emit('user:joined', {
      username,
      userId,
      totalUsers: board.connectedUsers.size
    });

    // Send updated user list to everyone
    io.to(boardId).emit('users:updated', {
      connectedUsers: Array.from(board.connectedUsers.values()).map(u => ({
        userId: u.userId,
        username: u.username
      }))
    });
  });

  // Handle sticky create
  socket.on('sticky:create', (data: StickyUpdateData) => {
    const { boardId, sticky } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      board.project.stickies.push(sticky);
      board.updatedAt = Date.now();

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('sticky:created', { sticky });
      console.log(`Sticky created in board ${boardId}`);
    }
  });

  // Handle sticky update
  socket.on('sticky:update', (data: StickyUpdateData) => {
    const { boardId, stickyId, updates } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      const stickyIndex = board.project.stickies.findIndex((s: any) => s.id === stickyId);
      if (stickyIndex !== -1) {
        board.project.stickies[stickyIndex] = {
          ...board.project.stickies[stickyIndex],
          ...updates
        };
        board.updatedAt = Date.now();
      }

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('sticky:updated', { stickyId, updates });
      console.log(`Sticky ${stickyId} updated in board ${boardId}`);
    }
  });

  // Handle sticky delete
  socket.on('sticky:delete', (data: StickyUpdateData) => {
    const { boardId, stickyId } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      board.project.stickies = board.project.stickies.filter((s: any) => s.id !== stickyId);
      board.project.canvasInstances = board.project.canvasInstances.filter((ci: any) => ci.stickyId !== stickyId);
      board.updatedAt = Date.now();

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('sticky:deleted', { stickyId });
      console.log(`Sticky ${stickyId} deleted from board ${boardId}`);
    }
  });

  // Handle canvas instance create
  socket.on('instance:create', (data: InstanceUpdateData) => {
    const { boardId, instance } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      board.project.canvasInstances.push(instance);
      board.updatedAt = Date.now();

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('instance:created', { instance });
      console.log(`Canvas instance created in board ${boardId}`);
    }
  });

  // Handle canvas instance update
  socket.on('instance:update', (data: InstanceUpdateData) => {
    const { boardId, instanceId, updates } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      const instanceIndex = board.project.canvasInstances.findIndex((ci: any) => ci.id === instanceId);
      if (instanceIndex !== -1) {
        board.project.canvasInstances[instanceIndex] = {
          ...board.project.canvasInstances[instanceIndex],
          ...updates
        };
        board.updatedAt = Date.now();
      }

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('instance:updated', { instanceId, updates });
      console.log(`Instance ${instanceId} updated in board ${boardId}`);
    }
  });

  // Handle canvas instance delete
  socket.on('instance:delete', (data: InstanceUpdateData) => {
    const { boardId, instanceId } = data;
    const board = boards.get(boardId);

    if (board) {
      // Update board state
      board.project.canvasInstances = board.project.canvasInstances.filter((ci: any) => ci.id !== instanceId);
      board.updatedAt = Date.now();

      // Broadcast to other users in board (exclude sender)
      socket.broadcast.to(boardId).emit('instance:deleted', { instanceId });
      console.log(`Instance ${instanceId} deleted from board ${boardId}`);
    }
  });

  // Handle project save (owner only)
  socket.on('project:save', (data: ProjectSaveData) => {
    const { boardId, project } = data;
    const board = boards.get(boardId);

    if (board && currentUserId === board.ownerId) {
      // Update in-memory board state
      board.project = project;
      board.updatedAt = Date.now();

      console.log(`Project saved for board ${boardId} by owner ${currentUserId}`);

      // Persist to database
      const dbBoard = getBoardByBoardId(boardId);

      if (dbBoard) {
        try {
          // Convert project data to database format
          const stickies = project.stickies.map((s: any) => ({
            id: s.id,
            text: s.text,
            color: s.color,
            created_at: s.createdAt
          }));

          const instances = project.canvasInstances.map((ci: any) => ({
            id: ci.id,
            sticky_id: ci.stickyId,
            x: ci.x,
            y: ci.y,
            width: ci.width,
            height: ci.height,
            z_index: ci.zIndex,
            overridden_text: ci.overriddenText
          }));

          saveBoardState(dbBoard.id, stickies, instances);
          console.log(`Board ${boardId} persisted to database`);
        } catch (error) {
          console.error('Failed to persist board to database:', error);
        }
      }

      // Confirm to the owner
      socket.emit('project:saved', { success: true });
    } else {
      // Not authorized
      socket.emit('board:error', {
        message: 'Only the board owner can save',
        code: 'UNAUTHORIZED'
      });
    }
  });

  // Handle sticky activity (user is moving/editing)
  socket.on('sticky:activity', (data: any) => {
    const { boardId, instanceId, action, username, userId } = data;

    // Broadcast to all other users in the board
    socket.to(boardId).emit('sticky:activity', {
      instanceId,
      userId,
      username,
      action,
      timestamp: Date.now()
    });
  });

  // Handle sticky activity clear (user stopped moving/editing)
  socket.on('sticky:activity:clear', (data: any) => {
    const { boardId, instanceId } = data;

    // Broadcast to all other users in the board
    socket.to(boardId).emit('sticky:activity:clear', {
      instanceId
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (currentBoardId && currentUserId) {
      const board = boards.get(currentBoardId);

      if (board) {
        const user = board.connectedUsers.get(currentUserId);
        board.connectedUsers.delete(currentUserId);

        // Notify others
        socket.to(currentBoardId).emit('user:left', {
          username: user?.username,
          userId: currentUserId,
          totalUsers: board.connectedUsers.size
        });

        // Send updated user list
        io.to(currentBoardId).emit('users:updated', {
          connectedUsers: Array.from(board.connectedUsers.values()).map(u => ({
            userId: u.userId,
            username: u.username
          }))
        });

        // Clean up empty boards - remove from memory so next join reloads from database
        if (board.connectedUsers.size === 0) {
          console.log(`Board ${currentBoardId} is empty, removing from memory`);
          boards.delete(currentBoardId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`✅ WebSocket server running on port ${PORT}`);
  console.log(`📡 Ready for connections`);
});
