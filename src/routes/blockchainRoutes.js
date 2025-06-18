import express from 'express';
import {
  getTokenConfig,
  updateTotalTokens,
  updateAllocatedTokens,
  updateLoginTokens,
  updateRegistrationTokens,
  updateRewardsTokens,
  updateBadgesTokens,
  updatePackageTokens,
  updateDistanceTokens,
  getTokenStats
} from '../controllers/blockchainController.js';

const router = express.Router();

router.get('/config', getTokenConfig);
router.get('/stats', getTokenStats);
router.put('/update/total-tokens', updateTotalTokens);
router.put('/update/allocated-tokens', updateAllocatedTokens);
router.put('/update/login-tokens', updateLoginTokens);
router.put('/update/registration-tokens', updateRegistrationTokens);
router.put('/update/rewards-tokens', updateRewardsTokens);
router.put('/update/badges-tokens', updateBadgesTokens);
router.put('/update/package-tokens', updatePackageTokens);
router.put('/update/distance-tokens', updateDistanceTokens);

export default router;

/*
// import { authenticateAdmin } from '../middleware/adminAuth.js';
// import { validateRole } from '../middleware/roleValidation.js';
// import { ROLES } from '../config/roles.js';

// Apply admin authentication to all routes
// router.use(authenticateAdmin);

/**
 * GET /api/blockchain/config
 * Get current token configuration and settings
 */

/**
 * GET /api/blockchain/stats
 * Get token statistics and overview
 */

/**
 * PUT /api/blockchain/total-tokens
 * Update total tokens (super admin only)
 * Body: { totalTokens: number }
 */
// router.put('/update/total-tokens', validateRole([ROLES.SUPER_ADMIN]), updateTotalTokens);

/**
 * PUT /api/blockchain/allocated-tokens
 * Update allocated tokens (super admin and admin)
 * Body: { allocatedTokens: number }
 */
// router.put('/update/allocated-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateAllocatedTokens);

/**
 * PUT /api/blockchain/login-tokens
 * Update login reward tokens
 * Body: { tokens: number }
 */
// router.put('/update/login-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateLoginTokens);

/**
 * PUT /api/blockchain/registration-tokens
 * Update registration reward tokens
 * Body: { tokens: number }
 */
// router.put('/update/registration-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateRegistrationTokens);

/**
 * PUT /api/blockchain/rewards-tokens
 * Update and distribute tokens across all rewards
 * Body: { tokens: number }
 */
// router.put('/update/rewards-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateRewardsTokens);

/**
 * PUT /api/blockchain/badges-tokens
 * Update and distribute tokens across all badges
 * Body: { tokens: number }
 */
// router.put('/update/badges-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateBadgesTokens);

/**
 * PUT /api/blockchain/package-tokens
 * Update tokens for a specific package
 * Body: { pkgId: string, tokens: number }
 */
// router.put('/update/package-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updatePackageTokens);

/**
 * PUT /api/blockchain/distance-tokens
 * Update distance-based token rewards
 * Body: { distanceTokens: { "10": 20, "100": 200, "1000": 2000 } }
 */
// router.put('/update/distance-tokens', validateRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), updateDistanceTokens);

