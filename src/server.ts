import dotenv from 'dotenv';

// Load env vars FIRST
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import passport from 'passport';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import './config/passport';

// Connect to database
connectDB();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Gym Membership Management API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
