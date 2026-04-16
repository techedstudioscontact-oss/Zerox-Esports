import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';

export interface SystemSettings {
    isLocked: boolean;
    broadcastMessage: string;
    commissionRate: number;
    oneSignalAppId?: string;
    oneSignalApiKey?: string;
    aboutText?: string;
    privacyPolicyUrl?: string;
    termsUrl?: string;
    walletInfoUrl?: string;
    walletInstructions?: string;
    antiCheatVersion?: string;
    antiCheatUrl?: string;
    mainAppVersion?: string;
    mainAppUrl?: string;
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        discord?: string;
        telegram?: string;
        website?: string;
    };
    bgVideoUrl?: string;
    bgImageUrl?: string;
}

const SYSTEM_DOC_REF = doc(db, 'settings', 'global');

export const subscribeToSystemSettings = (callback: (settings: SystemSettings) => void) => {
    return onSnapshot(SYSTEM_DOC_REF, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as SystemSettings);
        } else {
            // Initialize if not exists
            const defaultSettings: SystemSettings = {
                isLocked: false,
                broadcastMessage: "",
                commissionRate: 15,
                aboutText: "Welcome to Zerox eSports.",
                bgVideoUrl: "", // Explicit empty to allow checking
                bgImageUrl: "",
                socialLinks: {}
            };
            setDoc(SYSTEM_DOC_REF, defaultSettings).catch(err => console.error("Auto-init settings failed:", err));
            callback(defaultSettings);
        }
    }, (error) => {
        console.error("System settings subscription error:", error);
        callback({
            isLocked: false,
            broadcastMessage: "",
            commissionRate: 15,
            bgVideoUrl: "", 
            bgImageUrl: ""
        });
    });
};

export const updateSystemSettings = async (settings: Partial<SystemSettings>) => {
    try {
        // Check existence first
        const docSnap = await getDoc(SYSTEM_DOC_REF);
        if (!docSnap.exists()) {
            await setDoc(SYSTEM_DOC_REF, {
                isLocked: false,
                broadcastMessage: "",
                commissionRate: 15,
                ...settings
            });
        } else {
            await updateDoc(SYSTEM_DOC_REF, settings);
        }
    } catch (error) {
        console.error("Error updating system settings:", error);
        throw error;
    }
};
