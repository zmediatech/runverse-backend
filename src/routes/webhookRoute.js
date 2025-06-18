import stripe from '../config/stripe.js';
import admin from '../config/firebase.js';
import express from 'express';
import bodyParser from 'body-parser';
import { allocateTokensToUser } from '../controllers/blockchainController.js'; // Import allocateTokensToUser function

const router = express.Router();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      const firebaseUID = paymentIntent.metadata?.firebaseUID;
      const packageId = paymentIntent.metadata?.packageId;

      if (!firebaseUID || !packageId) {
        console.warn('Missing metadata on PaymentIntent');
        return res.status(400).send('Missing metadata');
      }

      try {
        // Fetch package data
        const packageDoc = await admin.firestore().collection('packages').doc(packageId).get();

        if (!packageDoc.exists) {
          console.warn(`Package with ID ${packageId} not found`);
          return res.status(400).send('Package not found');
        }

        const packageData = packageDoc.data();
        const distance = packageData.distance;

        // Fetch achievement with matching pkg_id
        const achievementQuery = await admin.firestore()
          .collection('achievements')
          .where('pkg_id', '==', packageId)
          .limit(1)
          .get();

        let totalMilestones = 0;

        if (!achievementQuery.empty) {
          const achievementDoc = achievementQuery.docs[0];
          const achievementData = achievementDoc.data();
          totalMilestones = achievementData.milestone_count || 0;
        } else {
          console.warn(`No achievement found for pkg_id: ${packageId}`);
        }

        // Update user document with package info and milestones
        await admin.firestore().collection('users').doc(firebaseUID).set(
          {
            packageId,
            status: "active",
            paid: true,
            goal: Number(distance),
            totalMilestones,
            completedMilestones: 0,  // default on new payment
            payment_data: {
              stripe_payment_intent_id: paymentIntent.id,
              amount_total: Number(paymentIntent.amount),
              currency: paymentIntent.currency,
              payment_status: paymentIntent.status,
              paid_at: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );

        try {
          const result = await allocateTokensToUser(
            firebaseUID,                // User's UID from payment metadata
            'packages',                 // Category
            'Package reward',           // Reason
            { pkgId: packageId }        // Metadata (contains the pkgId)
          );
          console.log(result.message);
        } catch (err) {
          console.error('❌ Failed to allocate tokens:', err);
        }

        console.log(`✅ Payment recorded and milestones set for UID ${firebaseUID}`);
      } catch (err) {
        console.error('❌ Failed to save payment info to Firestore:', err);
        return res.status(500).send('Firestore error');
      }
    }

    res.status(200).send('Webhook received');
  }
);

export default router;
