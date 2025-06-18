import admin from '../config/firebase.js';
import { saveHistory } from './historyController.js';

export const completeRun = async (req, res) => {
  const db = admin.firestore();
  const { uid, distance, duration } = req.body;

  if (!uid || !distance || !duration) {
    return res.status(400).json({ error: 'uid, distance, and duration are required' });
  }

  try {
    // Fetch user info
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();
    const { name, picture = '' } = userData;

    // Fetch all runs for the distance ordered by ascending duration (fastest first)
    const leaderboardRef = db.collection('leaderboard');
    const snapshot = await leaderboardRef
      .where('distance', '==', Number(distance))
      .orderBy('duration', 'asc')
      .get();

    const runs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Insert new run in sorted order with correct rank calculation
    let inserted = false;
    const updatedRuns = [];
    let currentRank = 1;
    let prevDuration = null;
    let prevRank = 1;
    let userRank = null;

    for (let i = 0; i <= runs.length; i++) {
      if (!inserted) {
        if (i === runs.length || runs[i].duration > duration) {
          // Insert new run here
          updatedRuns.push({
            id: null,
            uid,
            name,
            picture,
            distance: Number(distance),
            duration,
            rank: currentRank,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          userRank = currentRank;
          inserted = true;
          currentRank++; // increment after insertion
        }
      }

      if (i < runs.length) {
        const run = { ...runs[i] }; // clone to avoid mutating original
        if (prevDuration !== null && run.duration === prevDuration) {
          // Tie: same rank as previous
          run.rank = prevRank;
        } else {
          run.rank = currentRank;
          prevRank = currentRank;
          prevDuration = run.duration;
        }
        updatedRuns.push(run);
        currentRank++;
      }
    }

    // Just a safety check (shouldn't happen)
    if (!inserted) {
      userRank = currentRank;
      updatedRuns.push({
        id: null,
        uid,
        name,
        picture,
        distance: Number(distance),
        duration,
        rank: currentRank,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Debug log updated ranks before committing
    console.log('Updated runs to commit:', updatedRuns.map(r => ({
      id: r.id,
      uid: r.uid,
      duration: r.duration,
      rank: r.rank,
    })));

    // Commit batch updates:
    const batch = db.batch();

    // Update ranks of existing runs
    for (const run of updatedRuns) {
      if (run.id) {
        batch.update(db.collection('leaderboard').doc(run.id), { rank: run.rank });
      }
    }

    // Add the new run document
    const newRunData = updatedRuns.find(r => r.id === null);
    if (newRunData) {
      const { id, ...dataToAdd } = newRunData;
      batch.set(db.collection('leaderboard').doc(), dataToAdd);
    }

    await batch.commit();

    // === Added: Save history for the user after leaderboard update ===
    try {
      await saveHistory(uid);
    } catch (historyError) {
      console.error(`Failed to save history for user ${uid}:`, historyError);
      // Optional: decide whether to fail the request or ignore this error
    }

    return res.status(200).json({
      uid,
      name,
      picture,
      distance: Number(distance),
      duration,
      rank: userRank,
      message: 'Run recorded successfully',
    });
  } catch (error) {
    console.error('Error in completeRun:', error);
    return res.status(500).json({ error: 'Failed to record run' });
  }
};

/**
 * Record a team run on the team leaderboard.
 * Accepts a full `team` object with necessary fields.
 * Extracts needed fields and performs leaderboard update.
 * 
 * team - Full team object including:
 *   - id (team ID)
 *   - name
 *   - created_by
 *   - users (array)
 *   - teamProgress: { distance, duration, calories, steps, ... }
 * 
 *  - Result with rank and run info
 */
export const completeTeamRun = async (team) => {
  const db = admin.firestore();

  try {
    if (!team || !team.id || !team.teamProgress) {
      throw new Error('Invalid team object or missing teamProgress');
    }

    const teamId = team.id;
    const name = team.name || 'Unnamed Team';
    const created_by = team.created_by || null;
    const users = team.users || [];
    const membersCount = users.length;
    const logo = team.logo || '';

    const { distance, duration } = team.teamProgress;

    if (typeof distance !== 'number' || typeof duration !== 'number') {
      throw new Error('Invalid or missing distance/duration in teamProgress');
    }

    const leaderboardRef = db.collection('teamLeaderboard');
    const snapshot = await leaderboardRef
      .where('distance', '==', distance)
      .orderBy('duration', 'asc')
      .get();

    const runs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let inserted = false;
    const updatedRuns = [];
    let currentRank = 1;
    let prevDuration = null;
    let prevRank = 1;

    for (let i = 0; i <= runs.length; i++) {
      if (!inserted) {
        if (i === runs.length || runs[i].duration > duration) {
          updatedRuns.push({
            id: null,
            teamId,
            name,
            created_by,
            members: membersCount,
            logo,
            distance,
            duration,
            rank: currentRank,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          inserted = true;
          currentRank++;
        }
      }

      if (i < runs.length) {
        const run = { ...runs[i] };
        if (prevDuration !== null && run.duration === prevDuration) {
          run.rank = prevRank;
        } else {
          run.rank = currentRank;
          prevRank = currentRank;
          prevDuration = run.duration;
        }
        updatedRuns.push(run);
        currentRank++;
      }
    }

    if (!inserted) {
      updatedRuns.push({
        id: null,
        teamId,
        name,
        created_by,
        members: membersCount,
        logo,
        distance,
        duration,
        rank: currentRank,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const batch = db.batch();

    for (const run of updatedRuns) {
      if (run.id) {
        batch.update(db.collection('teamLeaderboard').doc(run.id), { rank: run.rank });
      }
    }

    const newRunData = updatedRuns.find(r => r.id === null);
    if (newRunData) {
      const { id, ...dataToAdd } = newRunData;
      batch.set(db.collection('teamLeaderboard').doc(), dataToAdd);
    }

    await batch.commit();

    // No return needed, just resolve on success
  } catch (error) {
    console.error('Error in completeTeamRun:', error);
    throw error; // Propagate to caller
  }
};

export const getLeaderboard = async (req, res) => {
  const db = admin.firestore();
  let { distance, page = 1, limit = 10 } = req.query;

  if (!distance) {
    return res.status(400).json({ error: 'Distance is required' });
  }

  page = Number(page);
  limit = Number(limit);
  distance = Number(distance);

  try {
    const leaderboardRef = db.collection('leaderboard');

    const query = leaderboardRef
      .where('distance', '==', distance)
      .orderBy('rank', 'asc')
      .offset((page - 1) * limit)
      .limit(limit);

    const snapshot = await query.get();

    const leaderboard = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data(),
      };
    });

    return res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeamLeaderboard = async (req, res) => {
  const db = admin.firestore();
  let { distance, page = 1, limit = 10 } = req.query;

  if (!distance) {
    return res.status(400).json({ error: 'Distance is required' });
  }

  page = Number(page);
  limit = Number(limit);
  distance = Number(distance);

  try {
    const leaderboardRef = db.collection('teamLeaderboard');

    const query = leaderboardRef
      .where('distance', '==', distance)
      .orderBy('rank', 'asc')
      .offset((page - 1) * limit)
      .limit(limit);

    const snapshot = await query.get();

    const leaderboard = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data(),
      };
    });

    return res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching team leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
