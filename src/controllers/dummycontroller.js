/**
 * Get current token configuration and stats
 */
 // export async function getTokenConfig(req, res) {
 //     try {
 //         const db = admin.firestore();
 //
 //         // Get token configuration
 //         const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
 //
 //         if (!tokenConfigDoc.exists) {
 //             // Initialize default configuration if it doesn't exist
 //             const defaultConfig = {
 //                 totalTokens: 0,
 //                 allocatedTokens: 0,
 //                 spentTokens: 0,
 //                 loginTokens: 0,
 //                 registrationTokens: 0,
 //                 rewardsTokens: 0,
 //                 badgesTokens: 0,
 //                 packageTokens: [],
 //                 distanceTokens: {},
 //                 createdAt: admin.firestore.FieldValue.serverTimestamp(),
 //                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
 //             };
 //
 //             await db.collection('blockchain_config').doc('token_settings').set(defaultConfig);
 //
 //             return res.status(200).json({
 //                 message: 'Token configuration initialized',
 //                 config: {
 //                     ...defaultConfig,
 //                     remainingTokens: 0
 //                 }
 //             });
 //         }
 //
 //         const config = tokenConfigDoc.data();
 //         const remainingTokens = config.allocatedTokens - config.spentTokens;
 //
 //         return res.status(200).json({
 //             message: 'Token configuration retrieved successfully',
 //             config: {
 //                 ...config,
 //                 remainingTokens
 //             }
 //         });
 //
 //     } catch (error) {
 //         console.error('Error getting token configuration:', error);
 //         return res.status(500).json({ error: 'Failed to retrieve token configuration' });
 //     }
 // }

/**
 * Update login token reward
 */
// export async function updateLoginTokens(req, res) {
//   const { tokens } = req.body;
//   
//   if (tokens === undefined || tokens < 0) {
//     return res.status(400).json({ error: 'Valid token amount is required' });
//   }
//   
//   try {
//     const db = admin.firestore();
//     
//     await db.collection('blockchain_config').doc('token_settings').update({
//       loginTokens: tokens,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });
//     
//     return res.status(200).json({
//       message: 'Login tokens updated successfully',
//       loginTokens: tokens
//     });
//     
//   } catch (error) {
//     console.error('Error updating login tokens:', error);
//     return res.status(500).json({ error: 'Failed to update login tokens' });
//   }
// }

/**
 * Update registration token reward
 */
// export async function updateRegistrationTokens(req, res) {
//   const { tokens } = req.body;
//   
//   if (tokens === undefined || tokens < 0) {
//     return res.status(400).json({ error: 'Valid token amount is required' });
//   }
//   
//   try {
//     const db = admin.firestore();
//     
//     await db.collection('blockchain_config').doc('token_settings').update({
//       registrationTokens: tokens,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });
//     
//     return res.status(200).json({
//       message: 'Registration tokens updated successfully',
//       registrationTokens: tokens
//     });
//     
//   } catch (error) {
//     console.error('Error updating registration tokens:', error);
//     return res.status(500).json({ error: 'Failed to update registration tokens' });
//   }
// }

/**
 * Update rewards collection tokens (distributes across all rewards)
 */
// export async function updateRewardsTokens(req, res) {
//     const { tokens } = req.body;
//
//     if (tokens === undefined || tokens < 0) {
//         return res.status(400).json({ error: 'Valid token amount is required' });
//     }
//
//     try {
//         const db = admin.firestore();
//
//         // Get all rewards
//         const rewardsSnapshot = await db.collection('rewards').get();
//         const rewardCount = rewardsSnapshot.size;
//
//         if (rewardCount === 0) {
//             return res.status(400).json({ error: 'No rewards found to update tokens' });
//         }
//
//         // Assign the same tokens value to all rewards
//         const batch = db.batch();
//
//         rewardsSnapshot.forEach((doc) => {
//             batch.update(doc.ref, {
//                 tokens,
//                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
//             });
//         });
//
//         // Update configuration
//         batch.update(db.collection('blockchain_config').doc('token_settings'), {
//             rewardsTokens: tokens,
//             updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//
//         await batch.commit();
//
//         return res.status(200).json({
//             message: 'Rewards tokens updated successfully',
//             tokensAssigned: tokens,
//             rewardCount
//         });
//
//     } catch (error) {
//         console.error('Error updating rewards tokens:', error);
//         return res.status(500).json({ error: 'Failed to update rewards tokens' });
//     }
// }

/**
 * Update badges collection tokens (distributes across all badges)
 */
