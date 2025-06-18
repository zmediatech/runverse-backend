import admin from '../config/firebase.js';

export async function createPackage(req, res) { // This function is similar to createPackage but includes eventId
    const db = admin.firestore();
    const { name, distance, type, price, t_min, t_max, desc, eventId } = req.body;

    if (!name || !distance || !type || !price || !eventId) {
        return res.status(400).json({ error: 'Name, distance, type, price, and eventId are required' });
    }

    if (type === 'team' && (!t_min || !t_max)) {
        return res.status(400).json({ error: 't_min and t_max are required for team packages' });
    }

    try {
        const packageRef = db.collection('packages').doc();
        await packageRef.set({
            name,
            distance,
            type,
            price: Math.round(price * 100), // Convert dollars to cents
            desc: desc || '', // Default to an empty string if desc is not provided
            t_min: type === 'team' ? t_min : null,
            t_max: type === 'team' ? t_max : null,
            status: 'active',
            eventId,
        });

        res.status(201).json({ message: 'Package created successfully', packageId: packageRef.id });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Failed to create package' });
    }
}

// GET /packages?type=team&status=active&eventId=abc123
export async function getPackages(req, res) {
    const db = admin.firestore();
    const { type, status, eventId } = req.query;

    try {
        let query = db.collection('packages');
        if (type) {
            query = query.where('type', '==', type);
        }
        if (status) {
            query = query.where('status', '==', status);
        }
        if (eventId) {
            query = query.where('eventId', '==', eventId);
        }

        const snapshot = await query.get();
        const packages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                price: data.price / 100, // Convert cents to dollars
            };
        });

        res.status(200).json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
}

export async function getPackageById(req, res) {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        const packageDoc = await db.collection('packages').doc(id).get();

        if (!packageDoc.exists) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const data = packageDoc.data();
        res.status(200).json({
            id: packageDoc.id,
            ...data,
            price: data.price / 100, // Convert cents to dollars
        });
    } catch (error) {
        console.error('Error fetching package by ID:', error);
        res.status(500).json({ error: 'Failed to fetch package' });
    }
}

export async function updatePackage(req, res) {
    const db = admin.firestore();
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.price) {
        updateData.price = Math.round(updateData.price * 100); // Convert dollars to cents
    }

    try {
        await db.collection('packages').doc(id).update(updateData);
        res.status(200).json({ message: 'Package updated successfully' });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: 'Failed to update package' });
    }
}

export async function deletePackage(req, res) {
    const db = admin.firestore();
    const { id } = req.params;

    try {
        await db.collection('packages').doc(id).delete();
        res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
}

export async function getUniqueDistances(req, res) {
    const db = admin.firestore();
    const { type } = req.query; // Accept type as a query parameter

    try {
        let query = db.collection('packages').where('status', '==', 'active');
        if (type && (type === 'team' || type === 'individual')) {
            query = query.where('type', '==', type);
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const distances = new Set();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.distance) {
                distances.add(data.distance);
            }
        });

        res.status(200).json([...distances]);
    } catch (error) {
        console.error('Error fetching distances:', error);
        res.status(500).json({ error: 'Failed to fetch distances' });
    }
}
