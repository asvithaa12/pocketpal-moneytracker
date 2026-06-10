import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AnalyticsController {
  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await AnalyticsService.getDashboardStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async getMonthly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const trends = await AnalyticsService.getMonthlyTrends(userId);
      res.status(200).json({ success: true, data: trends });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { month } = req.query;

      if (!month) {
        return res.status(400).json({ success: false, error: 'month query parameter is required (YYYY-MM)' });
      }

      const breakdown = await AnalyticsService.getCategoryBreakdown(userId, month as string);
      res.status(200).json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  }

  static async getLending(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const summary = await AnalyticsService.getLendingSummary(userId);
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}
