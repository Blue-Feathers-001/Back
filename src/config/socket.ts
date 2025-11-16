import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
  email: string;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export const initializeSocket = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'https://bluefeathers.netlify.app',
        'https://blue-feathers.mehara.io',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Server configuration error'));
      }

      // Verify token
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // Verify user exists
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId} (${socket.userEmail})`);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} joined room: user:${socket.userId}`);
    }

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userId} - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to notification service',
      userId: socket.userId,
    });
  });

  console.log('Socket.IO server initialized');
  return io;
};

export default initializeSocket;
