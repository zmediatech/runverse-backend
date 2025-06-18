import admin from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config();

export const redeemReward = async (req, res) => {
  const { uid, rewardId } = req.body;

  if (!uid || !rewardId) {
    return res.status(400).json({ error: 'UID and reward ID are required' });
  }

  const db = admin.firestore();

  try {
    // Fetch user doc
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (!userData.wooCustomerId) {
      return res.status(400).json({ error: 'WooCommerce customer ID not linked' });
    }

    if (!userData.rewards || !userData.rewards.includes(rewardId)) {
      return res.status(400).json({ error: 'Reward not found in user rewards' });
    }

    // Fetch reward details by rewardId
    const rewardDoc = await db.collection('rewards').doc(rewardId).get();
    if (!rewardDoc.exists) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const rewardData = rewardDoc.data();
    console.log('Reward Data:', rewardData);

    // Mark reward as redeemed in user doc
    const newRewards = userData.rewards.filter(r => r !== rewardId);
    const redeemedRewards = userData.redeemedRewards || [];

    redeemedRewards.push(rewardId);

    await userRef.update({
      rewards: newRewards,
      redeemedRewards,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate login token
    const payload = {
      uid,
      wooCustomerId: userData.wooCustomerId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });

    // Encode reward object as JSON string URI component
    const encodedReward = encodeURIComponent(JSON.stringify(rewardData));

    const rewardLoginUrl = `https://multivendor.zmedia.com.pk/rewardlogin?token=${token}&reward=${encodedReward}`;

    return res.json({ rewardLoginUrl });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return res.status(500).json({ error: 'Failed to redeem reward' });
  }
};

export const createReward = async (req, res) => {
  const db = admin.firestore();
  const {
    name,
    desc,
    type,
    productId,         // Required if type === 'free_item' or 'product_discount'
    vendorId,          // Required if type === 'vendor_discount'
    discountPercentage, // Required if type === 'product_discount', 'vendor_discount', or 'sitewide_discount'
    status = 'active',
  } = req.body;

  // Basic validation
  if (!name || !desc || !type) {
    return res.status(400).json({ error: 'Name, description, and type are required' });
  }

  // Validate fields based on type
  if (type === 'free_item' && !productId) {
    return res.status(400).json({ error: 'productId is required for free_item type' });
  }

  if (type === 'product_discount') {
    if (!productId) {
      return res.status(400).json({ error: 'productId is required for product_discount type' });
    }
    if (typeof discountPercentage !== 'number') {
      return res.status(400).json({ error: 'discountPercentage is required for product_discount type' });
    }
  }

  if (type === 'vendor_discount') {
    if (!vendorId) {
      return res.status(400).json({ error: 'vendorId is required for vendor_discount type' });
    }
    if (typeof discountPercentage !== 'number') {
      return res.status(400).json({ error: 'discountPercentage is required for vendor_discount type' });
    }
  }

  if (type === 'sitewide_discount' && typeof discountPercentage !== 'number') {
    return res.status(400).json({ error: 'discountPercentage is required for sitewide_discount type' });
  }

  try {
    const reward = {
      name,
      desc,
      type,
      status,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (type === 'free_item') {
      reward.productId = productId;
    } else if (type === 'product_discount') {
      reward.productId = productId;
      reward.discountPercentage = discountPercentage;
    } else if (type === 'vendor_discount') {
      reward.vendorId = vendorId;
      reward.discountPercentage = discountPercentage;
    } else if (type === 'sitewide_discount') {
      reward.discountPercentage = discountPercentage;
    }

    const docRef = await db.collection('rewards').add(reward);
    res.status(201).json({ id: docRef.id, ...reward });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
};

export const getRewards = async (req, res) => {
    const db = admin.firestore();
    const { status } = req.query;

    try {
        let query = db.collection('rewards');
        if (status) query = query.where('status', '==', status);

        const snapshot = await query.get();
        const rewards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(rewards);
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};

export const getRewardById = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        const doc = await db.collection('rewards').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching reward:', error);
        res.status(500).json({ error: 'Failed to fetch reward' });
    }
};

export const updateReward = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;
    const updates = req.body;

    try {
        const docRef = db.collection('rewards').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        await docRef.update(updates);
        res.status(200).json({ id, ...updates });
    } catch (error) {
        console.error('Error updating reward:', error);
        res.status(500).json({ error: 'Failed to update reward' });
    }
};

export const deleteReward = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        const docRef = db.collection('rewards').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Reward not found' });
        }

        await docRef.delete();
        res.status(200).json({ message: 'Reward deleted successfully' });
    } catch (error) {
        console.error('Error deleting reward:', error);
        res.status(500).json({ error: 'Failed to delete reward' });
    }
};
