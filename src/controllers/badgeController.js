import admin from '../config/firebase.js';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';

export const createBadge = async (req, res) => {
    try {
        const db = admin.firestore();
        const { name, desc } = req.body;
        let img;

        // Convert tokens to number if present and is string
        let tokens = req.body.tokens;
        if (tokens !== undefined && typeof tokens === 'string') {
            tokens = Number(tokens);
        }

        if (req.file) {
            const imageUrl = await uploadToWordPress(req.file);
            img = imageUrl; // Save the image URL in img
            console.log('Image uploaded successfully:', imageUrl);
        }

        if (!name || !desc || !img) {
            return res.status(400).json({ message: 'Invalid input data' });
        }

        const newBadge = {
            name,
            desc,
            img,
            status: 'active',
            created_at: new Date(),
            ...(tokens !== undefined && { tokens }), // add tokens if present
        };
        const docRef = await db.collection('badges').add(newBadge);
        res.status(201).json({ id: docRef.id, ...newBadge });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create badge', error });
    }
};

export const getBadges = async (req, res) => {
    try {
        const db = admin.firestore();
        const { status } = req.query;
        let query = db.collection('badges');
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.get();
        const badges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch badges', error });
    }
};

export const getBadgeById = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        const doc = await db.collection('badges').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Badge not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch badge', error });
    }
};

export const updateBadge = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        let updates = req.body;

        // Convert tokens to number if present and is string
        if (updates.tokens !== undefined && typeof updates.tokens === 'string') {
            updates.tokens = Number(updates.tokens);
        }

        // Handle image upload if file is present
        if (req.file) {
            const imageUrl = await uploadToWordPress(req.file);
            updates.img = imageUrl;
            console.log('Image uploaded successfully:', imageUrl);
        }

        await db.collection('badges').doc(id).update(updates);
        res.status(200).json({ message: 'Badge updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update badge', error });
    }
};


export const deleteBadge = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        await db.collection('badges').doc(id).delete();
        res.status(200).json({ message: 'Badge deleted now successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete badge', error });
    }
};
