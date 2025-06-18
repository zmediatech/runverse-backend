import express from 'express';
import { completeRun, getLeaderboard, getTeamLeaderboard } from '../controllers/leaderboardController.js';

const router = express.Router();

// POST /api/leaderboard/complete
router.post('/complete', completeRun);
router.get('/', getLeaderboard);
router.get('/team', getTeamLeaderboard);


export default router;
