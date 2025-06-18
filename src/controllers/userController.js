import admin from '../config/firebase.js';
import axios from 'axios';
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { uploadToWordPress } from '../utils/uploadToWordPress.js';
import { createWooCommerceCustomer } from '../utils/woocommerce.js';
import jwt from 'jsonwebtoken';
import { createWallet } from './walletController.js'; // Import createWallet function
import { allocateTokensToUser } from '../controllers/blockchainController.js'; // Import allocateTokensToUser function

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),  // Convert port to integer
  secure: process.env.SMTP_PORT === "465",  // Use SSL for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GENERATE LOGIN TOKEN FOR WOOCOMMERCE
export async function generateLoginToken(req, res) {
  const { uid } = req.params;
  const db = admin.firestore();

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (!userData.wooCustomerId) {
      return res.status(400).json({ error: 'WooCommerce customer ID not linked' });
    }

    // Payload includes Firebase UID and WooCommerce customer ID
    const payload = {
      uid,
      wooCustomerId: userData.wooCustomerId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m', // Set default expiry if env var not set
    });

    const url = `https://multivendor.zmedia.com.pk/autologin?token=${token}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error('Error generating login token:', error);
    return res.status(500).json({ error: 'Failed to generate login token' });
  }
}

// Verify JWT token and return WooCommerce customer ID
export async function verifyWooToken(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const wooCustomerId = decoded.wooCustomerId;
    if (!wooCustomerId) {
      return res.status(401).json({ error: 'Invalid token: missing WooCommerce customer ID' });
    }

    // Optionally: Validate wooCustomerId exists in your WordPress DB or Firebase here

    return res.status(200).json({ wooCustomerId });
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// REGISTER USER
export async function registerUser(req, res) {
  const db = admin.firestore();
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name
    });

    const [firstName, ...lastParts] = name.trim().split(' ');
    const lastName = lastParts.length ? lastParts.join(' ') : '';

    // Create WooCommerce customer
    let wooCustomerId = null;
    try {
      wooCustomerId = await createWooCommerceCustomer(email, firstName, lastName, email.split('@')[0]);
    } catch (wooError) {
      console.error('WooCommerce customer creation failed:', wooError);
      // Optionally handle error or continue without wooCustomerId
    }

    // Create wallet for the user
    try {
      await createWallet(userRecord.uid);
      const result = await allocateTokensToUser(
        userRecord.uid,          // User's UID
        'registration',          // Category
        'Registration reward',   // Reason
        {}                       // Metadata (empty for registration)
      );
      console.log(result.message);
    } catch (walletError) {
      console.error('Wallet creation failed:', walletError);
      // Optionally handle error or continue
    }

    // Add to Firestore with incomplete status
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      status: 'inactive',
      paid: false,
      wooCustomerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(201).json({
      message: 'User registered successfully',
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      wooCustomerId,
      status: 'inactive',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// LOGIN USER
export async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, localId } = response.data;

    try {
      const result = await allocateTokensToUser(
        localId,         // User's UID
        'login',         // Category
        'Login reward',  // Reason
        {}               // Metadata (empty for login)
      );
      console.log(result.message);
    } catch (tokenError) {
      console.error('Token allocation failed:', tokenError);
      // Optionally handle error or continue
    }

    return res.status(200).json({
      message: 'Login successful',
      uid: localId,
      idToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err.response?.data || err.message);
    return res.status(401).json({
      error: err.response?.data?.error?.message || 'Invalid credentials',
    });
  }
}

// OAUTH LOGIN
export const oauthLogin = async (req, res) => {
  const { idToken, provider } = req.body;

  if (!idToken || !provider) {
    return res.status(400).json({ error: 'ID Token and provider are required' });
  }

  try {
    // Exchange third-party token for Firebase credentials
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${process.env.FB_API_KEY}`,
      {
        postBody: `id_token=${idToken}&providerId=${provider}`,
        requestUri: req.get('origin') || 'http://localhost',
        returnSecureToken: true,
        returnIdpCredential: true,
      }
    );

    const { idToken: firebaseToken, refreshToken, localId, email, displayName, photoUrl } = response.data;

    const db = admin.firestore();
    const userRef = db.collection('users').doc(localId);
    const userDoc = await userRef.get();

    let wooCustomerId;

    if (!userDoc.exists) {
      // New user — create WooCommerce customer
      const [firstName, ...lastParts] = (displayName || '').trim().split(' ');
      const lastName = lastParts.length ? lastParts.join(' ') : '';

      try {
        wooCustomerId = await createWooCommerceCustomer(email, firstName, lastName, email.split('@')[0]);
      } catch (wooError) {
        console.error('WooCommerce customer creation failed:', wooError);
        // Optionally handle error or continue without wooCustomerId
      }

      const userData = {
        email,
        name: displayName,
        picture: photoUrl,
        status: 'inactive',
        paid: false,
        wooCustomerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        const result = await allocateTokensToUser(
          localId,         // User's UID
          'login',         // Category
          'Login reward',  // Reason
          {}               // Metadata (empty for login)
        );
        console.log(result.message);
      } catch (tokenError) {
        console.error('Token allocation failed:', tokenError);
        // Optionally handle error or continue
      }

      await userRef.set(userData);
    } else {
      // Existing user — check if WooCommerce ID exists
      const userData = userDoc.data();
      wooCustomerId = userData.wooCustomerId;

      if (!wooCustomerId) {
        // Create WooCommerce customer if not exists
        const [firstName, ...lastParts] = (displayName || userData.name || '').trim().split(' ');
        const lastName = lastParts.length ? lastParts.join(' ') : '';

        try {
          wooCustomerId = await createWooCommerceCustomer(email, firstName, lastName, email.split('@')[0]);
          await userRef.update({ wooCustomerId });
        } catch (wooError) {
          console.error('WooCommerce customer creation failed:', wooError);
          // Optionally handle error here
        }

      }
    }

    return res.status(200).json({
      message: 'OAuth login successful',
      uid: localId,
      idToken: firebaseToken,
      refreshToken,
      wooCustomerId,
    });
  } catch (err) {
    console.error('OAuth login error:', err.response?.data || err.message);
    return res.status(401).json({
      error: err.response?.data?.error?.message || 'OAuth login failed',
    });
  }
};


