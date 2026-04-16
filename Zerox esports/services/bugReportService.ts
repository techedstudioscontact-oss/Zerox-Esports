import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { BugReport, User } from '../types';

export const submitBugReport = async (description: string, user: User) => {
    try {
        const deviceInfo = `UserAgent: ${navigator.userAgent} | Platform: ${navigator.platform}`;

        await addDoc(collection(db, 'bug_reports'), {
            userId: user.uid,
            userEmail: user.email,
            description,
            deviceInfo,
            status: 'open',
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error submitting bug report:", error);
        throw error;
    }
};

export const subscribeToBugReports = (callback: (reports: BugReport[]) => void) => {
    const q = query(collection(db, 'bug_reports'), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as BugReport));
        callback(reports);
    }, (error) => {
        console.error("Error fetching bug reports:", error);
        callback([]);
    });
};

export const resolveBugReport = async (id: string) => {
    try {
        await updateDoc(doc(db, 'bug_reports', id), {
            status: 'resolved'
        });
    } catch (error) {
        console.error("Error resolving bug report:", error);
        throw error;
    }
};
