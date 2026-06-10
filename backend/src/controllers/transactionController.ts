import { Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class TransactionController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { month, type } = req.query;
      
      const transactions = await TransactionService.getAll(
        userId,
        month as string | undefined,
        type as string | undefined
      );
      
      res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await TransactionService.getById(userId, id);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const transaction = await TransactionService.create(userId, req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const transaction = await TransactionService.update(userId, id, req.body);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await TransactionService.delete(userId, id);
      res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async clearAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await TransactionService.clearAll(userId);
      res.status(200).json({ success: true, message: 'All transactions cleared successfully' });
    } catch (error) {
      next(error);
    }
  }
}
