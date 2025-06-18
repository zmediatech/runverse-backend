import express from 'express';
import {
    createAchievement,
    getAchievements,
    getAchievementById,
    updateAchievement,
    deleteAchievement,
    getAchievementsByPkgId
} from '../controllers/achievementController.js';

const router = express.Router();

router.post('/create', createAchievement);
router.get('/get-achievements', getAchievements);
router.get('/get-achievement/:id', getAchievementById);
router.put('/update/:id', updateAchievement);
router.delete('/delete/:id', deleteAchievement);

router.get('/get-achievements/:pkgId', getAchievementsByPkgId);

export default router;
