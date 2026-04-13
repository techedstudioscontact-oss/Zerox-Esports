import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, runTransaction, serverTimestamp, orderBy } from 'firebase/firestore';
import { Registration, User } from '../types';

export const registerForTournament = async (
    registrationData: Omit<Registration, 'id' | 'registeredAt' | 'entryFeePaid'>,
    entryFee: number
) => {
    const userRef = doc(db, 'users', registrationData.userId);

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Read user doc to check balance
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }

            const userData = userDoc.data() as User;
            const currentBalance = userData.coins || 0;

            // 2. Validate balance
            if (currentBalance < entryFee) {
                throw new Error("Insufficient wallet balance.");
            }

            // 3. Deduct balance
            transaction.update(userRef, {
                coins: currentBalance - entryFee
            });

            // 4. Create Registration Document
            // Note: We create a ref first to get the ID, but because it's a sub-collection or standalone,
            // we use the 'registrations' root collection for easier querying by admins later.
            const newRegistrationRef = doc(collection(db, 'registrations'));

            const newReg: Registration = {
                ...registrationData,
                id: newRegistrationRef.id,
                registeredAt: Date.now(),
                entryFeePaid: entryFee
            };

            transaction.set(newRegistrationRef, newReg);
        });

        return { success: true };
    } catch (error) {
        console.error("Registration failed:", error);
        throw error;
    }
};

export const getRegistrationsForTournament = async (tournamentId: string): Promise<Registration[]> => {
    try {
        const q = query(
            collection(db, 'registrations'),
            where('tournamentId', '==', tournamentId)
        );
        const snapshot = await getDocs(q);
        const registrations: Registration[] = [];
        snapshot.forEach((doc) => {
            registrations.push(doc.data() as Registration);
        });
        // Sort client-side since we didn't add a composite index for tournamentId + registeredAt yet
        return registrations.sort((a, b) => b.registeredAt - a.registeredAt);
    } catch (error) {
        console.error("Failed to fetch registrations for tournament:", error);
        throw error;
    }
};

export const getUserRegistrations = async (userId: string): Promise<Registration[]> => {
    try {
        const q = query(
            collection(db, 'registrations'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const registrations: Registration[] = [];
        snapshot.forEach((doc) => {
            registrations.push(doc.data() as Registration);
        });
        return registrations.sort((a, b) => b.registeredAt - a.registeredAt);
    } catch (error) {
        console.error("Failed to fetch user registrations:", error);
        throw error;
    }
};

export const unregisterFromTournament = async (userId: string, tournamentId: string) => {
    // 1. Find the registration doc
    const q = query(
        collection(db, 'registrations'),
        where('userId', '==', userId),
        where('tournamentId', '==', tournamentId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error("Registration not found.");

    const regDoc = snapshot.docs[0];
    const regData = regDoc.data() as Registration;
    const entryFeeRefund = regData.entryFeePaid || 0;

    const userRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found.");

            const userData = userDoc.data() as User;
            const currentBalance = userData.coins || 0;

            // Refund the user
            transaction.update(userRef, {
                coins: currentBalance + entryFeeRefund
            });

            // Delete the registration
            transaction.delete(regDoc.ref);
        });
        return { success: true };
    } catch (error) {
        console.error("Unregistration failed:", error);
        throw error;
    }
};
