import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, getDoc, runTransaction } from 'firebase/firestore';
import { TeamRequest, User } from '../types';

export const sendTeamRequest = async (senderUid: string, senderName: string, receiverUid: string) => {
    if (senderUid === receiverUid) throw new Error("You cannot send a request to yourself.");

    // Check if receiver exists
    const receiverRef = doc(db, 'users', receiverUid);
    const receiverDoc = await getDoc(receiverRef);
    if (!receiverDoc.exists()) throw new Error("Player with this App UID not found.");

    // Check if already teammates
    const userData = receiverDoc.data() as User;
    if (userData.teamMembers?.includes(senderUid)) {
        throw new Error("You are already teammates with this player.");
    }

    // Check if a request already exists between them
    const q = query(
        collection(db, 'team_requests'),
        where('senderId', 'in', [senderUid, receiverUid]),
        where('receiverId', 'in', [senderUid, receiverUid]),
        where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) throw new Error("A pending request already exists between you two.");

    const newReqRef = doc(collection(db, 'team_requests'));
    const requestData: TeamRequest = {
        id: newReqRef.id,
        senderId: senderUid,
        senderName: senderName || 'A player',
        receiverId: receiverUid,
        status: 'pending',
        timestamp: Date.now()
    };
    await setDoc(newReqRef, requestData);
};

export const acceptTeamRequest = async (request: TeamRequest) => {
    try {
        await runTransaction(db, async (transaction) => {
            const reqRef = doc(db, 'team_requests', request.id);
            const reqDoc = await transaction.get(reqRef);
            if (!reqDoc.exists() || reqDoc.data().status !== 'pending') {
                throw new Error("Request already processed or does not exist.");
            }

            const senderRef = doc(db, 'users', request.senderId);
            const receiverRef = doc(db, 'users', request.receiverId);

            transaction.update(reqRef, { status: 'accepted' });
            transaction.update(senderRef, { teamMembers: arrayUnion(request.receiverId) });
            transaction.update(receiverRef, { teamMembers: arrayUnion(request.senderId) });
        });
    } catch (error) {
        console.error("Error accepting team request:", error);
        throw error;
    }
};

export const rejectTeamRequest = async (requestId: string) => {
    const reqRef = doc(db, 'team_requests', requestId);
    await updateDoc(reqRef, { status: 'rejected' });
};

export const removeTeammate = async (currentUserId: string, teammateId: string) => {
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const teammateRef = doc(db, 'users', teammateId);

            transaction.update(currentUserRef, { teamMembers: arrayRemove(teammateId) });
            transaction.update(teammateRef, { teamMembers: arrayRemove(currentUserId) });
        });
    } catch (error) {
        console.error("Error removing teammate:", error);
        throw error;
    }
};

export const subscribeToPendingRequests = (userId: string, callback: (requests: TeamRequest[]) => void) => {
    const q = query(
        collection(db, 'team_requests'),
        where('receiverId', '==', userId),
        where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
        const reqs: TeamRequest[] = [];
        snapshot.forEach((doc) => reqs.push({ ...doc.data() as TeamRequest, id: doc.id }));
        callback(reqs);
    });
};

export const getTeammatesProfiles = async (teamMemberUids: string[]): Promise<User[]> => {
    if (!teamMemberUids || teamMemberUids.length === 0) return [];

    const teammates: User[] = [];
    // Firestore 'in' query supports up to 10 elements. If someone has >10 teammates, we'll chunk it (unlikely).
    // Let's do a simple loop for safety if it might be large, but 'in' is better.
    // For now, chunking into 10s
    for (let i = 0; i < teamMemberUids.length; i += 10) {
        const chunk = teamMemberUids.slice(i, i + 10);
        const q = query(collection(db, 'users'), where('uid', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => teammates.push(doc.data() as User));
    }
    return teammates;
};
