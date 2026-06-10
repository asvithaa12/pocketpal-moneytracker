import { Router } from 'express';
import { FriendController } from '../controllers/friendController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', FriendController.getAll);
router.get('/:name', FriendController.getByName);
router.post('/settle', FriendController.settle);

export default router;
