import admin from '../config/firebase.js';

export const createAchievement = async (req, res) => {
  const db = admin.firestore();
  // Accept both pkg-id and pkg_id from client
  const { name, 'pkg-id': pkgIdDash, pkg_id, milestones, status = 'active' } = req.body;

  const pkgId = pkg_id || pkgIdDash;

  if (!name || !pkgId || !Array.isArray(milestones) || milestones.length === 0) {
    return res.status(400).json({ error: 'Name, pkg_id (or pkg-id), and milestones are required' });
  }

  try {
    // Check if achievement with same pkg_id already exists
    const existingQuery = await db
      .collection('achievements')
      .where('pkg_id', '==', pkgId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return res.status(409).json({ error: 'Achievement with this pkg_id already exists' }); // 409 Conflict
    }

    const achievement = {
      name,
      pkg_id: pkgId,
      milestone_count: milestones.length,
      milestones,
      status,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('achievements').add(achievement);
    res.status(201).json({ id: docRef.id, ...achievement });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
};


export const getAchievements = async (req, res) => {
    const db = admin.firestore();
    // Accept both pkg_id and pkg-id from query params
    const pkgId = req.query.pkg_id || req.query['pkg-id'];
    const { status } = req.query;

    try {
        let query = db.collection('achievements');
        if (status) query = query.where('status', '==', status);
        if (pkgId) query = query.where('pkg_id', '==', pkgId);

        const snapshot = await query.get();
        const achievements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(achievements);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};

export const getAchievementById = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        const doc = await db.collection('achievements').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Achievement not found' });
        }

        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching achievement:', error);
        res.status(500).json({ error: 'Failed to fetch achievement' });
    }
};

export const updateAchievement = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;
    const updates = req.body;

    // Normalize updates keys if needed, for example convert 'pkg-id' to 'pkg_id'
    if ('pkg-id' in updates) {
        updates.pkg_id = updates['pkg-id'];
        delete updates['pkg-id'];
    }

    if ('milestone-count' in updates) {
        updates.milestone_count = updates['milestone-count'];
        delete updates['milestone-count'];
    }

    try {
        const docRef = db.collection('achievements').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Achievement not found' });
        }

        await docRef.update(updates);
        res.status(200).json({ id, ...updates });
    } catch (error) {
        console.error('Error updating achievement:', error);
        res.status(500).json({ error: 'Failed to update achievement' });
    }
};

export const deleteAchievement = async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        const docRef = db.collection('achievements').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Achievement not found' });
        }

        await docRef.delete();
        res.status(200).json({ message: 'Achievement deleted successfully' });
    } catch (error) {
        console.error('Error deleting achievement:', error);
        res.status(500).json({ error: 'Failed to delete achievement' });
    }
};

export const getAchievementsByPkgId = async (req, res) => {
    const db = admin.firestore();
    // Extract the pkgId from route parameters
    const { pkgId } = req.params;

    if (!pkgId) {
        return res.status(400).json({ error: 'pkgId is required' });
    }

    try {
        // Query Firestore for documents with the provided pkgId
        const snapshot = await db.collection('achievements')
                                  .where('pkg_id', '==', pkgId)
                                  .get();

        // If there are no documents, return a 404 message
        if (snapshot.empty) {
            return res.status(404).json({ message: 'No achievements found for this pkgId' });
        }

        // Map the snapshot to an array of achievement objects
        const achievements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json(achievements);
    } catch (error) {
        console.error('Error fetching achievements by pkg_id:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};


