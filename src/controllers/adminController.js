import admin from '../config/firebase.js';
import axios from 'axios';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';
import { ROLES, ROLE_PERMISSIONS } from '../config/roles.js';

const DEFAULT_PROFILE_PICTURE_URL = 'https://gravatar.com/avatar/27205e5c51cb03f862138b22bcb5dc20f94a342e744ff6df1b8dc8af3c865109?s=200&r=mp&d=mp';

/**
 * Creates a new admin user in Firebase Auth and Firestore.
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @param {string} role - Role like 'super_admin' or 'admin'
 * @param {string} createdByUid - UID of the super admin creating this user
 * @returns {Promise<string>} UID of the created user
 */

export async function loginAdmin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Call Firebase Auth REST API to sign in
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, localId } = response.data;

    const db = admin.firestore();

    // Check Firestore if user is an active admin
    const adminDoc = await db.collection('admins').doc(localId).get();

    if (!adminDoc.exists || !adminDoc.data().active) {
      return res.status(403).json({ error: 'Unauthorized: Not an active admin' });
    }

    // Optionally update lastLogin timestamp
    await db.collection('admins').doc(localId).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return tokens and uid
    return res.status(200).json({
      message: 'Admin login successfull',
      uid: localId,
      idToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Admin login error:', err.response?.data || err.message);
    return res.status(401).json({
      error: err.response?.data?.error?.message || 'Invalid credentials',
    });
  }
}

export async function createAdminUser(req, res) {
  const db = admin.firestore();
  try {
    const { email, password, role } = req.body;
    // const createdByUid = req.adminUid; // from auth middleware

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required.' });
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // Optional: Only super_admin can create super_admin users
    if (role === ROLES.SUPER_ADMIN && req.admin.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Only super admins can create super admin users.' });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true, ///////////////////////////////////////////////////////////////////////////////////set it to false
      disabled: false,
    });

    const uid = userRecord.uid;

    // Assign default permissions based on role
    const permissions = ROLE_PERMISSIONS[role] || [];

    await db.collection('admins').doc(uid).set({
      email,
      role,
      permissions,
      profilePictureUrl: DEFAULT_PROFILE_PICTURE_URL,
      lastLogin: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // createdBy: createdByUid,
      active: true,
    });

    return res.status(201).json({ message: 'Admin created successfully', uid });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({ error: 'Failed to create admin user' });
  }
}

export async function getAdmin(req, res) {
  try {
    const { uid } = req.params;

    const db = admin.firestore();

    const adminDoc = await db.collection('admins').doc(uid).get();

    if (!adminDoc.exists) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.status(200).json({ uid, ...adminDoc.data() });
  } catch (error) {
    console.error('Error fetching admin:', error);
    return res.status(500).json({ error: 'Failed to fetch admin' });
  }
}

export async function updateAdmin(req, res) {
  try {
    const { uid } = req.params;
    const userData = req.body || {};

    // If role is updated, validate it and update permissions accordingly
    if (userData.role) {
      if (!Object.values(ROLES).includes(userData.role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }

      // Optional: Only super_admin can assign/change super_admin role
      if (
        userData.role === ROLES.SUPER_ADMIN &&
        req.admin.role !== ROLES.SUPER_ADMIN
      ) {
        return res.status(403).json({ error: 'Only super admins can assign super admin role.' });
      }

      userData.permissions = ROLE_PERMISSIONS[userData.role] || [];
    }

    if (req.file) {
      const imageUrl = await uploadToWordPress(req.file);
      userData.profilePictureUrl = imageUrl;
    }

    if (userData.mapId) {
      const mapDoc = await firestore.collection('map').doc(userData.mapId).get();
      if (!mapDoc.exists) {
        return res.status(404).json({ error: 'Map not found' });
      }
      userData.map = mapDoc.data();
    }

    userData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await firestore.collection('admins').doc(uid).update(userData);

    return res.status(200).json({ message: 'Admin updated successfully' });
  } catch (error) {
    console.error('Error updating admin:', error);
    return res.status(500).json({ error: 'Failed to update admin' });
  }
}


export async function deleteAdmin(req, res) {
  try {
    const { uid } = req.params;

    const db = admin.firestore();

    // Soft delete: set active false and updatedAt
    await db.collection('admins').doc(uid).update({
      active: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Disable Firebase Auth user
    await admin.auth().updateUser(uid, { disabled: true });

    return res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return res.status(500).json({ error: 'Failed to delete admin' });
  }
}

export async function updateLastLogin(uid) {
  try {
    const db = admin.firestore();
    await db.collection('admins').doc(uid).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lastLogin:', error);
  }
}
