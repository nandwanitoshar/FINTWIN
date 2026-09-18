import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from '../controllers/calendarController.js';

const router = Router();

router.use(requireAuth);

router.get('/', getCalendarEvents);
router.post('/events', createCalendarEvent);
router.delete('/events/:id', deleteCalendarEvent);

export default router;
