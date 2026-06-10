import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTransactionSchema, updateTransactionSchema } from '../validation/transactionSchema.js';

const router = Router();

router.use(authenticate);

router.get('/', TransactionController.getAll);
router.get('/:id', TransactionController.getById);
router.post('/', validate(createTransactionSchema), TransactionController.create);
router.put('/:id', validate(updateTransactionSchema), TransactionController.update);
router.delete('/:id', TransactionController.delete);
router.delete('/', TransactionController.clearAll);

export default router;