// LOGOUT USER
export async function logoutUser(req, res) {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'UID is required' });
  }

  try {
    // Revoke all refresh tokens for the specified user
    await admin.auth().revokeRefreshTokens(uid);

    return res.status(200).json({
      message: 'User logged out successfully. Tokens revoked.',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout user' });
  }
}

// CHANGE PASSWORD
export async function changePassword(req, res) {
  const { uid, newPassword } = req.body;

  if (!uid || !newPassword) {
    return res.status(400).json({ error: 'User ID (uid) and new password are required' });
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });

    return res.status(200).json({
      message: 'Password updated successfully',
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// FORGOT PASSWORD
export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if user with the email exists
    await admin.auth().getUserByEmail(email);
  } catch (error) {
    // If user not found, throw error
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: "User with this email does not exist" });
    }
    // For other errors, throw generic error
    console.error("Error fetching user by email:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  try {
    // Generate the password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Send the link via email
    const mailOptions = {
      from: `MBS Runverse <${process.env.EMAIL_USER}>`,  // Set sender name
      to: email,
      subject: "Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #0066cc;">Password Reset Request</h2>
          <p>Dear User,</p>
          <p>We received a request to reset your password for your MBS Runverse account. If you made this request, please click the link below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #0066cc; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you did not request a password reset, please ignore this email. Your account remains secure.</p>
          <p>If the button doesn't work, copy and paste the following link into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <br>
          <p>Thank you,</p>
          <p><strong>The MBS Runverse Team</strong></p>
          <hr style="border: none; height: 1px; background-color: #ddd;">
          <p style="font-size: 0.9em; color: #666;">If you have any questions or need assistance, feel free to reply to this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Password reset link sent successfully",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: err.message });
  }
}


