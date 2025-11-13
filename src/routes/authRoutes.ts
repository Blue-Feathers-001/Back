import express from 'express';
import { register, login, getMe, oauthRegister, forgotPassword, resetPassword, updateProfile, changePassword } from '../controllers/authController';
import { googleCallback } from '../controllers/oauthController';
import { protect } from '../middleware/auth';
import passport from '../config/passport';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Profile management routes
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OAuth registration endpoint (for NextAuth)
router.post('/oauth/register', oauthRegister);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

export default router;

