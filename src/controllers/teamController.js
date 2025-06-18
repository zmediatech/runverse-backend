import admin from '../config/firebase.js';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';
import { saveHistory } from './historyController.js';
import { completeTeamRun } from './leaderboardController.js';

/**
 * Get All Teams
 * - Returns all team documents
 */
export const getAllTeams = async (req, res) => {
  const db = admin.firestore();
  try {
    const teamsSnap = await db.collection('teams').get();
    const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ teams });
  } catch (error) {
    console.error('Error fetching all teams:', error);
    return res.status(500).json({ error: 'Failed to get teams' });
  }
};

/**
 * Create Team
 * - Uploads logo via middleware
 * - Creates team doc with initial assignments (full distance to creator)
 * - Added try/catch around uploadToWordPress to handle upload errors gracefully
 */
export const createTeam = async (req, res) => {
  const db = admin.firestore();
  try {
    const {
      uid,
      member_limit,
      name,
      distance, // should be passed from frontend/package
    } = req.body;
    const created_by = uid;
    let logo = "";

    if (!created_by || !member_limit || !name || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is already part of a team
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userSnap.data();
    if (userData.teamId) {
      return res.status(400).json({ error: 'You are already part of a team' });
    }

    // Added error handling for logo upload to avoid crashing team creation if upload fails
    if (req.file) {
      try {
        const logoUrl = await uploadToWordPress(req.file);
        logo = logoUrl; // Save the image URL in logo
        console.log('Image uploaded successfully:', logo);
      } catch (uploadError) {
        console.error('Error uploading logo:', uploadError);
        // Assign a default example image URL if upload fails
        logo = 'https://placehold.co/600x400/000000/FFFFFF/png'; // <-- Replace with your placeholder image URL
        console.log('Using default logo due to upload failure:', logo);
      }
    } else {
      // If no file provided, optionally assign default logo here too
      logo = 'https://placehold.co/600x400/000000/FFFFFF/png'; // Optional fallback if no logo uploaded at all
    }

    // Create initial assignments with full distance to creator
    const assignments = { [created_by]: Number(distance) };

    const newTeam = {
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by,
      logo,
      member_limit: Number(member_limit),
      members: 1,
      name,
      users: [created_by],
      distance: Number(distance),
      runStatus: 'waiting',
      startTime: null,
      assignments,
      completed: [],
    };

    const teamRef = await db.collection('teams').add(newTeam);

    // Save teamId and goal in users collection as well
    await db.collection('users').doc(created_by).update({ 
      teamId: teamRef.id,
      goal: Number(distance),
    });

    return res.status(201).json({ teamId: teamRef.id, ...newTeam });
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({ error: 'Failed to create team' });
  }
};

/**
 * Join Team
 * - Added Firestore transaction to prevent race conditions with concurrent joins
 * - Reads team and user inside transaction and updates atomically
 */
export const joinTeam = async (req, res) => {
  const db = admin.firestore();
  try {
    const { teamId, uid } = req.body;

    if (!teamId || !uid) {
      return res.status(400).json({ error: 'Missing teamId or uid' });
    }

    await db.runTransaction(async (transaction) => {
      const teamRef = db.collection('teams').doc(teamId);
      const userRef = db.collection('users').doc(uid);

      // Get team and user docs atomically inside transaction
      const teamSnap = await transaction.get(teamRef);
      const userSnap = await transaction.get(userRef);

      if (!teamSnap.exists) {
        throw new Error('Team not found');
      }
      if (!userSnap.exists) {
        throw new Error('User not found');
      }

      const team = teamSnap.data();
      const user = userSnap.data();

      // Validation checks inside transaction to ensure consistent state
      if (user.teamId) {
        throw new Error('You are already part of some team');
      }

      if (team.runStatus === 'started' && team.members < team.member_limit) {
        throw new Error('Run already started, cannot join now');
      }

      if (team.users.includes(uid)) {
        throw new Error('User already in team');
      }

      if (team.members >= team.member_limit) {
        throw new Error('Team is full');
      }

      // Fetch leader (created_by) doc to get map info
      const leaderRef = db.collection('users').doc(team.created_by);
      const leaderSnap = await transaction.get(leaderRef);
      if (!leaderSnap.exists) {
        throw new Error('Team leader (created_by) not found');
      }
      const leaderData = leaderSnap.data();

      // Add user to users array and update member count
      const newUsers = [...team.users, uid];
      const newMembersCount = newUsers.length;

      // Recalculate assignments evenly
      const perUserDistance = team.distance / newMembersCount;
      const newAssignments = {};
      newUsers.forEach((userUid) => {
        newAssignments[userUid] = Number(perUserDistance.toFixed(2));
      });

      // Update team document atomically
      transaction.update(teamRef, {
        users: newUsers,
        members: newMembersCount,
        assignments: newAssignments,
      });

      // Update user document with teamId, goal, status and leader's map info
      transaction.update(userRef, {
        teamId: teamId,
        goal: Number(newAssignments[uid]),
        status: 'active',
        paid: true,
        mapId: leaderData.mapId || null,
        map: leaderData.map || null,
      });
    });

    return res.status(200).json({
      message: 'User added to team',
    });
  } catch (error) {
    console.error('Error joining team:', error);
    // Return friendly error messages for known conditions
    const errMsg = error.message || 'Failed to join team';
    return res.status(400).json({ error: errMsg });
  }
};


/**
 * Get My Team
 * - Fetches user’s team with full user documents
 * - No changes, already correct
 */
export const getMyTeam = async (req, res) => {
  const db = admin.firestore();
  try {
    const { uid } = req.params;

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { teamId } = userSnap.data();

    if (!teamId) {
      return res.status(404).json({ message: 'User is not in any team' });
    }

    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const teamData = teamSnap.data();

    const userIds = teamData.users || [];
    const userDocsPromises = userIds.map((userId) => db.collection('users').doc(userId).get());
    const userDocs = await Promise.all(userDocsPromises);

    const fullUsers = userDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({
      team: {
        id: teamSnap.id,
        ...teamData,
        users: fullUsers,
      },
    });
  } catch (error) {
    console.error('Error fetching user team:', error);
    return res.status(500).json({ error: 'Failed to get team' });
  }
};

/**
 * Start Team Run
 * - No change, batch update is good here
 */
export const startTeamRun = async (req, res) => {
  const db = admin.firestore();
  try {
    const { teamId, uid } = req.body;

    if (!teamId || !uid) {
      return res.status(400).json({ error: 'Missing teamId or uid' });
    }

    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamSnap.data();

    if (team.created_by !== uid) {
      return res.status(403).json({ error: 'Only team creator can start the run' });
    }

    if (team.runStatus !== 'waiting') {
      return res.status(400).json({ error: 'Run already started or completed' });
    }

    await teamRef.update({
      runStatus: 'started',
      startTime: admin.firestore.FieldValue.serverTimestamp(),
    });

    const batch = db.batch();
    Object.entries(team.assignments).forEach(([userUid, goalDistance]) => {
      const userRef = db.collection('users').doc(userUid);
      batch.update(userRef, {
        goal: Number(goalDistance),
      });
    });
    await batch.commit();

    return res.status(200).json({ message: 'Team run started successfully' });
  } catch (error) {
    console.error('Error starting team run:', error);
    return res.status(500).json({ error: 'Failed to start team run' });
  }
};

/**
 * Complete User Run
 * - Parallelized saveHistory calls with Promise.all for better performance
 * - Kept user goal/teamId clearing commented out, pending business logic decision
 */
// export const completeUserRun = async (req, res) => {
//   const db = admin.firestore();
//   try {
//     const { teamId, uid } = req.body;

//     if (!teamId || !uid) {
//       return res.status(400).json({ error: 'Missing teamId or uid' });
//     }

//     const teamRef = db.collection('teams').doc(teamId);
//     const userRef = db.collection('users').doc(uid);

//     const teamSnap = await teamRef.get();
//     if (!teamSnap.exists) {
//       return res.status(404).json({ error: 'Team not found' });
//     }

//     const team = teamSnap.data();

//     if (!team.users.includes(uid)) {
//       return res.status(403).json({ error: 'User not part of the team' });
//     }

//     await teamRef.update({
//       completed: admin.firestore.FieldValue.arrayUnion(uid),
//     });

//     // Optional: clear user's goal and teamId on completion
//     // await userRef.update({
//     //   goal: null,
//     //   teamId: null,
//     // });

//     const updatedTeamSnap = await teamRef.get();
//     const updatedTeam = updatedTeamSnap.data();

//     if (
//       updatedTeam.completed &&
//       updatedTeam.completed.length === updatedTeam.users.length
//     ) {
//       try {
//         // Run all saveHistory calls in parallel
//         await Promise.all(
//           updatedTeam.users.map(userId => saveHistory(userId))
//         );
//       } catch (err) {
//         console.error('Failed to save history for some users:', err);
//       }

//       await teamRef.update({
//         runStatus: 'completed',
//         completedTime: admin.firestore.FieldValue.serverTimestamp(),
//       });
//     }

//     return res.status(200).json({ message: 'User run marked as complete' });
//   } catch (error) {
//     console.error('Error completing user run:', error);
//     return res.status(500).json({ error: 'Failed to complete user run' });
//   }
// };

/**
 * Remove Team Member
 * - Wrapped in Firestore transaction for atomic read-check-update
 * - Ensures consistent removal, assignment redistribution, and batch updates
 * - saveHistory called before transaction (outside) to avoid long transaction
 */
export const removeTeamMember = async (req, res) => {
  const db = admin.firestore();
  const { teamId, userIdToRemove, requestedBy } = req.body;

  if (!teamId || !userIdToRemove || !requestedBy) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Call saveHistory before transaction to avoid long transaction locks
    await saveHistory(userIdToRemove);

    await db.runTransaction(async (transaction) => {
      const teamRef = db.collection('teams').doc(teamId);
      const userRefToRemove = db.collection('users').doc(userIdToRemove);

      const teamSnap = await transaction.get(teamRef);
      if (!teamSnap.exists) throw new Error('Team not found');

      const team = teamSnap.data();

      if (!team.users.includes(userIdToRemove)) {
        throw new Error('User to remove is not part of the team');
      }

      // Authorization check: only self or creator can remove
      if (requestedBy !== userIdToRemove && requestedBy !== team.created_by) {
        throw new Error('Unauthorized to remove this user');
      }

      // Remove user from users array and assignments
      const newUsers = team.users.filter(u => u !== userIdToRemove);
      const newAssignments = { ...team.assignments };
      const removedUserAssignment = newAssignments[userIdToRemove] || 0;
      delete newAssignments[userIdToRemove];

      // Redistribute removed user's assignment evenly among remaining members
      const share = newUsers.length > 0 ? removedUserAssignment / newUsers.length : 0;
      newUsers.forEach(u => {
        newAssignments[u] = (newAssignments[u] || 0) + share;
      });

      // Clear completed array since assignments changed
      const clearedCompleted = [];

      // Batch updates inside transaction
      transaction.update(teamRef, {
        users: newUsers,
        assignments: newAssignments,
        members: newUsers.length,
        completed: clearedCompleted,
      });

      // Reset removed user fields by deleting teamId and goal
      transaction.update(userRefToRemove, {
        teamId: admin.firestore.FieldValue.delete(),
        goal: admin.firestore.FieldValue.delete(),
      });

      // Update remaining users' goals to new assignment values
      newUsers.forEach(u => {
        const userRef = db.collection('users').doc(u);
        transaction.update(userRef, {
          goal: newAssignments[u],
        });
      });
    });

    return res.status(200).json({ message: `User ${userIdToRemove} removed and assignments redistributed. Completed array reset.` });
  } catch (error) {
    console.error('Error removing user from team:', error);
    const errMsg = error.message || 'Failed to remove user from team';
    return res.status(400).json({ error: errMsg });
  }
};

