import { Response, NextFunction } from 'express';
import { FriendService } from '../services/friendService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class FriendController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const balances = await FriendService.getAllBalances(userId);
      res.status(200).json({ success: true, data: balances });
    } catch (error) {
      next(error);
    }
  }

  static async getByName(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name } = req.params;

      const history = await FriendService.getFriendHistory(userId, name);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  static async settle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, amount, subcategory } = req.body;

      if (!name || !amount) {
        return res.status(400).json({ success: false, error: 'name and amount are required' });
      }

      const tx = await FriendService.settleFriend(userId, name, Number(amount), subcategory || 'cash');
      res.status(201).json({ success: true, data: tx });
    } catch (error) {
      next(error);
    }
  }
}