//GET ALL USERS
export async function getAllUsers(req, res) {
  const db = admin.firestore(); // Moved inside the function
  try {
    const { status, teamId, packageId } = req.query;
    let query = db.collection('users');

    if (status) query = query.where('status', '==', status);
    if (teamId) query = query.where('teamId', '==', teamId);
    if (packageId) query = query.where('packageId', '==', packageId);

    const snapshot = await query.orderBy('createdAt').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

//GET USER BY ID
// export async function getUserById(req, res) {
//   const db = admin.firestore();

//   try {
//     const { uid } = req.params;
//     const userDoc = await db.collection('users').doc(uid).get();

//     if (!userDoc.exists) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const userData = userDoc.data();

//     // Fetch package info if packageId exists
//     if (userData.packageId) {
//       const packageDoc = await db.collection('packages').doc(userData.packageId).get();
//       userData.package = packageDoc.exists ? packageDoc.data() : null;
//     }

//     // Fetch team info if teamId or team-id exists
//     const teamId = userData.teamId || userData["team-id"];
//     if (teamId) {
//       const teamDoc = await db.collection('teams').doc(teamId).get();
//       userData.team = teamDoc.exists ? teamDoc.data() : null;
//     }

//     res.status(200).json(userData);
//   } catch (error) {
//     console.error('Error fetching user by ID:', error);
//     res.status(500).json({ error: 'Failed to fetch user' });
//   }
// }

export async function getUserById(req, res) {
  const db = admin.firestore();

  try {
    const { uid } = req.params;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Fetch package info
    if (userData.packageId) {
      const packageDoc = await db.collection('packages').doc(userData.packageId).get();
      userData.package = packageDoc.exists ? packageDoc.data() : null;
    }

    // Fetch team info
    const teamId = userData.teamId || userData["team-id"];
    if (teamId) {
      const teamDoc = await db.collection('teams').doc(teamId).get();
      userData.team = teamDoc.exists ? teamDoc.data() : null;
    }

    // Fetch and aggregate user history stats
    const historyRef = db.collection('userHistory').doc(uid).collection('history');
    const snapshot = await historyRef.get();

    const previousStats = {
      distance: 0,
      duration: 0,
      calories: 0,
      steps: 0
    };

    snapshot.forEach(doc => {
      const stats = doc.data().stats || {};
      previousStats.distance += stats.distance || 0;
      previousStats.duration += stats.duration || 0;
      previousStats.calories += stats.calories || 0;
      previousStats.steps += stats.steps || 0;
    });

    userData.previousStats = previousStats;

    // Token allocation logic for all thresholds
    if (previousStats.distance > 0) {
      const configSnap = await db.collection('blockchain_config').doc('token_settings').get();
      const config = configSnap.exists ? configSnap.data() : {};
      const distanceConfig = config.distanceTokens || {};

      const sortedThresholds = Object.keys(distanceConfig)
        .map(Number)
        .sort((a, b) => a - b);

      const alreadyAllocated = userData.distanceTokensAllocated || {}; // track per threshold

      for (let i = 0; i < sortedThresholds.length; i++) {
        const threshold = sortedThresholds[i];
        const tokenInfo = distanceConfig[threshold];

        if (
          previousStats.distance >= threshold &&
          tokenInfo?.status === 'active' &&
          !alreadyAllocated[threshold]
        ) {
          // Allocate tokens for this threshold
          await allocateTokensToUser(
            uid,
            'runDistance',
            `Reward for crossing ${threshold} km`,
            { distance: threshold }
          );

          // Update allocation record
          alreadyAllocated[threshold] = true;
        }
      }

      // Save updated token allocation record
      await userRef.update({ distanceTokensAllocated: alreadyAllocated });
      userData.distanceTokensAllocated = alreadyAllocated;
    }

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}


// DELETE USER
export async function deleteUser(req, res) {
  const db = admin.firestore(); // Moved inside the function
  try {
    const { uid } = req.params;

    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// UPDATE USER
export async function updateUser(req, res) {
  const db = admin.firestore(); // Firestore instance

  try {
    const { uid } = req.params; // Get user ID from URL parameters
    const userData = req.body || {}; // Initialize userData as an empty object if req.body is not provided

    console.log('Uploaded file:', req.file);
    if (req.file) {
      const imageUrl = await uploadToWordPress(req.file);
      userData.picture = imageUrl; // Save the image URL in userData
      console.log('Image uploaded successfully:', imageUrl);
    }

    // If gender, weight, and height are present, set status to active
    if (userData.gender && userData.weight && userData.height) {
      userData.status = 'active';
    }

    // Check if mapId is provided in the request and fetch map data if it exists
    if (userData.mapId) {
      const mapDoc = await db.collection('map').doc(userData.mapId).get();

      if (!mapDoc.exists) {
        return res.status(404).json({ error: 'Map not found' });
      }

      // Add the map data to the userData object
      userData.map = mapDoc.data();
    }

    // Update the user document in Firestore
    console.log('Updating user data:', userData);
    await db.collection('users').doc(uid).update(userData);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

// GET USER TEAM
export async function getUserTeam(req, res) {
  const db = admin.firestore(); // Moved inside the function
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { teamId } = userDoc.data();
    const teamDoc = await db.collection('teams').doc(teamId).get();

    if (!teamDoc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json(teamDoc.data());
  } catch (error) {
    console.error('Error fetching user team:', error);
    res.status(500).json({ error: 'Failed to fetch user team' });
  }
}

// GET USER BADGES
export async function addAchievements(req, res) {
  const { uid } = req.params;
  const { badgeId, rewardId, spinnerId } = req.body;

  // If all are missing or null/undefined/empty, return error
  if (!badgeId && !rewardId && !spinnerId) {
    return res.status(400).json({ error: 'At least one of Badge ID, Reward ID, or Spinner ID is required' });
  }

  try {
    const db = admin.firestore();  // Firestore instance inside the function
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const updates = {};

    // Helper function to check if a document exists in a collection
    async function checkIfExists(collection, docId) {
      if (!docId) return false;
      const docRef = db.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();
      return docSnapshot.exists;
    }

    let added = false;

    // Handle badge
    if (badgeId) {
      const badgeExists = await checkIfExists('badges', badgeId);
      if (!badgeExists) {
        return res.status(400).json({ error: 'Invalid badge ID' });
      }
      const badges = userData.badges || [];
      if (badges.includes(badgeId)) {
        return res.status(400).json({ error: 'Badge already added to the user' });
      }
      // Allocate tokens for the badge
      await allocateTokensToUser(uid, 'badges', 'Badge earned', { badgeId });  // Allocate tokens for the badge
      updates.badges = admin.firestore.FieldValue.arrayUnion(badgeId);
      added = true;
    }

    // Handle reward
    if (rewardId) {
      const rewardExists = await checkIfExists('rewards', rewardId);
      if (!rewardExists) {
        return res.status(400).json({ error: 'Invalid reward ID' });
      }
      const rewards = userData.rewards || [];
      if (rewards.includes(rewardId)) {
        return res.status(400).json({ error: 'Reward already added to the user' });
      }
      await allocateTokensToUser(uid, 'rewards', 'Reward earned', { rewardId });
      updates.rewards = admin.firestore.FieldValue.arrayUnion(rewardId);
      added = true;
    }

    // Handle spinner
    if (spinnerId) {
      const spinnerExists = await checkIfExists('spinners', spinnerId);
      if (!spinnerExists) {
        return res.status(400).json({ error: 'Invalid spinner ID' });
      }
      const spinners = userData.spinners || [];
      if (spinners.includes(spinnerId)) {
        return res.status(400).json({ error: 'Spinner already added to the user' });
      }
      updates.spinners = admin.firestore.FieldValue.arrayUnion(spinnerId);
      added = true;
    }

    if (!added) {
      return res.status(400).json({ error: 'No valid badge, reward, or spinner to add' });
    }

    // Initialize completedMilestones to 0 if it doesn't exist
    if (!userData.completedMilestones) {
      updates.completedMilestones = 1;  // Start with 1 if it's the first milestone
    } else {
      updates.completedMilestones = admin.firestore.FieldValue.increment(1);
    }

    await userRef.update(updates);

    res.status(200).json({ message: 'Badge, reward, and/or spinner added successfully' });
  } catch (error) {
    console.error('Error adding badge, reward, or spinner to user:', error);
    res.status(500).json({ error: 'Failed to add badge, reward, or spinner to user' });
  }
}

// GET USER BADGES AND REWARDS
export async function getAchievements(req, res) {
  const db = admin.firestore();
  const { uid } = req.params;

  try {
    // Fetch user data from Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Fetch badges information
    const badges = [];
    if (userData.badges && userData.badges.length > 0) {
      for (let badgeId of userData.badges) {
        const badgeDoc = await db.collection('badges').doc(badgeId).get();
        if (badgeDoc.exists) {
          badges.push({ id: badgeDoc.id, ...badgeDoc.data() }); // Add id here
        }
      }
    }

    // Fetch rewards information
    const rewards = [];
    if (userData.rewards && userData.rewards.length > 0) {
      for (let rewardId of userData.rewards) {
        const rewardDoc = await db.collection('rewards').doc(rewardId).get();
        if (rewardDoc.exists) {
          rewards.push({ id: rewardDoc.id, ...rewardDoc.data() }); // Add id here
        }
      }
    }

    // Fetch spinners information
    const spinners = [];
    if (userData.spinners && userData.spinners.length > 0) {
      for (let spinnerId of userData.spinners) {
        const spinnerDoc = await db.collection('spinners').doc(spinnerId).get();
        if (spinnerDoc.exists) {
          spinners.push({ id: spinnerDoc.id, ...spinnerDoc.data() }); // Add id here
        }
      }
    }

    return res.status(200).json({
      badges,
      rewards,
      spinners,
    });
  } catch (error) {
    console.error('Error fetching user badges, rewards, and spinners:', error);
    return res.status(500).json({ error: 'Failed to fetch user badges, rewards, and spinners' });
  }
}



