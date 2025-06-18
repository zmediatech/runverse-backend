import admin from '../config/firebase.js';

// export const verifyToken = async (req, res, next) => {
//   const token = req.headers.authorization?.split('Bearer ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(token);
//     req.user = decodedToken;
//     next();
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

// export const verifyAdminToken = async (req, res, next) => {
//   const token = req.headers.authorization?.split('Bearer ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   try {
//     const decodedToken = await admin.auth().verifyIdToken(token);
//     const uid = decodedToken.uid;

//     // Check if user is an active admin
//     const adminDoc = await admin.firestore().collection('admins').doc(uid).get();

//     if (!adminDoc.exists || !adminDoc.data().active) {
//       return res.status(403).json({ error: 'Access denied: Not an active admin' });
//     }

//     // Attach user info and admin data to request object
//     req.user = decodedToken;
//     req.admin = adminDoc.data();

//     next();
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const firestore = admin.firestore();

    // Try to fetch admin doc
    const adminDoc = await firestore.collection('admins').doc(uid).get();

    if (adminDoc.exists && adminDoc.data().active) {
      // User is an active admin
      req.admin = adminDoc.data();
      req.admin.uid = uid; // add uid for convenience
      req.user = decodedToken; // also attach decoded token
      return next();
    }

    // If not admin, try to fetch user doc
    const userDoc = await firestore.collection('users').doc(uid).get();

    if (userDoc.exists && userDoc.data().active) {
      // User is an active regular user
      req.user = { ...userDoc.data(), uid, decodedToken };
      return next();
    }

    // Neither active admin nor active user found
    return res.status(403).json({ error: 'Access denied: User not found or inactive' });

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};