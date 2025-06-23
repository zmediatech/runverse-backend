import admin from '../config/firebase.js';
import { uploadToWordPress } from '../utils/uploadToWordPress.js';  // Your upload utility function

export const createAd = async (req, res) => {
    try {
        const db = admin.firestore();
        const {
            adType,
            format,
            heading,
            subheading,
            description,
            url,
            bgColor,
            bgGradient,
            fontColor,
            startDate,
            endDate,
            displayCount
        } = req.body;

        // Variables to store image URLs
        let logoUrl;
        let imageUrl;

        // Handle file uploads (logo and main image)
        if (req.files) {
            // Upload logo if available
            if (req.files.logo) {
                logoUrl = await uploadToWordPress(req.files.logo[0]);
                console.log('Logo uploaded successfully:', logoUrl);
            }

            // Upload main image if availableS
            if (req.files.image) {
                imageUrl = await uploadToWordPress(req.files.image[0]);
                console.log('Main image uploaded successfully:', imageUrl);
            }
        }

        // Validation check for required fields
        if (!adType || !heading || !description || !url || !startDate || !endDate || !displayCount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Calculate per day display count based on displayCount and the number of days between startDate and endDate
        const start = new Date(startDate);
        const end = new Date(endDate);
        let days = Math.ceil((end - start) / (1000 * 3600 * 24));
        if (isNaN(days) || days < 1) days = 1;
        const perDayDisplayCount = Math.floor(parseInt(displayCount, 10) / days);

        // Create the ad object
        const newAd = {};

        if (adType) newAd.adType = adType;
        if (format) newAd.format = format;
        if (heading) newAd.heading = heading;
        if (subheading) newAd.subheading = subheading;
        if (description) newAd.description = description;
        if (url) newAd.url = url;
        if (logoUrl) newAd.logo = logoUrl;
        if (imageUrl) newAd.image = imageUrl;
        if (bgColor) newAd.bgColor = bgColor;
        if (bgGradient) newAd.bgGradient = bgGradient;
        if (fontColor) newAd.fontColor = fontColor;
        if (startDate) newAd.startDate = new Date(startDate);
        if (endDate) newAd.endDate = new Date(endDate);
        if (displayCount) newAd.displayCount = parseInt(displayCount, 10);
        if (perDayDisplayCount) newAd.perDayDisplayCount = perDayDisplayCount;

        newAd.displayedToday = 0;
        newAd.displayedThisMonth = 0;
        newAd.createdAt = new Date();
        newAd.updatedAt = new Date();

        // Store the new ad in Firestore
        const docRef = await db.collection('ads').add(newAd);
        console.log("Ad created with ID:", docRef.id);
        res.status(201).json({ id: docRef.id, ...newAd });
    } catch (error) {
        console.log("Error while creating ad:", error);
        res.status(500).json({ message: 'Failed to create ad', error });
    }
};

export const getAds = async (req, res) => {
    try {
        const db = admin.firestore();
        const adsSnapshot = await db.collection('ads').get();
        const adsList = adsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(adsList);
    } catch (error) {
        console.log("Error while fetching ads:", error);
        res.status(500).json({ message: 'Failed to fetch ads', error });
    }
};

export const getAdById = async (req, res) => {
    try {
        const { adId } = req.params;
        const db = admin.firestore();
        const adDoc = await db.collection('ads').doc(adId).get();

        if (!adDoc.exists) {
            return res.status(404).json({ message: 'Ad not found' });
        }

        res.status(200).json({ id: adDoc.id, ...adDoc.data() });
    } catch (error) {
        console.log("Error while fetching ad by ID:", error);
        res.status(500).json({ message: 'Failed to fetch ad', error });
    }
};

export const updateAd = async (req, res) => {
    try {
        const db = admin.firestore();
        const { adId } = req.params;
        const {
            startDate,
            endDate,
            displayCount
        } = req.body;

        // Variables to store image URLs
        let logoUrl;
        let imageUrl;

        // Handle file uploads (logo and main image)
        if (req.files) {
            if (req.files.logo) {
                logoUrl = await uploadToWordPress(req.files.logo[0]);
                console.log('Logo uploaded successfully:', logoUrl);
            }

            if (req.files.image) {
                imageUrl = await uploadToWordPress(req.files.image[0]);
                console.log('Main image uploaded successfully:', imageUrl);
            }
        }

        // Prepare the updated ad object
        const updatedAd = { ...req.body };

        // Only update logo/image if uploaded
        if (logoUrl) updatedAd.logo = logoUrl;
        if (imageUrl) updatedAd.image = imageUrl;

        // Calculate perDayDisplayCount if relevant fields are present
        if (startDate && endDate && displayCount) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            let days = Math.ceil((end - start) / (1000 * 3600 * 24));
            if (isNaN(days) || days < 1) days = 1;
            updatedAd.perDayDisplayCount = Math.floor(parseInt(displayCount, 10) / days);
            updatedAd.startDate = start;
            updatedAd.endDate = end;
            updatedAd.displayCount = parseInt(displayCount, 10);
        }

        updatedAd.updatedAt = new Date();

        // Update the ad in Firestore
        await db.collection('ads').doc(adId).update(updatedAd);
        console.log("Ad updated with ID:", adId);
        res.status(200).json({ id: adId, ...updatedAd });
    } catch (error) {
        console.log("Error while updating ad:", error);
        res.status(500).json({ message: 'Failed to update ad', error });
    }
};

