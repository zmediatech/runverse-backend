import express from 'express';
import { getHistory, saveHistoryRoute } from '../controllers/historyController.js';

const router = express.Router();

// Public route to get all history entries for a user
router.get('/:uid', getHistory);
router.post('/end-run', saveHistoryRoute);

export default router;
