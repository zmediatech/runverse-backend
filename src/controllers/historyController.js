import admin from '../config/firebase.js';

export const saveHistory = async (uid) => {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const historyRef = db.collection('userHistory').doc(uid).collection('history');

  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error('User not found');
  }

  const userData = userSnap.data();

  // Helper to fetch a single doc with selected fields
  const getDocFields = async (collection, id, fields) => {
    if (!id) return null;
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (!fields) return { id: doc.id, ...data };
    const filtered = { id: doc.id };
    for (const f of fields) {
      if (data[f] !== undefined) filtered[f] = data[f];
    }
    return filtered;
  };

  // Helper to fetch multiple docs (by IDs) and return array of selected fields
  const getDocsNames = async (collection, ids) => {
    if (!ids || !ids.length) return [];
    const docs = await Promise.all(
      ids.map(id => db.collection(collection).doc(id).get())
    );
    return docs
      .filter(d => d.exists)
      .map(d => ({ id: d.id, name: d.data().name }));
  };

  // Fetch referenced data to embed
  const map = await getDocFields('maps', userData.mapId, ['name', 'area_type']);
  const packageData = await getDocFields('packages', userData.packageId, ['name']);
  const rewards = await getDocsNames('rewards', Array.from(new Set([...(userData.rewards || []), ...(userData.redeemedRewards || [])])));
  const spinners = await getDocsNames('spinners', Array.from(new Set([...(userData.spinners || []), ...(userData.redeemedSpinners || [])])));
  const badges = await getDocsNames('badges', userData.badges || []);
  let team = null;
  if (userData.teamId) {
    const teamDoc = await db.collection('teams').doc(userData.teamId).get();
    if (teamDoc.exists) {
      const t = teamDoc.data();
      team = { id: teamDoc.id, name: t.name, members: t.members || [] };
    }
  }

  // Compose history entry embedding the fetched data and milestones
  const historyEntry = {
    uid,
    map,
    name: userData.name || '',
    package: packageData,
    payment_data: userData.payment_data || {},
    rewards,
    spinners,
    badges,
    goal: userData.goal || null,
    team,
    stats: {
      distance: userData.currentStats?.distance || 0,
      duration: userData.currentStats?.duration || 0,
      calories: userData.currentStats?.calories || 0,
      steps: userData.currentStats?.steps || 0,
      race: userData.currentStats?.race || null,
    },
    completedMilestones: userData.completedMilestones || 0,
    totalMilestones: userData.totalMilestones || 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Save snapshot to history
  await historyRef.add(historyEntry);

  // Fields to delete from user document
  const fieldsToDelete = [
    'mapId',
    'packageId',
    'payment_data',
    'goal',
    'teamId',
    'completedMilestones',
    'totalMilestones',
    'eventId',
  ];

  // Reset currentStats nested fields and paid field
  const resetFields = {
    currentStats: {
      distance: 0,
      duration: 0,
      calories: 0,
      steps: 0,
      race: null,
    },
    paid: false,
  };

  // Prepare update object with FieldValue.delete() and resets
  const updateData = {};
  fieldsToDelete.forEach(field => {
    updateData[field] = admin.firestore.FieldValue.delete();
  });

  Object.assign(updateData, resetFields);

  // Update user doc accordingly
  await userRef.update(updateData);
};

