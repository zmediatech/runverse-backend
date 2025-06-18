import express from 'express';
import upload from '../middleware/upload.js';
import {
  loginAdmin,
  createAdminUser,
  getAdmin,
  updateAdmin,
  deleteAdmin
} from '../controllers/adminController.js';
import { verifyToken } from '../middleware/auth.js'; // Adjust path as needed

const router = express.Router();

// Admin login (public)
router.post('/login', loginAdmin);

// Protected routes
router.post('/create', verifyToken, createAdminUser);
router.get('/get-admin/:uid', verifyToken, getAdmin);
router.put('/update/:uid', verifyToken, upload.single('profilePicture'), updateAdmin);
router.delete('/delete/:uid', verifyToken, deleteAdmin);

export default router;
