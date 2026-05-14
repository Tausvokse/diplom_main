import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { config } from './config';

let io: SocketIOServer;

export const initSocket = (server: Server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room for specific Diia session
    socket.on('join_diia_session', (data: { sessionId: string }) => {
      socket.join(`diia_${data.sessionId}`);
      console.log(`Socket ${socket.id} joined room diia_${data.sessionId}`);
    });

    socket.on('leave_diia_session', (data: { sessionId: string }) => {
      socket.leave(`diia_${data.sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
