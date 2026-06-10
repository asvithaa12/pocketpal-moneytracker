import { Response, NextFunction } from 'express';
import { QRTagService } from '../services/qrTagService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class QRTagController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tags = await QRTagService.getAll(userId);
      res.status(200).json({ success: true, data: tags });
    } catch (error) {
      next(error);
    }
  }

  static async getByHash(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { hash } = req.params;

      const tag = await QRTagService.getByHash(userId, hash);
      if (!tag) {
        return res.status(404).json({ success: false, error: 'QR Tag not found' });
      }
      res.status(200).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  static async createOrUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { hash, label, category_id } = req.body;

      if (!hash || !label || !category_id) {
        return res.status(400).json({ success: false, error: 'hash, label, and category_id are required' });
      }

      const tag = await QRTagService.createOrUpdate(userId, { hash, label, category_id });
      res.status(200).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { hash } = req.params;

      const tag = await QRTagService.createOrUpdate(userId, { hash, ...req.body });
      res.status(200).json({ success: true, data: tag });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { hash } = req.params;

      await QRTagService.delete(userId, hash);
      res.status(200).json({ success: true, message: 'QR Tag deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async clearAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await QRTagService.clearAll(userId);
      res.status(200).json({ success: true, message: 'All QR Tags deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
