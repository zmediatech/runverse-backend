/**
 * Middleware to enforce permissions per route/module.
 * @param {string} permission - The permission required to access the route.
 */
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Unauthorized: Admin info missing' });
  }

  if (!req.admin.permissions || !req.admin.permissions.includes(permission)) {
    return res.status(403).json({ error: `Forbidden: Missing permission '${permission}'` });
  }

  next();
};

// USE EXAMPLES
// import express from 'express';
// import { requirePermission } from '../middleware/permissions.js';
// import { PERMISSIONS } from '../config/roles.js';

// const router = express.Router();

// // Example: only admins with 'teams' permission can access this route
// router.post(
//   '/teams/create',
//   verifyAdminToken,            // your auth middleware to populate req.admin
//   requirePermission(PERMISSIONS.TEAMS),
//   createTeamHandler
// );
