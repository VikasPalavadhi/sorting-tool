import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { websocketService } from '../services/websocketService';

export const useCollaboration = (boardId: string | null) => {
  const {
    session,
    project,
    setConnectedUsers,
    setConnectionStatus,
    applyRemoteUpdate,
    setBoardId: setStoreBoardId
  } = useStore();

  // Connect to WebSocket when boardId is available
  useEffect(() => {
    if (!boardId || !session) {
      return;
    }

    // Define event handlers with stable references for cleanup
    const handlers = {
      handleBoardSync: (data: any) => {
        console.log('Received board sync:', data);
        applyRemoteUpdate('board:sync', data);

        if (data.ownerId && data.ownerUsername) {
          setStoreBoardId(boardId, data.ownerId, data.ownerUsername);
        }

        if (data.connectedUsers) {
          setConnectedUsers(data.connectedUsers);
        }
      },

      handleStickyCreated: (data: any) => {
        console.log('Sticky created by another user:', data);
        applyRemoteUpdate('sticky:created', data);
      },

      handleStickyUpdated: (data: any) => {
        console.log('Sticky updated by another user:', data);
        applyRemoteUpdate('sticky:updated', data);
      },

      handleStickyDeleted: (data: any) => {
        console.log('Sticky deleted by another user:', data);
        applyRemoteUpdate('sticky:deleted', data);
      },

      handleInstanceCreated: (data: any) => {
        console.log('Instance created by another user:', data);
        applyRemoteUpdate('instance:created', data);
      },

      handleInstanceUpdated: (data: any) => {
        console.log('Instance updated by another user:', data);
        applyRemoteUpdate('instance:updated', data);
      },

      handleInstanceDeleted: (data: any) => {
        console.log('Instance deleted by another user:', data);
        applyRemoteUpdate('instance:deleted', data);
      },

      handleUsersUpdated: (data: any) => {
        console.log('Connected users updated:', data);
        if (data.connectedUsers) {
          setConnectedUsers(data.connectedUsers);
        }
      },

      handleUserJoined: (data: any) => {
        console.log('User joined:', data);
      },

      handleUserLeft: (data: any) => {
        console.log('User left:', data);
      },

      handleBoardError: (data: any) => {
        console.error('Board error:', data);
        alert(`Board error: ${data.message}`);
      },

      handleStickyActivity: (data: any) => {
        console.log('Sticky activity:', data);
        const { setStickyActivity } = useStore.getState();
        setStickyActivity(data.instanceId, data);
      },

      handleStickyActivityClear: (data: any) => {
        console.log('Sticky activity cleared:', data);
        const { setStickyActivity } = useStore.getState();
        setStickyActivity(data.instanceId, null);
      },
    };

    const connect = async () => {
      try {
        console.log(`Connecting to board: ${boardId}`);

        await websocketService.connect(
          boardId,
          session.username,
          session.userId,
          project
        );

        setConnectionStatus(true);

        // Subscribe to events
        websocketService.subscribe('board:sync', handlers.handleBoardSync);
        websocketService.subscribe('sticky:created', handlers.handleStickyCreated);
        websocketService.subscribe('sticky:updated', handlers.handleStickyUpdated);
        websocketService.subscribe('sticky:deleted', handlers.handleStickyDeleted);
        websocketService.subscribe('instance:created', handlers.handleInstanceCreated);
        websocketService.subscribe('instance:updated', handlers.handleInstanceUpdated);
        websocketService.subscribe('instance:deleted', handlers.handleInstanceDeleted);
        websocketService.subscribe('users:updated', handlers.handleUsersUpdated);
        websocketService.subscribe('user:joined', handlers.handleUserJoined);
        websocketService.subscribe('user:left', handlers.handleUserLeft);
        websocketService.subscribe('board:error', handlers.handleBoardError);
        websocketService.subscribe('sticky:activity', handlers.handleStickyActivity);
        websocketService.subscribe('sticky:activity:clear', handlers.handleStickyActivityClear);

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus(false);
      }
    };

    connect();

    // Cleanup on unmount - unsubscribe from all events
    return () => {
      console.log('Disconnecting from WebSocket and unsubscribing events');
      websocketService.unsubscribe('board:sync', handlers.handleBoardSync);
      websocketService.unsubscribe('sticky:created', handlers.handleStickyCreated);
      websocketService.unsubscribe('sticky:updated', handlers.handleStickyUpdated);
      websocketService.unsubscribe('sticky:deleted', handlers.handleStickyDeleted);
      websocketService.unsubscribe('instance:created', handlers.handleInstanceCreated);
      websocketService.unsubscribe('instance:updated', handlers.handleInstanceUpdated);
      websocketService.unsubscribe('instance:deleted', handlers.handleInstanceDeleted);
      websocketService.unsubscribe('users:updated', handlers.handleUsersUpdated);
      websocketService.unsubscribe('user:joined', handlers.handleUserJoined);
      websocketService.unsubscribe('user:left', handlers.handleUserLeft);
      websocketService.unsubscribe('board:error', handlers.handleBoardError);
      websocketService.unsubscribe('sticky:activity', handlers.handleStickyActivity);
      websocketService.unsubscribe('sticky:activity:clear', handlers.handleStickyActivityClear);
      websocketService.disconnect();
      setConnectionStatus(false);
    };
  }, [boardId, session?.userId]); // Only reconnect if boardId or userId changes

  // Copy board URL to clipboard
  const copyBoardUrl = useCallback(() => {
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
  }, [boardId]);

  return {
    isConnected: websocketService.isConnected(),
    boardUrl: boardId ? `${window.location.origin}${window.location.pathname}?boardId=${boardId}` : null,
    copyBoardUrl
  };
};
