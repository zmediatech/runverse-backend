import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  registerUser,
  loginUser,
  changePassword,
  forgotPassword,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser as updateUserById,
  getUserTeam,
  logoutUser,
  oauthLogin,
  addAchievements,
  getAchievements,
  generateLoginToken,
  verifyWooToken
} from '../controllers/userController.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/oauth-login', oauthLogin);
router.post('/change-password', changePassword);
router.post('/forgot-password', forgotPassword);
router.get('/get', getAllUsers);
router.get('/get-user/:uid', getUserById);
router.delete('/delete/:uid', deleteUser);
router.get('/team/:uid/team', getUserTeam);
router.post('/logout', logoutUser);
router.post('/add-achievement/:uid', addAchievements); // New route for adding badge or reward
router.get('/get-achievements/:uid', getAchievements); // New route for getting badges and rewards
router.put('/update/:uid', upload.single('picture'), updateUserById);
router.get('/generate-login-token/:uid', generateLoginToken); // New route for generating WooCommerce login token
router.post('/verify-token', verifyWooToken); // New route for verifying WooCommerce login token

// Commented out routes moved to the end
// router.put('/update', verifyToken, updateUser); // Commented out token verification
// router.get('/users', verifyToken, getAllUsers); // Commented out token verification
// router.get('/users/:uid', verifyToken, getUserById); // Commented out token verification
// router.delete('/users/:uid', verifyToken, deleteUser); // Commented out token verification
// router.put('/users/:uid', verifyToken, updateUserById); // Commented out token verification
// router.get('/users/:uid/team', verifyToken, getUserTeam); // Commented out token verification

export default router;
