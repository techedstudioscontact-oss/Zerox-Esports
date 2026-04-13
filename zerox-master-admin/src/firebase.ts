import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Same Firebase project — access controlled via Firestore rules + secret key
const firebaseConfig = {
    apiKey: "AIzaSyA0-ufAd-42SnKDssCa1gyNa1dtdijMIio",
    authDomain: "zerox-esports.firebaseapp.com",
    projectId: "zerox-esports",
    storageBucket: "zerox-esports.firebasestorage.app",
    messagingSenderId: "1030846411815",
    appId: "1:1030846411815:web:e08f4d669893283c3f8a02"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