// export async function updateBadgesTokens(req, res) {
//     const { tokens } = req.body;
//     
//     if (tokens === undefined || tokens < 0) {
//         return res.status(400).json({ error: 'Valid token amount is required' });
//     }
//     
//     try {
//         const db = admin.firestore();
//         
//         // Get all badges
//         const badgesSnapshot = await db.collection('badges').get();
//         const badgeCount = badgesSnapshot.size;
//         
//         if (badgeCount === 0) {
//             return res.status(400).json({ error: 'No badges found to update tokens' });
//         }
//         
//         // Assign the same tokens value to all badges
//         const batch = db.batch();
//         
//         badgesSnapshot.forEach((doc) => {
//             batch.update(doc.ref, {
//                 tokens,
//                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
//             });
//         });
//         
//         // Update configuration
//         batch.update(db.collection('blockchain_config').doc('token_settings'), {
//             badgesTokens: tokens,
//             updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//         
//         await batch.commit();
//         
//         return res.status(200).json({
//             message: 'Badges tokens updated successfully',
//             tokensAssigned: tokens,
//             badgeCount
//         });
//         
//     } catch (error) {
//         console.error('Error updating badges tokens:', error);
//         return res.status(500).json({ error: 'Failed to update badges tokens' });
//     }
// }

/**
 * Update package tokens
 */
// export async function updatePackageTokens(req, res) {
//   const { pkgId, tokens } = req.body;
//   
//   if (!pkgId || tokens === undefined || tokens < 0) {
//     return res.status(400).json({ error: 'Package ID and valid token amount are required' });
//   }
//   
//   try {
//     const db = admin.firestore();
//     
//     // Update the specific package
//     const packageDoc = await db.collection('packages').doc(pkgId).get();
//     
//     if (!packageDoc.exists) {
//       return res.status(404).json({ error: 'Package not found' });
//     }
//     
//     await db.collection('packages').doc(pkgId).update({
//       tokens,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });
//     
//     // Update the package tokens array in configuration
//     const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
//     const currentConfig = tokenConfigDoc.data();
//     
//     let packageTokens = currentConfig.packageTokens || [];
//     const existingIndex = packageTokens.findIndex(pkg => pkg.pkgId === pkgId);
//     
//     if (existingIndex >= 0) {
//       packageTokens[existingIndex].tokens = tokens;
//     } else {
//       packageTokens.push({ pkgId, tokens });
//     }
//     
//     await db.collection('blockchain_config').doc('token_settings').update({
//       packageTokens,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });
//     
//     return res.status(200).json({
//       message: 'Package tokens updated successfully',
//       pkgId,
//       tokens
//     });
//     
//   } catch (error) {
//     console.error('Error updating package tokens:', error);
//     return res.status(500).json({ error: 'Failed to update package tokens' });
//   }
// }

/**
 * Update distance-based token rewards
 */
// export async function updateDistanceTokens(req, res) {
//   const { distanceTokens } = req.body;
//
//   if (!distanceTokens || typeof distanceTokens !== 'object') {
//     return res.status(400).json({ 
//       error: 'Valid distance tokens object is required',
//       example: { "10": 20, "100": 200, "1000": 2000 }
//     });
//   }
//
//   // Validate all keys are numeric and values are positive numbers
//   for (const [distance, tokens] of Object.entries(distanceTokens)) {
//     if (isNaN(distance) || isNaN(tokens) || tokens < 0) {
//       return res.status(400).json({ 
//         error: 'All distances and token amounts must be valid positive numbers' 
//       });
//     }
//   }
//
//   try {
//     const db = admin.firestore();
//     const configRef = db.collection('blockchain_config').doc('token_settings');
//     const doc = await configRef.get();
//
//     if (!doc.exists) {
//       return res.status(404).json({ error: 'Token settings not found' });
//     }
//
//     const currentConfig = doc.data();
//     const currentDistanceTokens = currentConfig.distanceTokens || {};
//
//     // Merge the new distances into the existing config
//     const updatedDistanceTokens = { ...currentDistanceTokens };
//
//     for (const [distance, tokens] of Object.entries(distanceTokens)) {
//       updatedDistanceTokens[distance] = tokens; // Update or insert
//     }
//
//     await configRef.update({
//       distanceTokens: updatedDistanceTokens,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });
//
//     return res.status(200).json({
//       message: 'Distance tokens updated successfully',
//       distanceTokens: updatedDistanceTokens
//     });
//
//   } catch (error) {
//     console.error('Error updating distance tokens:', error);
//     return res.status(500).json({ error: 'Failed to update distance tokens' });
//   }
// }

/**
 * Award tokens to user (internal function used by other systems)
 */
