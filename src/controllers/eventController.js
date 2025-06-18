import admin from '../config/firebase.js';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';

const COLLECTION = 'events';

export const createEvent = async (req, res) => {
  try {
    const db = admin.firestore();
    const { name, startDate, endDate, description, location, status} = req.body;
    let logo;

    // Upload logo if file present
    if (req.file) {
      logo = await uploadToWordPress(req.file);
      console.log('Logo uploaded:', logo);
    }

    if (!name || !startDate || !endDate || !logo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Determine status based on dates (optional: compute here or keep updated on client/cron)
    const now = new Date();
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const computedStatus = now >= sDate && now <= eDate ? 'active' : 'inactive';

    const newEvent = {
      name,
      logo,
      status: computedStatus,
      startDate: admin.firestore.Timestamp.fromDate(sDate),
      endDate: admin.firestore.Timestamp.fromDate(eDate),
      description: description || '',
      location: location || '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const docRef = await db.collection(COLLECTION).add(newEvent);
    res.status(201).json({ id: docRef.id, ...newEvent });
  } catch (error) {
    console.error('Failed to create event:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
};

export const getEvents = async (req, res) => {
  try {
    const db = admin.firestore();
    let query = db.collection(COLLECTION);

    // Optional: filter by status query param
    if (req.query.status) {
      query = query.where('status', '==', req.query.status);
    }

    const snapshot = await query.get();
    const now = new Date();
    const batch = db.batch();
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      let endDate = data.endDate;
      if (endDate && endDate.toDate) {
        endDate = endDate.toDate();
      }
      // If event has ended and status is not inactive, update it
      if (endDate && now > endDate && data.status !== 'inactive') {
        batch.update(doc.ref, { status: 'inactive' });
        data.status = 'inactive';
      }
      return { id: doc.id, ...data };
    });
    // Commit batch updates if any
    if (!batch._ops || batch._ops.length > 0) {
      await batch.commit();
    }
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch events', error });
  }
}; 

export const getEventById = async (req, res) => {
  try {
    const db = admin.firestore();
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const data = doc.data();
    let endDate = data.endDate;
    if (endDate && endDate.toDate) {
      endDate = endDate.toDate();
    }
    const now = new Date();
    // If event has ended and status is not inactive, update it
    if (endDate && now > endDate && data.status !== 'inactive') {
      await doc.ref.update({ status: 'inactive' });
      data.status = 'inactive';
    }
    res.status(200).json({ id: doc.id, ...data });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch event', error });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const db = admin.firestore();
    const updates = { ...req.body };

    if (req.file) {
      const logo = await uploadToWordPress(req.file);
      updates.logo = logo;
      console.log('Logo uploaded:', logo);
    }

    // Update updatedAt timestamp
    updates.updatedAt = admin.firestore.Timestamp.now();

    await db.collection(COLLECTION).doc(req.params.id).update(updates);
    res.status(200).json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update event', error });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete event', error });
  }
};
