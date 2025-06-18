import express from 'express';
import { createCheckoutSession, createPaymentIntent, createPaymentSheet, payWithWallet } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/checkout', createCheckoutSession);
router.post('/create-payment-intent', createPaymentIntent);
router.post('/create-payment-sheet', createPaymentSheet);
router.post('/pay-with-wallet', payWithWallet); //{ uid, packageId }

export default router;