// export async function allocateTokensToUser(uid, category, reason, metadata = {}) {
//   if (!uid || !category) {
//     throw new Error('Valid UID and category are required');
//   }
//
//   try {
//     const db = admin.firestore();
//     
//     // Get token configuration from the blockchain_config collection
//     const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
//     const config = tokenConfigDoc.data();
//     
//     let tokenAmount;
//     
//     // Determine token amount based on category
//     switch (category) {
//       case 'login':
//         tokenAmount = config.loginTokens;
//         break;
//         
//       case 'registration':
//         tokenAmount = config.registrationTokens;
//         break;
//         
//       case 'rewards':
//         // For rewards, we require rewardId in metadata
//         const { rewardId } = metadata;
//         if (!rewardId) throw new Error('Reward ID is required for rewards category');
//         
//         // Fetch the reward document to get the token amount
//         const rewardDoc = await db.collection('rewards').doc(rewardId).get();
//         if (!rewardDoc.exists) return;  // No tokens for this reward, skip allocation
//         
//         tokenAmount = rewardDoc.data().tokens;
//         break;
//         
//       case 'badges':
//         // For badges, we require badgeId in metadata
//         const { badgeId } = metadata;
//         if (!badgeId) throw new Error('Badge ID is required for badges category');
//         
//         // Fetch the badge document to get the token amount
//         const badgeDoc = await db.collection('badges').doc(badgeId).get();
//         if (!badgeDoc.exists) return;  // No tokens for this badge, skip allocation
//         
//         tokenAmount = badgeDoc.data().tokens;
//         break;
//         
//       case 'packages':
//         // For packages, we require pkgId in metadata
//         const { pkgId } = metadata;
//         if (!pkgId) throw new Error('Package ID is required for packages category');
//         
//         // Find the tokens for the specific package
//         const pkg = config.packageTokens.find(pkg => pkg.pkgId === pkgId);
//         if (!pkg) return;  // No tokens for this package, skip allocation
//         
//         tokenAmount = pkg.tokens;
//         break;
//         
//       case 'runDistance':
//         // For distance-based allocation, we require distance in metadata
//         const { distance } = metadata;
//         if (!distance) throw new Error('Distance is required for runDistance category');
//         
//         // Find the tokens for the specified distance
//         const distanceCategory = config.distanceTokens[distance];
//         if (!distanceCategory) return;  // No tokens for this distance, skip allocation
//         
//         tokenAmount = distanceCategory.tokens;
//         break;
//         
//       default:
//         return;  // Invalid category, skip allocation
//     }
//
//     // If no tokens are allocated for the category, just return without any action
//     if (tokenAmount === undefined || tokenAmount <= 0) {
//       return;
//     }
//
//     // Call the addTokens function to add tokens to the user's wallet
//     const result = await addTokens(uid, tokenAmount, reason);
//
//     // Update spent tokens in token config
//     await db.collection('blockchain_config').doc('token_settings').update({
//       spentTokens: admin.firestore.FieldValue.increment(tokenAmount),
//       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//     });
//
//     // Log the transaction in the token transactions collection
//     await db.collection('token_transactions').add({
//       userId: uid,
//       amount: tokenAmount,
//       type: 'allocated',
//       reason,
//       metadata: JSON.parse(JSON.stringify(metadata || {})), // ensures clean plain object
//       status: 'completed',
//       createdAt: admin.firestore.FieldValue.serverTimestamp() // ✅ Safe here
//     });
//
//     return result;
//   } catch (error) {
//     console.error('Error allocating tokens to user:', error);
//     throw new Error(error.message || 'Failed to allocate tokens to user');
//   }
// }
//
// // Example call to allocate tokens to a user
// // const result = await allocateTokensToUser(
// //   'user-uid',
// //   100,                // Token amount
// //   'Rewards for completing task',  // Reason for allocation
// //   { taskId: 'task-1234' }  // Optional metadata
// // );

/**
 * Get token statistics and overview
 */
// export async function getTokenStats(req, res) {
//   try {
//     const db = admin.firestore();
//     
//     // Get token configuration
//     const tokenConfigDoc = await db.collection('blockchain_config').doc('token_settings').get();
//     const config = tokenConfigDoc.data();
//     
//     // Get total users with wallets
//     const walletsSnapshot = await db.collection('wallets').get();
//     const totalUsers = walletsSnapshot.size;
//     
//     // Calculate total tokens in circulation (user wallets)
//     let totalInCirculation = 0;
//     walletsSnapshot.forEach(doc => {
//       totalInCirculation += doc.data().balance || 0;
//     });
//     
//     // Get recent transactions count
//     const recentTransactions = await db.collection('token_transactions')
//       .orderBy('createdAt', 'desc')
//       .limit(10)
//       .get();
//     
//     const stats = {
//       totalTokens: config.totalTokens,
//       allocatedTokens: config.allocatedTokens,
//       spentTokens: config.spentTokens,
//       remainingTokens: config.allocatedTokens - config.spentTokens,
//       totalInCirculation,
//       totalUsers,
//       recentTransactionCount: recentTransactions.size,
//       utilizationRate: ((config.spentTokens / config.allocatedTokens) * 100).toFixed(2)
//     };
//     
//     return res.status(200).json({
//       message: 'Token statistics retrieved successfully',
//       stats
//     });
//     
//   } catch (error) {
//     console.error('Error getting token statistics:', error);
//     return res.status(500).json({ error: 'Failed to retrieve token statistics' });
//   }
// }
