export const PERMISSIONS = {
  TEAMS: 'teams',
  USERS: 'users',
  SPINNERS: 'spinners',
  PACKAGES: 'packages',
  EVENTS: 'events',
  ACHIEVEMENTS: 'achievements',
  REWARDS: 'rewards',
  BADGES: 'badges',
  MAPS: 'maps',
};

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
};

// Define which permissions each role has by default
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  [ROLES.ADMIN]: [
    PERMISSIONS.TEAMS,
    PERMISSIONS.USERS,
    PERMISSIONS.SPINNERS,
    PERMISSIONS.PACKAGES,
    PERMISSIONS.EVENTS,
    PERMISSIONS.ACHIEVEMENTS,
    PERMISSIONS.REWARDS,
    PERMISSIONS.BADGES,
    PERMISSIONS.MAPS,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.SPINNERS,
    PERMISSIONS.PACKAGES,
    PERMISSIONS.EVENTS,
    PERMISSIONS.ACHIEVEMENTS,
    PERMISSIONS.REWARDS,
    PERMISSIONS.BADGES,
    PERMISSIONS.MAPS,
  ],
};
