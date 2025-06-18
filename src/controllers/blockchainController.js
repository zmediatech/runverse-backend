import admin from '../config/firebase.js';
import { ROLES, ROLE_PERMISSIONS } from '../config/roles.js';
import { addTokens } from './walletController.js';


/**
 * Get current token configuration and stats
 */
export async function getTokenConfig(req, res) {
  try {
    const db = admin.firestore();
    const configRef = db.collection('blockchain_config').doc('token_settings');

    const tokenConfigDoc = await configRef.get();

    if (!tokenConfigDoc.exists) {
      // Initialize with full schema-compliant config
      const defaultConfig = {
        totalTokens: 0,
        allocatedTokens: 0,
        spentTokens: 0,

        loginTokens: 0,
        loginStatus: 'inactive',

        registrationTokens: 0,
        registrationStatus: 'inactive',

        rewardsTokens: 0,
        rewardsStatus: 'inactive',

        badgesTokens: 0,
        badgesStatus: 'inactive',

        packageTokens: [],
        packagesStatus: 'inactive',

        distanceTokens: {},
        distanceStatus: 'inactive',

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await configRef.set(defaultConfig);

      return res.status(200).json({
        message: 'Token configuration initialized with default values',
        config: {
          ...defaultConfig,
          remainingTokens: 0
        }
      });
    }

    const config = tokenConfigDoc.data();
    const remainingTokens = config.allocatedTokens - config.spentTokens;

    return res.status(200).json({
      message: 'Token configuration retrieved successfully',
      config: {
        ...config,
        remainingTokens
      }
    });

  } catch (error) {
    console.error('Error getting token configuration:', error);
    return res.status(500).json({ error: 'Failed to retrieve token configuration' });
  }
}


/**
 * Update total tokens (admin only)
 */
export async function updateTotalTokens(req, res) {
  const { totalTokens } = req.body;
  
  if (!totalTokens || totalTokens < 0) {
    return res.status(400).json({ error: 'Valid total tokens amount is required' });
  }
  
  try {
    const db = admin.firestore();
    
    // Get current configuration
    const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
    
    if (!tokenConfigDoc.exists) {
      return res.status(404).json({ error: 'Token configuration not found' });
    }
    
    const currentConfig = tokenConfigDoc.data();
    
    // Validate that total tokens is not less than allocated tokens
    if (totalTokens < currentConfig.allocatedTokens) {
      return res.status(400).json({ 
        error: 'Total tokens cannot be less than allocated tokens',
        currentAllocated: currentConfig.allocatedTokens
      });
    }
    
    await db.collection('blockchain_config').doc('token_settings').update({
      totalTokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return res.status(200).json({
      message: 'Total tokens updated successfully',
      totalTokens,
      remainingTokens: currentConfig.allocatedTokens - currentConfig.spentTokens
    });
    
  } catch (error) {
    console.error('Error updating total tokens:', error);
    return res.status(500).json({ error: 'Failed to update total tokens' });
  }
}

/**
 * Update allocated tokens (admin only)
 */
export async function updateAllocatedTokens(req, res) {
  const { allocatedTokens } = req.body;
  
  if (!allocatedTokens || allocatedTokens < 0) {
    return res.status(400).json({ error: 'Valid allocated tokens amount is required' });
  }
  
  try {
    const db = admin.firestore();
    
    // Get current configuration
    const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
    
    if (!tokenConfigDoc.exists) {
      return res.status(404).json({ error: 'Token configuration not found' });
    }
    
    const currentConfig = tokenConfigDoc.data();
    
    // Validate constraints
    if (allocatedTokens > currentConfig.totalTokens) {
      return res.status(400).json({ 
        error: 'Allocated tokens cannot exceed total tokens',
        totalTokens: currentConfig.totalTokens
      });
    }
    
    if (allocatedTokens < currentConfig.spentTokens) {
      return res.status(400).json({ 
        error: 'Allocated tokens cannot be less than spent tokens',
        spentTokens: currentConfig.spentTokens
      });
    }
    
    await db.collection('blockchain_config').doc('token_settings').update({
      allocatedTokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const remainingTokens = allocatedTokens - currentConfig.spentTokens;
    
    return res.status(200).json({
      message: 'Allocated tokens updated successfully',
      allocatedTokens,
      remainingTokens
    });
    
  } catch (error) {
    console.error('Error updating allocated tokens:', error);
    return res.status(500).json({ error: 'Failed to update allocated tokens' });
  }
}

/**
 * Update login token reward
 */
export async function updateLoginTokens(req, res) {
  const { tokens, status } = req.body;

  if (tokens === undefined || tokens < 0) {
    return res.status(400).json({ error: 'Valid token amount is required' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
  }

  try {
    const db = admin.firestore();

    const updatePayload = {
      loginTokens: tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status) {
      updatePayload.loginStatus = status;
    }

    await db.collection('blockchain_config').doc('token_settings').update(updatePayload);

    return res.status(200).json({
      message: 'Login tokens and status updated successfully',
      loginTokens: tokens,
      loginStatus: status
    });

  } catch (error) {
    console.error('Error updating login tokens:', error);
    return res.status(500).json({ error: 'Failed to update login tokens' });
  }
}


/**
 * Update registration token reward
 */
export async function updateRegistrationTokens(req, res) {
  const { tokens, status } = req.body;

  if (tokens === undefined || tokens < 0) {
    return res.status(400).json({ error: 'Valid token amount is required' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
  }

  try {
    const db = admin.firestore();

    const updatePayload = {
      registrationTokens: tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status) {
      updatePayload.registrationStatus = status;
    }

    await db.collection('blockchain_config').doc('token_settings').update(updatePayload);

    return res.status(200).json({
      message: 'Registration tokens and status updated successfully',
      registrationTokens: tokens,
      registrationStatus: status
    });

  } catch (error) {
    console.error('Error updating registration tokens:', error);
    return res.status(500).json({ error: 'Failed to update registration tokens' });
  }
}

/**
 * Update rewards collection tokens (distributes across all rewards)
 */
export async function updateRewardsTokens(req, res) {
  const { tokens, status } = req.body;

  if (tokens === undefined || tokens < 0) {
    return res.status(400).json({ error: 'Valid token amount is required' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
  }

  try {
    const db = admin.firestore();

    // Get all rewards
    const rewardsSnapshot = await db.collection('rewards').get();
    const rewardCount = rewardsSnapshot.size;

    if (rewardCount === 0) {
      return res.status(400).json({ error: 'No rewards found to update tokens' });
    }

    // Assign the same tokens value to all rewards
    const batch = db.batch();

    rewardsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Update configuration
    const updatePayload = {
      rewardsTokens: tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status) {
      updatePayload.rewardsStatus = status;
    }

    batch.update(db.collection('blockchain_config').doc('token_settings'), updatePayload);

    await batch.commit();

    return res.status(200).json({
      message: 'Rewards tokens and status updated successfully',
      tokensAssigned: tokens,
      rewardsStatus: status || 'unchanged',
      rewardCount
    });

  } catch (error) {
    console.error('Error updating rewards tokens:', error);
    return res.status(500).json({ error: 'Failed to update rewards tokens' });
  }
}


/**
 * Update badges collection tokens (distributes across all badges)
 */
export async function updateBadgesTokens(req, res) {
  const { tokens, status } = req.body;

  if (tokens === undefined || tokens < 0) {
    return res.status(400).json({ error: 'Valid token amount is required' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "active" or "inactive"' });
  }

  try {
    const db = admin.firestore();

    // Get all badges
    const badgesSnapshot = await db.collection('badges').get();
    const badgeCount = badgesSnapshot.size;

    if (badgeCount === 0) {
      return res.status(400).json({ error: 'No badges found to update tokens' });
    }

    // Assign the same tokens value to all badges
    const batch = db.batch();

    badgesSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Update configuration
    const updatePayload = {
      badgesTokens: tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (status) {
      updatePayload.badgesStatus = status;
    }

    batch.update(db.collection('blockchain_config').doc('token_settings'), updatePayload);

    await batch.commit();

    return res.status(200).json({
      message: 'Badges tokens and status updated successfully',
      tokensAssigned: tokens,
      badgesStatus: status || 'unchanged',
      badgeCount
    });

  } catch (error) {
    console.error('Error updating badges tokens:', error);
    return res.status(500).json({ error: 'Failed to update badges tokens' });
  }
}


/**
 * Update package tokens
 */
export async function updatePackageTokens(req, res) {
  const { pkgId, tokens, status, globalStatus } = req.body;

  if (!pkgId || tokens === undefined || tokens < 0) {
    return res.status(400).json({ error: 'Package ID and valid token amount are required' });
  }

  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Per-package status must be "active" or "inactive"' });
  }

  if (globalStatus && !['active', 'inactive'].includes(globalStatus)) {
    return res.status(400).json({ error: 'Global packages status must be "active" or "inactive"' });
  }

  try {
    const db = admin.firestore();

    // Check the package exists
    const packageDoc = await db.collection('packages').doc(pkgId).get();

    if (!packageDoc.exists) {
      return res.status(404).json({ error: 'Package not found' });
    }

    await db.collection('packages').doc(pkgId).update({
      tokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update packageTokens in config
    const tokenConfigRef = db.collection('blockchain_config').doc('token_settings');
    const tokenConfigDoc = await tokenConfigRef.get();
    const config = tokenConfigDoc.data();

    let packageTokens = config.packageTokens || [];
    const index = packageTokens.findIndex(pkg => pkg.pkgId === pkgId);

    const updatedPackage = {
      pkgId,
      tokens,
      status: status || (index >= 0 ? packageTokens[index].status : 'active')
    };

    if (index >= 0) {
      packageTokens[index] = updatedPackage;
    } else {
      packageTokens.push(updatedPackage);
    }

    const updatePayload = {
      packageTokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (globalStatus) {
      updatePayload.packagesStatus = globalStatus;
    }

    await tokenConfigRef.update(updatePayload);

    return res.status(200).json({
      message: 'Package tokens updated successfully',
      pkgId,
      tokens,
      status: updatedPackage.status,
      packagesStatus: globalStatus || 'unchanged'
    });

  } catch (error) {
    console.error('Error updating package tokens:', error);
    return res.status(500).json({ error: 'Failed to update package tokens' });
  }
}

/**
 * Update distance-based token rewards
 */
export async function updateDistanceTokens(req, res) {
  const { distanceTokens, globalStatus } = req.body;

  if (!distanceTokens || typeof distanceTokens !== 'object') {
    return res.status(400).json({ 
      error: 'Valid distance tokens object is required',
      example: { "10": { "tokens": 20, "status": "active" } }
    });
  }

  if (globalStatus && !['active', 'inactive'].includes(globalStatus)) {
    return res.status(400).json({ error: 'Global status must be "active" or "inactive"' });
  }

  // Validate each distance entry
  for (const [distance, config] of Object.entries(distanceTokens)) {
    if (
      isNaN(distance) ||
      typeof config !== 'object' ||
      isNaN(config.tokens) ||
      config.tokens < 0 ||
      (config.status && !['active', 'inactive'].includes(config.status))
    ) {
      return res.status(400).json({ 
        error: `Invalid token configuration for distance "${distance}"`,
        example: { "10": { "tokens": 20, "status": "active" } }
      });
    }
  }

  try {
    const db = admin.firestore();
    const configRef = db.collection('blockchain_config').doc('token_settings');
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return res.status(404).json({ error: 'Token settings not found' });
    }

    const currentConfig = configDoc.data();
    const currentDistanceTokens = currentConfig.distanceTokens || {};

    // Merge new values
    const updatedDistanceTokens = { ...currentDistanceTokens };

    for (const [distance, config] of Object.entries(distanceTokens)) {
      updatedDistanceTokens[distance] = {
        tokens: config.tokens,
        status: config.status || currentDistanceTokens[distance]?.status || 'active'
      };
    }

    const updatePayload = {
      distanceTokens: updatedDistanceTokens,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (globalStatus) {
      updatePayload.distanceStatus = globalStatus;
    }

    await configRef.update(updatePayload);

    return res.status(200).json({
      message: 'Distance tokens and statuses updated successfully',
      distanceTokens: updatedDistanceTokens,
      distanceStatus: globalStatus || 'unchanged'
    });

  } catch (error) {
    console.error('Error updating distance tokens:', error);
    return res.status(500).json({ error: 'Failed to update distance tokens' });
  }
}


/**
 * Award tokens to user (internal function used by other systems)
 */
export async function allocateTokensToUser(uid, category, reason, metadata = {}) {
  if (!uid || !category) {
    throw new Error('Valid UID and category are required');
  }

  try {
    const db = admin.firestore();
    const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
    const config = tokenConfigDoc.data();

    let tokenAmount;
    let status;

    switch (category) {
      case 'login':
        tokenAmount = config.loginTokens;
        status = config.loginStatus;
        break;

      case 'registration':
        tokenAmount = config.registrationTokens;
        status = config.registrationStatus;
        break;

      case 'rewards': {
        const { rewardId } = metadata;
        if (!rewardId) throw new Error('Reward ID is required for rewards category');

        const rewardDoc = await db.collection('rewards').doc(rewardId).get();
        if (!rewardDoc.exists) return;

        tokenAmount = rewardDoc.data().tokens;
        status = config.rewardsStatus;
        break;
      }

      case 'badges': {
        const { badgeId } = metadata;
        if (!badgeId) throw new Error('Badge ID is required for badges category');

        const badgeDoc = await db.collection('badges').doc(badgeId).get();
        if (!badgeDoc.exists) return;

        tokenAmount = badgeDoc.data().tokens;
        status = config.badgesStatus;
        break;
      }

      case 'packages': {
        const { pkgId } = metadata;
        if (!pkgId) throw new Error('Package ID is required for packages category');

        const pkg = config.packageTokens.find(pkg => pkg.pkgId === pkgId);
        if (!pkg) return;

        tokenAmount = pkg.tokens;
        status = config.packagesStatus === 'active' && pkg.status === 'active' ? 'active' : 'inactive';
        break;
      }

      case 'runDistance': {
        const { distance } = metadata;
        if (!distance) throw new Error('Distance is required for runDistance category');

        const distConfig = config.distanceTokens[distance];
        if (!distConfig) return;

        tokenAmount = distConfig.tokens;
        status = config.distanceStatus === 'active' && distConfig.status === 'active' ? 'active' : 'inactive';
        break;
      }

      default:
        return; // Invalid category
    }

    // ⛔ Skip allocation if status is inactive
    if (status !== 'active') {
      console.log(`Skipping token allocation for category "${category}" due to inactive status.`);
      return;
    }

    // ⛔ Skip if token amount is invalid
    if (tokenAmount === undefined || tokenAmount <= 0) {
      return;
    }

    // ✅ Add tokens to wallet
    const result = await addTokens(uid, tokenAmount, reason);

    // 🔁 Update spent tokens
    await db.collection('blockchain_config').doc('token_settings').update({
      spentTokens: admin.firestore.FieldValue.increment(tokenAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 🧾 Log transaction
    await db.collection('token_transactions').add({
      userId: uid,
      amount: tokenAmount,
      type: 'allocated',
      reason,
      metadata: JSON.parse(JSON.stringify(metadata || {})),
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return result;

  } catch (error) {
    console.error('Error allocating tokens to user:', error);
    throw new Error(error.message || 'Failed to allocate tokens to user');
  }
}


/**
 * Get token statistics and overview
 */
export async function getTokenStats(req, res) {
  try {
    const db = admin.firestore();

    // Get token configuration
    const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
    const config = tokenConfigDoc.data();

    // Get total users with wallets
    const walletsSnapshot = await db.collection('wallets').get();
    const totalUsers = walletsSnapshot.size;

    // Calculate total tokens in circulation
    let totalInCirculation = 0;
    walletsSnapshot.forEach(doc => {
      totalInCirculation += doc.data().balance || 0;
    });

    // Get recent transactions count
    const recentTransactions = await db.collection('token_transactions')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const stats = {
      totals: {
        totalTokens: config.totalTokens,
        allocatedTokens: config.allocatedTokens,
        spentTokens: config.spentTokens,
        remainingTokens: config.allocatedTokens - config.spentTokens,
        totalInCirculation,
        totalUsers,
        recentTransactionCount: recentTransactions.size,
        utilizationRate: config.allocatedTokens > 0
          ? ((config.spentTokens / config.allocatedTokens) * 100).toFixed(2)
          : '0.00'
      },

      statusFlags: {
        loginStatus: config.loginStatus || 'inactive',
        registrationStatus: config.registrationStatus || 'inactive',
        rewardsStatus: config.rewardsStatus || 'inactive',
        badgesStatus: config.badgesStatus || 'inactive',
        packagesStatus: config.packagesStatus || 'inactive',
        distanceStatus: config.distanceStatus || 'inactive'
      },

      tokensPerCategory: {
        loginTokens: config.loginTokens,
        registrationTokens: config.registrationTokens,
        rewardsTokens: config.rewardsTokens,
        badgesTokens: config.badgesTokens,
        packageTokens: config.packageTokens || [],
        distanceTokens: config.distanceTokens || {}
      }
    };

    return res.status(200).json({
      message: 'Token statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Error getting token statistics:', error);
    return res.status(500).json({ error: 'Failed to retrieve token statistics' });
  }
}