export const completeUserRun = async (req, res) => {
  const db = admin.firestore();
  try {
    const { teamId, uid } = req.body;

    if (!teamId || !uid) {
      return res.status(400).json({ error: 'Missing teamId or uid' });
    }

    const teamRef = db.collection('teams').doc(teamId);
    const userRef = db.collection('users').doc(uid);

    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamSnap.data();

    if (!team.users.includes(uid)) {
      return res.status(403).json({ error: 'User not part of the team' });
    }

    await teamRef.update({
      completed: admin.firestore.FieldValue.arrayUnion(uid),
    });

    // Optional: clear user's goal and teamId on completion
    // await userRef.update({
    //   goal: null,
    //   teamId: null,
    // });

    const updatedTeamSnap = await teamRef.get();
    const updatedTeam = updatedTeamSnap.data();

    if (
      updatedTeam.completed &&
      updatedTeam.completed.length === updatedTeam.users.length
    ) {
      try {
        // Run all saveHistory calls in parallel
        await Promise.all(
          updatedTeam.users.map(userId => saveHistory(userId))
        );
      } catch (err) {
        console.error('Failed to save history for some users:', err);
      }

      // Aggregate all users' currentStats for teamProgress
      const userDocs = await Promise.all(
        updatedTeam.users.map(userId => db.collection('users').doc(userId).get())
      );

      // Initialize aggregated stats
      const teamProgress = {
        calories: 0,
        distance: 0,
        duration: 0,
        steps: 0,
        // You can add more stats if needed
      };

      userDocs.forEach(doc => {
        if (!doc.exists) return;
        const stats = doc.data().currentStats || {};
        teamProgress.calories += Number(stats.calories) || 0;
        teamProgress.distance += Number(stats.distance) || 0;
        teamProgress.duration += Number(stats.duration) || 0;
        teamProgress.steps += Number(stats.steps) || 0;
      });

      // Update team with aggregated progress and mark run completed
      await teamRef.update({
        runStatus: 'completed',
        completedTime: admin.firestore.FieldValue.serverTimestamp(),
        teamProgress,
      });

      const fullTeam = {
        id: teamSnap.id,  // Firestore doc ID
        ...team,          // all other fields
      };

      await completeTeamRun(fullTeam);
    }

    return res.status(200).json({ message: 'User run marked as complete' });
  } catch (error) {
    console.error('Error completing user run:', error);
    return res.status(500).json({ error: 'Failed to complete user run' });
  }
};


