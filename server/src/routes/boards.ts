import { Router, Request, Response } from 'express';
import {
  getUserBoards,
  getBoardMetadata,
  getFullBoard,
  createBoard,
  updateBoardName,
  deleteBoard,
  saveBoardState,
  getBoardByBoardId
} from '../database/service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/boards
 * Get all boards for the authenticated user
 */
router.get('/', (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  const boards = getUserBoards(userId);

  // Return board metadata (without full stickies/instances)
  res.json({
    success: true,
    boards: boards.map(board => ({
      id: board.id,
      name: board.name,
      boardId: board.board_id,
      ownerId: board.owner_id,
      ownerUsername: board.owner_username,
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      stickyCount: board.sticky_count,
      canvasCount: board.canvas_count
    }))
  });
});

/**
 * GET /api/boards/:id
 * Get full board data including stickies and canvas instances
 */
router.get('/:id', (req: Request, res: Response) => {
  const boardId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  const board = getFullBoard(boardId);

  if (!board) {
    return res.status(404).json({
      error: 'Board not found',
      code: 'BOARD_NOT_FOUND'
    });
  }

  // Check ownership
  if (board.owner_id !== userId) {
    return res.status(403).json({
      error: 'You do not have permission to access this board',
      code: 'FORBIDDEN'
    });
  }

  res.json({
    success: true,
    board: {
      id: board.id,
      name: board.name,
      boardId: board.board_id,
      ownerId: board.owner_id,
      ownerUsername: board.owner_username,
      createdAt: board.created_at,
      updatedAt: board.updated_at,
      stickies: board.stickies,
      canvasInstances: board.canvasInstances
    }
  });
});

/**
 * GET /api/boards/by-board-id/:boardId
 * Get board by board_id field (for WebSocket collaboration)
 */
router.get('/by-board-id/:boardId', (req: Request, res: Response) => {
  const boardIdField = req.params.boardId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  const board = getBoardByBoardId(boardIdField);

  if (!board) {
    return res.status(404).json({
      error: 'Board not found',
      code: 'BOARD_NOT_FOUND'
    });
  }

  // Check ownership
  if (board.owner_id !== userId) {
    return res.status(403).json({
      error: 'You do not have permission to access this board',
      code: 'FORBIDDEN'
    });
  }

  const fullBoard = getFullBoard(board.id);

  res.json({
    success: true,
    board: {
      id: fullBoard!.id,
      name: fullBoard!.name,
      boardId: fullBoard!.board_id,
      ownerId: fullBoard!.owner_id,
      ownerUsername: fullBoard!.owner_username,
      createdAt: fullBoard!.created_at,
      updatedAt: fullBoard!.updated_at,
      stickies: fullBoard!.stickies,
      canvasInstances: fullBoard!.canvasInstances
    }
  });
});

/**
 * POST /api/boards
 * Create a new board
 */
router.post('/', (req: Request, res: Response) => {
  const { name, boardId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Validate input
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      error: 'Board name must be at least 3 characters',
      code: 'INVALID_NAME'
    });
  }

  // Create board
  const board = createBoard(name.trim(), userId, boardId);

  res.status(201).json({
    success: true,
    board: {
      id: board.id,
      name: board.name,
      boardId: board.board_id,
      ownerId: board.owner_id,
      ownerUsername: board.owner_username,
      createdAt: board.created_at,
      updatedAt: board.updated_at
    }
  });
});

/**
 * PUT /api/boards/:id
 * Update board name
 */
router.put('/:id', (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Validate input
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      error: 'Board name must be at least 3 characters',
      code: 'INVALID_NAME'
    });
  }

  // Update board
  const success = updateBoardName(boardId, name.trim(), userId);

  if (!success) {
    return res.status(404).json({
      error: 'Board not found or you do not have permission',
      code: 'BOARD_NOT_FOUND_OR_FORBIDDEN'
    });
  }

  res.json({
    success: true,
    message: 'Board name updated successfully'
  });
});

/**
 * DELETE /api/boards/:id
 * Delete a board (owner only)
 */
router.delete('/:id', (req: Request, res: Response) => {
  const boardId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Delete board
  const success = deleteBoard(boardId, userId);

  if (!success) {
    return res.status(404).json({
      error: 'Board not found or you do not have permission',
      code: 'BOARD_NOT_FOUND_OR_FORBIDDEN'
    });
  }

  res.json({
    success: true,
    message: 'Board deleted successfully'
  });
});

/**
 * POST /api/boards/:id/save
 * Save full board state (stickies + canvas instances)
 */
router.post('/:id/save', (req: Request, res: Response) => {
  const boardId = req.params.id;
  const { stickies, canvasInstances } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_USER'
    });
  }

  // Validate input
  if (!Array.isArray(stickies) || !Array.isArray(canvasInstances)) {
    return res.status(400).json({
      error: 'Invalid board state data',
      code: 'INVALID_DATA'
    });
  }

  // Check board exists and user is owner
  const board = getBoardMetadata(boardId);

  if (!board) {
    return res.status(404).json({
      error: 'Board not found',
      code: 'BOARD_NOT_FOUND'
    });
  }

  if (board.owner_id !== userId) {
    return res.status(403).json({
      error: 'Only the board owner can save',
      code: 'FORBIDDEN'
    });
  }

  // Save board state
  saveBoardState(boardId, stickies, canvasInstances);

  res.json({
    success: true,
    message: 'Board state saved successfully'
  });
});

export default router;
