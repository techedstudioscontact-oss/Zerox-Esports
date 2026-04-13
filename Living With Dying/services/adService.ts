import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    serverTimestamp,
    increment,
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { AdCampaign } from '../types';

const COLLECTION_NAME = 'ads';

// --- Client / Public Methods ---

export const getActiveAds = async (): Promise<AdCampaign[]> => {
    try {
        // Fetch all active ads
        // Note: Firestore simplified query to avoid composite index requirements for now
        // We will filter dates client-side for simplicity unless dataset is huge
        const q = query(
            collection(db, COLLECTION_NAME),
            where('active', '==', true)
        );

        const snapshot = await getDocs(q);
        const now = new Date();

        const ads = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdCampaign));

        // Filter by Date and Priority sorting client-side
        return ads.filter(ad => {
            if (ad.startDate && new Date(ad.startDate) > now) return false;
            if (ad.endDate && new Date(ad.endDate) < now) return false;
            return true;
        }).sort((a, b) => b.frequency - a.frequency); // Sort by Priority (High to Low)

    } catch (error) {
        console.error("Error fetching ads:", error);
        return [];
    }
};

export const trackAdView = async (adId: string) => {
    try {
        const adRef = doc(db, COLLECTION_NAME, adId);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        await updateDoc(adRef, {
            views: increment(1),
            [`dailyStats.${today}.views`]: increment(1)
        });
    } catch (error: any) {
        // If the map field doesn't exist, dot notation might fail if the parent "dailyStats" doesn't exist?
        // Actually Firestore handles nested field creation if the parent exists. 
        // But if 'dailyStats' is undefined, we might need setDoc with merge or a pre-check.
        // For simplicity in this stack, we'll try/catch and doing a set if needed or just ignoring for now, 
        // but robustly we should verify. 
        // A simple fix for "dailyStats" missing is to ensure it exists on creation.
        // Or deeper merge:
        console.error("Error tracking view:", error);
    }
};

export const trackAdClick = async (adId: string) => {
    try {
        const adRef = doc(db, COLLECTION_NAME, adId);
        const today = new Date().toISOString().split('T')[0];

        await updateDoc(adRef, {
            clicks: increment(1),
            [`dailyStats.${today}.clicks`]: increment(1)
        });
    } catch (error) {
        console.error("Error tracking click:", error);
    }
};

// --- Admin Methods ---

export const getAllAds = async (): Promise<AdCampaign[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as AdCampaign));
    } catch (error) {
        console.error("Error fetching all ads:", error);
        throw error;
    }
};

export const createAd = async (ad: Omit<AdCampaign, 'id' | 'views' | 'clicks' | 'createdAt'>) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), {
            ...ad,
            views: 0,
            clicks: 0,
            dailyStats: {},
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating ad:", error);
        throw error;
    }
};

export const updateAd = async (id: string, updates: Partial<AdCampaign>) => {
    try {
        const adRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(adRef, updates);
    } catch (error) {
        console.error("Error updating ad:", error);
        throw error;
    }
};

export const deleteAd = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting ad:", error);
        throw error;
    }
};
