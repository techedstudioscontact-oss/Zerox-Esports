import { db } from '../firebase';
import {
    collection, doc, addDoc, setDoc, getDoc, onSnapshot,
    query, orderBy, updateDoc, increment, serverTimestamp, where, getDocs, deleteDoc
} from 'firebase/firestore';
import { SupportMessage, SupportChat, Role } from '../types';
import { deleteFromCloudinary } from './cloudinaryService';

const CHATS_COL = 'support_chats';
const MSGS_COL = 'messages';
const AIKO_COL = 'aiko_chats';   // for Aiko AI history per user

// ── Open / ensure a chat exists for a user ────────────────────────
export const ensureChat = async (userId: string, userEmail: string): Promise<void> => {
    try {
        const ref = doc(db, CHATS_COL, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                id: userId,
                userId,
                userEmail: userEmail || '',
                status: 'open',
                lastMessage: '',
                lastMessageTime: Date.now(),
                unreadByAdmin: 0,
                unreadByUser: 0,
            } satisfies SupportChat);
        }
    } catch (err) {
        console.warn('ensureChat failed (check Firestore rules):', err);
    }
};

// ── Send a message (supports optional media attachment) ───────────
export const sendSupportMessage = async (
    chatId: string,
    senderId: string,
    senderEmail: string,
    senderRole: Role,
    text: string,
    media?: {
        url: string;
        publicId: string;
        mediaType: 'image' | 'video';
    }
): Promise<void> => {
    const msgsRef = collection(db, CHATS_COL, chatId, MSGS_COL);
    const msg: Omit<SupportMessage, 'id'> = {
        text,
        senderId,
        senderEmail,
        senderRole,
        timestamp: Date.now(),
        isRead: false,
        ...(media ? {
            mediaUrl: media.url,
            mediaType: media.mediaType,
            cloudinaryPublicId: media.publicId,
        } : {}),
    };
    await addDoc(msgsRef, msg);

    // Update parent chat doc
    const chatRef = doc(db, CHATS_COL, chatId);
    const isAdmin = senderRole !== 'user';
    const preview = media ? (text || `📎 ${media.mediaType}`) : text;
    await updateDoc(chatRef, {
        lastMessage: preview,
        lastMessageTime: Date.now(),
        status: 'open',
        ...(isAdmin ? { unreadByUser: increment(1) } : { unreadByAdmin: increment(1) }),
    });
};

// ── Subscribe to messages in real time ────────────────────────────
export const subscribeToMessages = (
    chatId: string,
    callback: (msgs: SupportMessage[]) => void
) => {
    const q = query(
        collection(db, CHATS_COL, chatId, MSGS_COL),
        orderBy('timestamp', 'asc')
    );
    return onSnapshot(
        q,
        (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage)));
        },
        (err) => {
            console.warn('subscribeToMessages error (check Firestore rules):', err);
            callback([]);
        }
    );
};

// ── Subscribe to all chats (for admin / moderator view) ───────────
export const subscribeToAllChats = (callback: (chats: SupportChat[]) => void) => {
    const q = query(collection(db, CHATS_COL), orderBy('lastMessageTime', 'desc'));
    return onSnapshot(
        q,
        (snap) => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportChat)));
        },
        (err) => {
            console.warn('subscribeToAllChats error (check Firestore rules):', err);
            callback([]);
        }
    );
};

// ── Mark messages as read — safe wrapper ─────────────────────────
export const markAsRead = async (chatId: string, isAdmin: boolean) => {
    try {
        await updateDoc(doc(db, CHATS_COL, chatId), isAdmin ? { unreadByAdmin: 0 } : { unreadByUser: 0 });
    } catch (err) {
        console.warn('markAsRead failed:', err);
    }
};

// ── Resolve a chat — delete all Cloudinary media assets first ─────
export const resolveChat = async (chatId: string): Promise<void> => {
    // 1. Collect all cloudinaryPublicIds from messages
    const msgsSnap = await getDocs(collection(db, CHATS_COL, chatId, MSGS_COL));
    const deleteJobs: Promise<void>[] = [];

    msgsSnap.docs.forEach(d => {
        const data = d.data() as SupportMessage;
        if (data.cloudinaryPublicId && data.mediaType) {
            // Queue Cloudinary delete
            deleteJobs.push(
                deleteFromCloudinary(data.cloudinaryPublicId, data.mediaType)
            );
        }
    });

    // 2. Delete all Cloudinary assets in parallel
    await Promise.allSettled(deleteJobs);

    // 3. Mark chat as resolved
    await updateDoc(doc(db, CHATS_COL, chatId), { status: 'resolved' });
};

// ── Delete a chat completely ──────────────────────────────────────
export const deleteSupportChat = async (chatId: string): Promise<void> => {
    // 1. Get all messages to delete
    const msgsSnap = await getDocs(collection(db, CHATS_COL, chatId, MSGS_COL));

    // 2. Delete all messages
    const deleteMsgsPromises = msgsSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteMsgsPromises);

    // 3. Delete the parent chat document
    await deleteDoc(doc(db, CHATS_COL, chatId));
};

// ══ AIKO FIREBASE HISTORY ══════════════════════════════════════════

export interface AikoFirebaseMsg {
    id: string;
    role: 'user' | 'aiko';
    text: string;
    emotion?: string;
    timestamp: number;
}

// ── Load Aiko history from Firebase ──────────────────────────────
export const loadAikoHistory = async (userId: string): Promise<AikoFirebaseMsg[]> => {
    const q = query(
        collection(db, AIKO_COL, userId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AikoFirebaseMsg));
};

// ── Save a single Aiko message ────────────────────────────────────
export const saveAikoMessage = async (
    userId: string,
    msg: Omit<AikoFirebaseMsg, 'id'>
): Promise<void> => {
    await addDoc(collection(db, AIKO_COL, userId, 'messages'), msg);
};

// ── Subscribe to Aiko messages (live) ────────────────────────────
export const subscribeToAikoMessages = (
    userId: string,
    callback: (msgs: AikoFirebaseMsg[]) => void
) => {
    const q = query(
        collection(db, AIKO_COL, userId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    return onSnapshot(
        q,
        snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as AikoFirebaseMsg)));
        },
        (err) => {
            console.warn('subscribeToAikoMessages error (check Firestore rules):', err);
            callback([]);
        }
    );
};
