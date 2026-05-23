import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');

class SocketService {
  private socket: Socket | null = null;
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
    if (this.listeners[event]) {
      if (callback) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      } else {
        delete this.listeners[event];
      }
    }
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
  }

  connect() {
    const token = useAuthStore.getState().accessToken;
    
    if (!this.socket && token) {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // Attach any pre-registered listeners
      Object.keys(this.listeners).forEach(event => {
        this.listeners[event].forEach(cb => {
          this.socket!.on(event, cb as any);
        });
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
