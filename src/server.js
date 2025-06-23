import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import admin, { initializeFirebase } from './config/firebase.js';
import userRoutes from './routes/userRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoute.js';
import teamRoutes from './routes/teamRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import spinnerRoutes from './routes/spinnerRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import wooRoutes from './routes/wooRoutes.js';
import historyRoutes from './routes/historyRoutes.js'; // Uncomment if you need history routes
import adminRoutes from './routes/adminRoutes.js'; // Import admin routes
import walletRoutes from './routes/walletRoutes.js'; // Import wallet routes
import eventRoutes from './routes/eventRoutes.js'; // Import event routes
import blockchainRoutes from './routes/blockchainRoutes.js'; // Import blockchain routes
import adRoutes from './routes/adRoutes.js'; // Import ad routes

const app = express();

// 🛑 Mount webhook before body parser
app.use('/api', webhookRoutes);

// ✅ THEN use JSON parser
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Initialize Firebase
initializeFirebase();

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/spinners', spinnerRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/woo', wooRoutes); ////api/woo/get-vendors
app.use('/api/history', historyRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/wallet', walletRoutes); // Add wallet routes
app.use('/api/events', eventRoutes); // Add event routes
app.use('/api/blockchain', blockchainRoutes); // Add event routes
app.use('/api/ads', adRoutes); // Add event routes

app.get('/', (req, res) => {
  res.send('Welcome to the Firebase Auth API!');
});

//http://localhost:5000/api
//https://runverse-backend.vercel.app/api

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

export default app;
