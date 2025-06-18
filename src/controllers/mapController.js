import admin from 'firebase-admin';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';

export const createMap = async (req, res) => {
    try {
        const db = admin.firestore();
        const { area_type, name, eventId } = req.body;
        let img;

        if (req.file) {
            const imageUrl = await uploadToWordPress(req.file);
            img = imageUrl;
            console.log('Image uploaded successfully:', imageUrl);
        }

        if (!area_type || !name || !img || !eventId) {
            return res.status(400).json({ message: 'Invalid input data' });
        }

        const newMap = {
            area_type,
            name,
            img,
            eventId,
            created_at: new Date(),
        };

        const docRef = await db.collection('map').add(newMap);
        console.log("Document created with ID:", docRef.id);  // Ensure doc creation is logged
        res.status(201).json({ id: docRef.id, ...newMap });
    } catch (error) {
        console.log("Error while creating map:", error);  // Log error for debugging
        res.status(500).json({ message: 'Failed to create map', error });
    }
};


// GET /maps?area_type=...&eventId=...
export const getMaps = async (req, res) => {
    try {
        const db = admin.firestore();
        const { area_type, eventId } = req.query;
        let query = db.collection('map');
        if (area_type) {
            query = query.where('area_type', '==', area_type);
        }
        if (eventId) {
            query = query.where('eventId', '==', eventId);
        }
        const snapshot = await query.get();
        const maps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(maps);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch maps', error });
    }
};

export const getMapById = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        const doc = await db.collection('map').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Map not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch map', error });
    }
};

export const updateMap = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        let updates = req.body;

        // Handle image upload if file is present
        if (req.file) {
            const imageUrl = await uploadToWordPress(req.file);
            updates.img = imageUrl;
            console.log('Image uploaded successfully:', imageUrl);
        }

        await db.collection('map').doc(id).update(updates);
        res.status(200).json({ message: 'Map updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update map', error });
    }
};

export const deleteMap = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        await db.collection('map').doc(id).delete();
        res.status(200).json({ message: 'Map deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete map', error });
    }
};
