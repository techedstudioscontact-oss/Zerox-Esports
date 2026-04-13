
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { User } from '../types';

export interface Comment {
    id: string;
    contentId: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: number | Timestamp;
}

export const addComment = async (user: User, contentId: string, text: string) => {
    await addDoc(collection(db, 'comments'), {
        contentId,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        text,
        createdAt: serverTimestamp()
    });
};

export const getComments = async (contentId: string): Promise<Comment[]> => {
    const q = query(
        collection(db, 'comments'),
        where('contentId', '==', contentId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Comment));
};
