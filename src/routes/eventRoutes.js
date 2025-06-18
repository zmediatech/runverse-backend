import express from 'express';
import upload from '../middleware/upload.js';
import { 
  createEvent, 
  getEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent 
} from '../controllers/eventController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public: Get all events or by status
router.get('/get-events', getEvents);
router.get('/get-event/:id', getEventById);

// Protected: Admin only
// router.post('/', verifyToken, upload.single('logo'), createEvent);
// router.put('/:id', verifyToken, upload.single('logo'), updateEvent);

router.post('/create', upload.single('logo'), createEvent);
router.put('/update/:id', upload.single('logo'), updateEvent);
router.delete('/delete/:id', deleteEvent);

export default router;