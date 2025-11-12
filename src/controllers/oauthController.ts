import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as any, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  } as any) as string;
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      return;
    }

    const user = req.user as any;
    const token = generateToken(user._id.toString());

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};
