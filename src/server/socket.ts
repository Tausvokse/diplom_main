import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { Role } from '@prisma/client';

let io: SocketIOServer;

export const initSocket = (server: Server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as { id: string; email: string; role: string };
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    console.log(`Socket connected: ${socket.id} (User: ${user.id}, Role: ${user.role})`);

    // Join personal room
    socket.join(`user_${user.id}`);

    // If admin, join admin room
    if ([Role.ADMIN, Role.ADMIN_CAMPUS, Role.ADMIN_COMMANDANT].includes(user.role)) {
      socket.join('admin_room');
      console.log(`Socket ${socket.id} joined admin_room`);
    }

    // Join specific Diia session
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

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

export const emitToAdmins = (event: string, data: any) => {
  if (io) {
    io.to('admin_room').emit(event, data);
  }
};

export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};

