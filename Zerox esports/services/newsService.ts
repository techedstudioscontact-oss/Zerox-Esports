import { db } from '../firebase';
import {
    collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
    query, orderBy, getDoc
} from 'firebase/firestore';
import { NewsItem } from '../types';
import { deleteFromCloudinary } from './cloudinaryService';

const NEWS_COL = 'news';

// ── Subscribe to all news items ───────────────────────────────────
export const subscribeToNews = (callback: (news: NewsItem[]) => void) => {
    const q = query(collection(db, NEWS_COL), orderBy('createdAt', 'desc'));
    return onSnapshot(
        q,
        (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsItem)));
        },
        (err) => {
            console.warn('subscribeToNews error (check Firestore rules):', err);
            callback([]);
        }
    );
};

// ── Create a news item ────────────────────────────────────────────
export const createNewsItem = async (news: Omit<NewsItem, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, NEWS_COL), news);
    return docRef.id;
};

// ── Update a news item ────────────────────────────────────────────
export const updateNewsItem = async (id: string, updates: Partial<NewsItem>): Promise<void> => {
    const ref = doc(db, NEWS_COL, id);
    await updateDoc(ref, updates);
};

// ── Delete a news item ────────────────────────────────────────────
export const deleteNewsItem = async (id: string): Promise<void> => {
    const ref = doc(db, NEWS_COL, id);

    // Check if it has an image to delete from Cloudinary
    try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data() as NewsItem;
            // Best effort delete if we had the publicId stored (we don't right now, 
            // but Cloudinary unsigned delete is spotty anyway. We'll skip for now).
        }
    } catch { }

    await deleteDoc(ref);
};