/**
 * Leader manually ends run for all
 * - Aggregates all users' currentStats
 * - Stores in team as teamProgress
 * - Sets runStatus to 'incomplete'
 * - Does NOT update leaderboard
 */
export const endRunForAll = async (req, res) => {
  const db = admin.firestore();
  try {
    const { teamId, uid } = req.body;

    if (!teamId || !uid) {
      return res.status(400).json({ error: 'Missing teamId or uid' });
    }

    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = teamSnap.data();

    if (team.created_by !== uid) {
      return res.status(403).json({ error: 'Only team creator can end run for all' });
    }

    // Fetch all users' currentStats BEFORE calling saveHistory
    const userDocs = await Promise.all(
      team.users.map(userId => db.collection('users').doc(userId).get())
    );

    const teamProgress = {
      calories: 0,
      distance: 0,
      duration: 0,
      steps: 0,
    };

    userDocs.forEach(doc => {
      if (!doc.exists) return;
      const stats = doc.data().currentStats || {};
      teamProgress.calories += Number(stats.calories) || 0;
      teamProgress.distance += Number(stats.distance) || 0;
      teamProgress.duration += Number(stats.duration) || 0;
      teamProgress.steps += Number(stats.steps) || 0;
    });

    // Now save history for all users AFTER progress aggregation
    try {
      await Promise.all(
        team.users.map(userId => saveHistory(userId))
      );
    } catch (err) {
      console.error('Failed to save history for some users:', err);
    }

    await teamRef.update({
      runStatus: 'incomplete',
      teamProgress,
      lastEndRunBy: uid,
      lastEndRunTime: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: 'Run ended for all users, progress saved with incomplete status', teamProgress });
  } catch (error) {
    console.error('Error ending run for all:', error);
    return res.status(500).json({ error: 'Failed to end run for all' });
  }
};


