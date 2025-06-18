import admin from '../config/firebase.js'; // Adjust the import based on your Firebase setup

export const createSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { name, pkg_id, items = [] } = req.body; // Default items to an empty array
        if (!name || !pkg_id || !Array.isArray(items)) {
            return res.status(400).json({ message: 'Invalid input data' });
        }
        const newSpinner = {
            name,
            pkg_id,
            status: 'active',
            items,
            created_at: new Date(),
        };
        const docRef = await db.collection('spinners').add(newSpinner);
        res.status(201).json({ id: docRef.id, ...newSpinner });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create spinner', error });
    }
};

export const getSpinners = async (req, res) => {
    try {
        const db = admin.firestore();
        const { status } = req.query;
        let query = db.collection('spinners');
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.get();
        const spinners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(spinners);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch spinners', error });
    }
};

export const getSpinnerById = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        const doc = await db.collection('spinners').doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Spinner not found' });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch spinner', error });
    }
};

export const updateSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        const updates = req.body;
        await db.collection('spinners').doc(id).update(updates);
        res.status(200).json({ message: 'Spinner updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update spinner', error });
    }
};

export const deleteSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        await db.collection('spinners').doc(id).delete();
        res.status(200).json({ message: 'Spinner deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete spinner', error });
    }
};

export const addItemToSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id } = req.params;
        const { name, reward_id } = req.body;
        if (!name || !reward_id) {
            return res.status(400).json({ message: 'Invalid input data' });
        }
        const spinnerRef = db.collection('spinners').doc(id);
        const spinnerDoc = await spinnerRef.get();
        if (!spinnerDoc.exists) {
            return res.status(404).json({ message: 'Spinner not found' });
        }
        const spinner = spinnerDoc.data();
        spinner.items.push({ name, reward_id });
        await spinnerRef.update({ items: spinner.items });
        res.status(200).json({ message: 'Item added successfully', spinner });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add item to spinner', error });
    }
};

export const editItemInSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id, item_id } = req.params;
        const { name, reward_id } = req.body;
        const spinnerRef = db.collection('spinners').doc(id);
        const spinnerDoc = await spinnerRef.get();
        if (!spinnerDoc.exists) {
            return res.status(404).json({ message: 'Spinner not found' });
        }
        const spinner = spinnerDoc.data();
        const itemIndex = spinner.items.findIndex(item => item.reward_id === item_id);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found' });
        }
        spinner.items[itemIndex] = { name, reward_id };
        await spinnerRef.update({ items: spinner.items });
        res.status(200).json({ message: 'Item updated successfully', spinner });
    } catch (error) {
        res.status(500).json({ message: 'Failed to edit item in spinner', error });
    }
};

export const deleteItemFromSpinner = async (req, res) => {
    try {
        const db = admin.firestore();
        const { id, item_id } = req.params;
        const spinnerRef = db.collection('spinners').doc(id);
        const spinnerDoc = await spinnerRef.get();
        if (!spinnerDoc.exists) {
            return res.status(404).json({ message: 'Spinner not found' });
        }
        const spinner = spinnerDoc.data();
        spinner.items = spinner.items.filter(item => item.reward_id !== item_id);
        await spinnerRef.update({ items: spinner.items });
        res.status(200).json({ message: 'Item deleted successfully', spinner });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete item from spinner', error });
    }
};

export const redeemSpinner = async (req, res) => {
  try {
    const db = admin.firestore();
    // const { uid } = req.params; // or req.body, adjust based on your route
    const { uid, spinnerId } = req.body; // or req.params

    if (!uid || !spinnerId) {
      return res.status(400).json({ message: 'User ID and Spinner ID are required' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove spinnerId from spinners array and add to redeemedSpinners array atomically
    await userRef.update({
      spinners: admin.firestore.FieldValue.arrayRemove(spinnerId),
      redeemedSpinners: admin.firestore.FieldValue.arrayUnion(spinnerId),
    });

    res.status(200).json({ message: `Spinner ${spinnerId} redeemed successfully` });
  } catch (error) {
    console.error('Failed to redeem spinner:', error);
    res.status(500).json({ message: 'Failed to redeem spinner', error });
  }
};

