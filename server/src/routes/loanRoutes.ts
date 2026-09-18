import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { LoanController } from '../controllers/loanController.js';

const router = Router();

router.use(requireAuth);

router.get('/', LoanController.list);
router.post('/', LoanController.create);
router.get('/:id', LoanController.getById);
router.patch('/:id', LoanController.update);
router.delete('/:id', LoanController.delete);

export default router;
