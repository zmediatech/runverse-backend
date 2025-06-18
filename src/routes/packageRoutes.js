import express from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  getUniqueDistances
} from '../controllers/packageController.js';

const router = express.Router();

router.post('/create', createPackage);
router.get('/get-package', getPackages);
router.get('/get-package/:id', getPackageById);
router.put('/update-package/:id', updatePackage);
router.delete('/:id', deletePackage);
router.get('/get-distances', getUniqueDistances);

export default router;
