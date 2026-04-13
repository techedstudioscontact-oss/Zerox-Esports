
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface ContentRequest {
    id: string;
    userId: string;
    userName: string;
    title: string;
    note: string;
    status: 'pending' | 'completed';
    createdAt: number | Timestamp;
}

export const submitRequest = async (userId: string, userName: string, title: string, note: string = '') => {
    try {
        await addDoc(collection(db, 'requests'), {
            userId,
            userName,
            title,
            note,
            status: 'pending',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error submitting request:", error);
        throw error; // Re-throw to let UI handle it
    }
};

export const subscribeToRequests = (callback: (requests: ContentRequest[]) => void) => {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ContentRequest));
        callback(requests);
    });
};

export const deleteRequest = async (id: string) => {
    await deleteDoc(doc(db, 'requests', id));
};
