import express from 'express';
import {
  createMap,
  getMaps,
  getMapById,
  updateMap,
  deleteMap,
} from '../controllers/mapController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// router.post('/create', createMap); // Create a new map
router.post('/create', upload.single('img'), createMap); // Create a new map with image upload
router.get('/get-maps', getMaps); // Get a list of all maps
router.get('/get-map/:id', getMapById); // Get details of a specific map by ID
// router.put('/update/:id', updateMap); 
router.put('/update/:id', upload.single('img'), updateMap); // Create a new map with image upload
router.delete('/delete/:id', deleteMap); // Delete a specific map by ID

export default router;
