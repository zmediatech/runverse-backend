import express from 'express';
import {
    createBadge,
    getBadges,
    getBadgeById,
    updateBadge,
    deleteBadge,
} from '../controllers/badgeController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/create', upload.single('img'), createBadge);
router.get('/get-badges', getBadges);
router.get('/get-badge/:id', getBadgeById);
// router.put('/update/:id', updateBadge);
router.put('/update/:id', upload.single('img'), updateBadge);
router.delete('/delete/:id', deleteBadge);

export default router;
