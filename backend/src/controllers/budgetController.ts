import { Response, NextFunction } from 'express';
import { BudgetService } from '../services/budgetService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class BudgetController {
  static async getByMonth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { month } = req.params;

      const budget = await BudgetService.getByMonth(userId, month);
      res.status(200).json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  static async upsert(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const budget = await BudgetService.upsert(userId, req.body);
      res.status(200).json({ success: true, data: budget });
    } catch (error) {
      next(error);
    }
  }

  static async getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { month } = req.params;

      const progress = await BudgetService.getBudgetProgress(userId, month);
      res.status(200).json({ success: true, data: progress });
    } catch (error) {
      next(error);
    }
  }
}
