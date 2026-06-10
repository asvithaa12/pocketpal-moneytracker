import { Router } from 'express';
import { BudgetController } from '../controllers/budgetController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { budgetSchema } from '../validation/budgetSchema.js';

const router = Router();

router.use(authenticate);

router.get('/:month', BudgetController.getByMonth);
router.post('/', validate(budgetSchema), BudgetController.upsert);
router.get('/:month/progress', BudgetController.getProgress);

export default router;