export const deleteAd = async (req, res) => {
    try {
        const { adId } = req.params;
        const db = admin.firestore();

        const adDoc = await db.collection('ads').doc(adId).get();
        if (!adDoc.exists) {
            return res.status(404).json({ message: 'Ad not found' });
        }

        await db.collection('ads').doc(adId).delete();
        console.log("Ad deleted with ID:", adId);
        res.status(200).json({ message: 'Ad deleted successfully' });
    } catch (error) {
        console.log("Error while deleting ad:", error);
        res.status(500).json({ message: 'Failed to delete ad', error });
    }
};

export const getRandomAd = async (req, res) => {
    try {
        const db = admin.firestore();
        const currentDate = new Date();

        // Accept adType as a query parameter (e.g., ?adType=banner or ?adType=full-image)
        const { adType } = req.query;

        let adsQuery = db.collection('ads').where('status', '==', 'active');
        if (adType) {
            adsQuery = adsQuery.where('adType', '==', adType);
        }

        const adsSnapshot = await adsQuery.get();

        if (adsSnapshot.empty) {
            return res.status(404).json({ message: 'No active ads found' });
        }

        // Select a random ad from active ads
        const ads = adsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Loop through ads to find one that meets the requirements
        let randomAd = null;
        for (let ad of ads) {
            const adExpirationDate = new Date(ad.endDate);
            const adCurrentDate = new Date();

            // Check if the ad's end date has passed, if so, mark it as inactive
            if (adExpirationDate < adCurrentDate) {
                await db.collection('ads').doc(ad.id).update({ status: 'inactive' });
                console.log(`Ad ${ad.id} expired, marked as inactive.`);
                continue;  // Skip to the next ad
            }

            // Reset displayedToday if the updatedAt date is older than today
            if (new Date(ad.updatedAt) < currentDate.setHours(0, 0, 0, 0)) {
                await db.collection('ads').doc(ad.id).update({ displayedToday: 0 });
                console.log(`Ad ${ad.id} displayedToday reset.`);
            }

            if (ad.displayedToday >= ad.perDayDisplayCount) {
                // Mark the ad as inactive in the DB
                await db.collection('ads').doc(ad.id).update({ status: 'inactive' });
                console.log(`Ad ${ad.id} exceeded perDayDisplayCount, marked as inactive.`);
                continue;  // Skip to the next ad
            }

            // If the ad is valid, select it
            randomAd = ad;
            break;  // Exit the loop once a valid ad is selected
        }

        if (!randomAd) {
            return res.status(404).json({ message: 'No valid active ads available at the moment' });
        }

        // Increment the displayedToday and displayedThisMonth counters
        await db.collection('ads').doc(randomAd.id).update({
            displayedToday: admin.firestore.FieldValue.increment(1),
            displayedThisMonth: admin.firestore.FieldValue.increment(1),
        });

        // Update the ad's last updated date
        await db.collection('ads').doc(randomAd.id).update({ updatedAt: currentDate });

        // Return the selected ad
        res.status(200).json(randomAd);
    } catch (error) {
        console.log("Error while fetching random ad:", error);
        res.status(500).json({ message: 'Failed to fetch random ad', error });
    }
};


