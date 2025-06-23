import express from 'express';
import {
  createAd,
  getAds,
  getAdById,
  updateAd,
  deleteAd,
  getRandomAd
} from '../controllers/adController.js';
import upload from '../middleware/upload.js'; // Assuming this is your multer middleware for handling uploads

const router = express.Router();

// Route to create a new ad (with image upload)
router.post('/create', upload.fields([{ name: 'logo' }, { name: 'image' }]), createAd);

// Route to get a list of all ads
router.get('/get-ads', getAds);

// Route to get details of a specific ad by ID
router.get('/get-ad/:adId', getAdById);

// Route to update an existing ad (with image upload)
router.put('/update/:adId', upload.fields([{ name: 'logo' }, { name: 'image' }]), updateAd);

// Route to delete a specific ad by ID
router.delete('/delete/:adId', deleteAd);

// Route to get a random ad
router.get('/get-ad/random', getRandomAd);

export default router;
