import { io, Socket } from 'socket.io-client';

type EventCallback = (...args: any[]) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private eventHandlers: Map<string, EventCallback[]> = new Map();

  constructor() {
    // In production, use empty string (same domain) for WebSocket
    // In development, use localhost
    this.serverUrl = import.meta.env.VITE_WS_URL !== undefined
      ? import.meta.env.VITE_WS_URL
      : (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');
  }

  /**
   * Connect to WebSocket server and join a board
   */
  async connect(boardId: string, username: string, userId: string, project?: any): Promise<void> {
    if (this.socket?.connected) {
      console.log('Already connected to WebSocket server');
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server');

        // Join the board
        this.socket?.emit('board:join', {
          boardId,
          username,
          userId,
          project
        });

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      // Clear event handlers to prevent accumulation
      this.eventHandlers.clear();
      console.log('Disconnected from WebSocket server');
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn(`Cannot emit ${event}: not connected`);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Subscribe to an event from the server
   */
  subscribe(event: string, callback: EventCallback): void {
    // Store callback for re-subscription after reconnect
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);

    // Subscribe on active socket
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe(event: string, callback: EventCallback): void {
    // Remove from stored handlers
    const callbacks = this.eventHandlers.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    // Unsubscribe from socket
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
