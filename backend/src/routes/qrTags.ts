import { Router } from 'express';
import { QRTagController } from '../controllers/qrTagController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createQRTagSchema, updateQRTagSchema } from '../validation/qrTagSchema.js';

const router = Router();

router.use(authenticate);

router.get('/', QRTagController.getAll);
router.get('/:hash', QRTagController.getByHash);
router.post('/', validate(createQRTagSchema), QRTagController.createOrUpdate);
router.put('/:hash', validate(updateQRTagSchema), QRTagController.update);
router.delete('/:hash', QRTagController.delete);
router.delete('/', QRTagController.clearAll);

export default router;
