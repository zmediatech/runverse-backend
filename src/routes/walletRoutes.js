import express from 'express';
import {
  // createWallet,
  getWallet,
  // addTokens,
  // spendTokens,
  withdrawTokens
} from '../controllers/walletController.js';
import { verifyToken } from '../middleware/auth.js'; // or use user auth middleware

const router = express.Router();

// Wallet routes
// router.post('/create', verifyAdminToken, createWallet); //req body should contain { uid: 'user_id' }
// router.get('/get-wallet/:uid', verifyAdminToken, getWallet); //req params should contain uid in the URL path
// router.post('/add', verifyAdminToken, addTokens); //req body should contain { uid: 'user_id', amount: 100, description: 'Added tokens' }
// router.post('/spend', verifyAdminToken, spendTokens); //req body should contain { uid: 'user_id', amount: 50, description: 'Spent tokens' }

// router.post('/create', createWallet); //req body should contain { uid: 'user_id' }
// GET /api/wallet/get-wallet/:uid - Get wallet details by user ID
router.get('/get-wallet/:uid', getWallet); //req params should contain uid in the URL path
// router.post('/add', addTokens); //req body should contain { uid: 'user_id', amount: 100, description: 'Added tokens' }
// router.post('/spend', spendTokens); //req body should contain { uid: 'user_id', amount: 50, description: 'Spent tokens' }
router.post('/withdraw', withdrawTokens); //req body should contain { uid: 'user_id', amount: 50, description: 'Withdrawn tokens' }

export default router;
