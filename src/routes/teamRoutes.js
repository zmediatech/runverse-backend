// import { Router } from 'express';
// import { createTeam, joinTeam, getMyTeam } from '../controllers/teamController.js';
// import upload from '../middleware/upload.js';

// const router = Router();

// // router.post('/create', createTeam);
// router.post('/create', upload.single('logo'), createTeam);
// router.post('/join', joinTeam);
// router.get('/my-team/:uid', getMyTeam);

// export default router;

import { Router } from 'express';
import upload from '../middleware/upload.js';
import {
  createTeam,
  joinTeam,
  getMyTeam,
  startTeamRun,
  completeUserRun,
  getAllTeams,
  removeTeamMember,
  endRunForAll
} from '../controllers/teamController.js';

const router = Router();

router.post('/create', upload.single('logo'), createTeam);
router.post('/join', joinTeam);
router.get('/my-team/:uid', getMyTeam);

// New endpoints for run control
router.post('/start-run', startTeamRun);       // Only creator can start run
router.post('/complete-run', completeUserRun); // User marks their run complete
router.get('/get-teams', getAllTeams); // Get all teams
router.post('/remove-member', removeTeamMember); // Remove a member from the team
router.post('/end-team-run', endRunForAll);

export default router;
