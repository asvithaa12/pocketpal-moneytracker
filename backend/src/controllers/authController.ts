import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const result = await AuthService.signUp(email, password);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const result = await AuthService.signIn(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await AuthService.signOut(token);
      }
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      res.status(200).json({ success: true, data: req.user });
    } catch (error: any) {
      next(error);
    }
  }
}