export const getHistory = async (req, res) => {
  const db = admin.firestore();
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ error: 'Missing user ID (uid)' });
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();

    const historyRef = db.collection('userHistory').doc(uid).collection('history');
    const snapshot = await historyRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return res.status(200).json({
        history: [],
        totalMilestones: userData.totalMilestones || 0,
        completedMilestones: userData.completedMilestones || 0,
        // leaderboardRank: userData.leaderboard?.rank || null, // uncomment if needed
      });
    }

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        map: data.map || null,                   // { name, area_type }
        name: data.name || '',
        package: data.package || null,           // { name }
        rewards: data.rewards || [],             // [{ id, name }]
        spinners: data.spinners || [],           // [{ id, name }]
        badges: data.badges || [],               // [{ id, name }]
        goal: data.goal || null,
        team: data.team || null,                 // { name, members }
        stats: data.stats || {},
        createdAt: data.createdAt || null,
        // leaderboardRank: userData.leaderboard?.rank || null,
      };
    });

    return res.status(200).json({
      history,
      totalMilestones: userData.totalMilestones || 0,
      completedMilestones: userData.completedMilestones || 0,
      // leaderboardRank: userData.leaderboard?.rank || null,
    });
  } catch (error) {
    console.error('Error fetching history for user:', uid, error);
    return res.status(500).json({ error: 'Failed to fetch user history' });
  }
};

// export const getHistory = async (req, res) => {
//   const db = admin.firestore();
//   const { uid } = req.params;

//   if (!uid) {
//     return res.status(400).json({ error: 'Missing user ID (uid)' });
//   }

//   try {
//     const historyRef = db.collection('userHistory').doc(uid).collection('history');
//     const snapshot = await historyRef.orderBy('createdAt', 'desc').get();

//     if (snapshot.empty) {
//       return res.status(200).json({ history: [] });
//     }

//     const history = [];
//     snapshot.forEach(doc => {
//       history.push({ id: doc.id, ...doc.data() });
//     });

//     return res.status(200).json({ history });
//   } catch (error) {
//     console.error('Error fetching history for user:', uid, error);
//     return res.status(500).json({ error: 'Failed to fetch user history' });
//   }
// };

export const saveHistoryRoute = async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid in request body' });
    }

    // Call your existing saveHistory function
    await saveHistory(uid);

    // Send success response
    res.status(200).json({ message: 'History saved and user stats reset successfully.' });
  } catch (error) {
    console.error('Error saving history:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error while saving history.' });
  }
};

// export const saveHistory = async (uid) => {
//   const db = admin.firestore();
//   const userRef = db.collection('users').doc(uid);
//   const historyRef = db.collection('userHistory').doc(uid).collection('history');

//   const userSnap = await userRef.get();
//   if (!userSnap.exists) {
//     throw new Error('User not found');
//   }

//   const userData = userSnap.data();

//   // Compose history entry
//   const historyEntry = {
//     uid,
//     mapId: userData.mapId || null,
//     name: userData.name || '',
//     packageId: userData.packageId || '',
//     payment_data: userData.payment_data || {},
//     rewards: Array.from(new Set([...(userData.rewards || []), ...(userData.redeemedRewards || [])])),
//     spinners: Array.from(new Set([...(userData.spinners || []), ...(userData.redeemedSpinners || [])])),
//     badges: userData.badges || [],
//     goal: userData.goal || null,
//     teamId: userData.teamId || null,
//     stats: {
//       distance: userData.currentStats?.distance || 0,
//       duration: userData.currentStats?.duration || 0,
//       calories: userData.currentStats?.calories || 0,
//       steps: userData.currentStats?.steps || 0,
//       race: userData.currentStats?.race || null,
//     },
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//   };

//   // Save snapshot to history
//   await historyRef.add(historyEntry);

//   // Fields to delete from user document
//   const fieldsToDelete = [
//     'mapId',
//     'packageId',
//     'payment_data',
//     'goal',
//     'teamId',
//   ];

//   // Reset currentStats nested fields and paid field
//   const resetFields = {
//     currentStats: {
//       distance: 0,
//       duration: 0,
//       calories: 0,
//       steps: 0,
//       race: null,
//     },
//     paid: false,
//   };

//   // Prepare update object with FieldValue.delete() and resets
//   const updateData = {};
//   fieldsToDelete.forEach(field => {
//     updateData[field] = admin.firestore.FieldValue.delete();
//   });

//   Object.assign(updateData, resetFields);

//   // Update user doc accordingly
//   await userRef.update(updateData);
// }