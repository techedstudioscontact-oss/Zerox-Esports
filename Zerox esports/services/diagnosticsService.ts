import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Tournament } from '../types';

export interface ScanResult {
    totalUsers: number;
    usersMissingRole: number;
    usersMissingCoins: number; // NaN or null
    usersInvalidAdmin: number; // role=admin but paidAdmin=false
    usersProfileIssues: number; // Missing email/name
    totalContent: number;
    contentMissingEpisodes: number;
}

export const runSystemScan = async (): Promise<ScanResult> => {
    const result: ScanResult = {
        totalUsers: 0,
        usersMissingRole: 0,
        usersMissingCoins: 0,
        usersInvalidAdmin: 0,
        usersProfileIssues: 0,
        totalContent: 0,
        contentMissingEpisodes: 0
    };

    try {
        // Scan Users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        result.totalUsers = usersSnapshot.size;
        const validRoles = ['user', 'admin', 'superadmin', 'manager'];

        usersSnapshot.forEach(doc => {
            const data = doc.data();

            // 1. Role Integrity
            if (!data.role || !validRoles.includes(data.role)) result.usersMissingRole++;

            // 2. Coin Integrity (The "Frinckling" Fix)
            // Checks for null, undefined, NaN, or negative values
            if (data.coins === undefined || data.coins === null || isNaN(data.coins) || data.coins < 0) {
                result.usersMissingCoins++;
            }

            // 3. Admin Permission Integrity
            // Finds Admins who are not marked as Paid Admins (Locked out)
            if (data.role === 'admin' && !data.paidAdmin) {
                result.usersInvalidAdmin++;
            }

            // 4. Profile Integrity
            if (!data.email) result.usersProfileIssues++;
        });

        // Scan Content
        const contentSnapshot = await getDocs(collection(db, 'content'));
        result.totalContent = contentSnapshot.size;
        contentSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.episodes || !Array.isArray(data.episodes)) result.contentMissingEpisodes++;
        });

    } catch (error) {
        console.error("Scan failed", error);
    }

    return result;
};

export const fixUserIssues = async (): Promise<number> => {
    let fixedCount = 0;
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let batchCount = 0;

        usersSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            const updates: any = {};
            let needsUpdate = false;

            const validRoles = ['user', 'admin', 'superadmin', 'manager'];

            // Fix 1: Bad Roles
            if (!data.role || !validRoles.includes(data.role)) {
                updates.role = 'user';
                needsUpdate = true;
            }

            // Fix 2: Bad Coins (NaN, Null, Negative) -> Reset to 0
            if (data.coins === undefined || data.coins === null || isNaN(data.coins) || data.coins < 0) {
                updates.coins = 0;
                needsUpdate = true;
            }

            // Fix 3: Invalid Admin State -> Grant Paid Admin
            if (data.role === 'admin' && !data.paidAdmin) {
                updates.paidAdmin = true;
                needsUpdate = true;
            }

            // Fix 4: Master Admin Safeguard
            if (data.email === 'master@lwd.com' && data.role !== 'superadmin') {
                updates.role = 'superadmin';
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc(db, 'users', docSnap.id), updates);
                fixedCount++;
                batchCount++;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error("Fix users failed", error);
        throw error;
    }
    return fixedCount;
};

export const fixContentIssues = async (): Promise<number> => {
    let fixedCount = 0;
    try {
        const contentSnapshot = await getDocs(collection(db, 'content'));
        const batch = writeBatch(db);
        let batchCount = 0;

        contentSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.episodes || !Array.isArray(data.episodes)) {
                batch.update(doc(db, 'content', docSnap.id), { episodes: [] });
                fixedCount++;
                batchCount++;
            }
        });

        if (batchCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        console.error("Fix content failed", error);
        throw error;
    }
    return fixedCount;
};
