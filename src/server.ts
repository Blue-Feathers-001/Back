import dotenv from 'dotenv';

// Load env vars FIRST
dotenv.config();

import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import passport from 'passport';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import packageRoutes from './routes/packageRoutes';
import paymentRoutes from './routes/paymentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import searchRoutes from './routes/searchRoutes';
import noteRoutes from './routes/noteRoutes';
import announcementRoutes from './routes/announcementRoutes';
import uploadRoutes from './routes/uploadRoutes';
import CronScheduler from './services/cronScheduler';
import { initializeSocket } from './config/socket';
import './config/passport';

// Connect to database
connectDB();

// Initialize cron jobs for membership reminders
CronScheduler.initializeJobs();

const app: Application = express();

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://bluefeathers.netlify.app',
  'https://blue-feathers.mehara.io',
];

// Add FRONTEND_URL from environment if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRoutes);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Gym Membership Management API',
    version: '2.0.0',
    features: [
      'Authentication & Authorization',
      'User Management',
      'Membership Packages',
      'PayHere Payment Integration',
      'Automated Email Notifications',
      'In-App Notifications',
      'Membership Expiry Tracking',
    ],
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
export const io = initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server is ready for real-time notifications`);
});

export default app;
