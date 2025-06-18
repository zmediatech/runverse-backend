import express from 'express';
import {
  createReward,
  getRewards,
  getRewardById,
  updateReward,
  deleteReward,
  redeemReward,

} from '../controllers/rewardController.js';

const router = express.Router();

router.post('/redeem-reward', redeemReward);
router.post('/create', createReward);
router.get('/get-rewards', getRewards);
router.get('/get-reward/:id', getRewardById);
router.put('/update/:id', updateReward);
router.delete('/delete/:id', deleteReward);

export default router;
