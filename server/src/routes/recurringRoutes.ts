import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from '../controllers/recurringController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listRecurringExpenses);
router.post('/', createRecurringExpense);
router.patch('/:id', updateRecurringExpense);
router.delete('/:id', deleteRecurringExpense);

export default router;
