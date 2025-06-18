import { ROLES, PERMISSIONS } from '../config/roles.js';

/**
 * Check if a role is valid.
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Check if a permission is valid.
 * @param {string} permission
 * @returns {boolean}
 */
export function isValidPermission(permission) {
  return Object.values(PERMISSIONS).includes(permission);
}

/**
 * Validate an array of permissions.
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function areValidPermissions(permissions) {
  if (!Array.isArray(permissions)) return false;
  return permissions.every(isValidPermission);
}


//EXAMPLE USAGE
// import { isValidRole, areValidPermissions } from '../utils/validation.js';

// if (!isValidRole(role)) {
//   return res.status(400).json({ error: 'Invalid role specified.' });
// }

// if (permissions && !areValidPermissions(permissions)) {
//   return res.status(400).json({ error: 'One or more invalid permissions specified.' });
// }
