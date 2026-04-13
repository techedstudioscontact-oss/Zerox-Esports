import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export const MASTER_SECRET = 'ZEROX_MASTER_2026';

export const isAdminEmail = (email: string) => {
    if (!email) return false;
    const e = email.toLowerCase();
    return e.endsWith('@zeroxesports.com') || e === 'ope@zeroxesports.com' || e === 'open@zeroxesports.com';
};

export const loginAdmin = async (email: string, password: string, secretKey: string) => {
    if (!isAdminEmail(email)) {
        throw new Error('Access denied. Only @zeroxesports.com accounts are allowed.');
    }
    if (secretKey !== MASTER_SECRET) {
        throw new Error('Invalid master secret key.');
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
};

export const logoutAdmin = () => auth.signOut();
