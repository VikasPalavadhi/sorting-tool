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
        websocketService.subscribe('board:sync', (data) => {
          console.log('Received board sync:', data);
          applyRemoteUpdate('board:sync', data);

          // Update ownership info
          if (data.ownerId && data.ownerUsername) {
            setStoreBoardId(boardId, data.ownerId, data.ownerUsername);
          }

          // Update connected users
          if (data.connectedUsers) {
            setConnectedUsers(data.connectedUsers);
          }
        });

        websocketService.subscribe('sticky:created', (data) => {
          console.log('Sticky created by another user:', data);
          applyRemoteUpdate('sticky:created', data);
        });

        websocketService.subscribe('sticky:updated', (data) => {
          console.log('Sticky updated by another user:', data);
          applyRemoteUpdate('sticky:updated', data);
        });

        websocketService.subscribe('sticky:deleted', (data) => {
          console.log('Sticky deleted by another user:', data);
          applyRemoteUpdate('sticky:deleted', data);
        });

        websocketService.subscribe('instance:created', (data) => {
          console.log('Instance created by another user:', data);
          applyRemoteUpdate('instance:created', data);
        });

        websocketService.subscribe('instance:updated', (data) => {
          console.log('Instance updated by another user:', data);
          applyRemoteUpdate('instance:updated', data);
        });

        websocketService.subscribe('instance:deleted', (data) => {
          console.log('Instance deleted by another user:', data);
          applyRemoteUpdate('instance:deleted', data);
        });

        websocketService.subscribe('users:updated', (data) => {
          console.log('Connected users updated:', data);
          if (data.connectedUsers) {
            setConnectedUsers(data.connectedUsers);
          }
        });

        websocketService.subscribe('user:joined', (data) => {
          console.log('User joined:', data);
        });

        websocketService.subscribe('user:left', (data) => {
          console.log('User left:', data);
        });

        websocketService.subscribe('board:error', (data) => {
          console.error('Board error:', data);
          alert(`Board error: ${data.message}`);
        });

        // Activity tracking events
        websocketService.subscribe('sticky:activity', (data) => {
          console.log('Sticky activity:', data);
          const { setStickyActivity } = useStore.getState();
          setStickyActivity(data.instanceId, data);
        });

        websocketService.subscribe('sticky:activity:clear', (data) => {
          console.log('Sticky activity cleared:', data);
          const { setStickyActivity } = useStore.getState();
          setStickyActivity(data.instanceId, null);
        });

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus(false);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      console.log('Disconnecting from WebSocket');
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
