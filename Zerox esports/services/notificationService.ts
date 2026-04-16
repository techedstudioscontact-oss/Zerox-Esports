import OneSignal from 'onesignal-cordova-plugin';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

// Hardcoded OneSignal App ID
const ONESIGNAL_APP_ID = "c029ccad-5c35-4bb6-9557-4cd4eabcfa05";

export const initNotifications = async () => {
    try {
        // 1. Check Platform
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
        if (!isNative) {
            console.log('OneSignal Push is only supported on native devices.');
            setupFirestoreListener(); // Still listen for in-app
            return;
        }

        if (!OneSignal) {
            console.warn("OneSignal plugin not found.");
            return;
        }

        // 2. Initialize (v5 API)
        // Enable verbose logging for debugging
        OneSignal.Debug.setLogLevel(6);

        // Initialize
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // 3. Request Permission
        const granted = await OneSignal.Notifications.requestPermission(true);
        console.log("OneSignal Permission Granted:", granted);

        // 4. Foreground Handler
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            const notification = event.getNotification();
            console.log("Foreground Notification:", notification);
            // Native notification shows by default. No need for extra toast.
        });

        // 5. Click Handler
        OneSignal.Notifications.addEventListener('click', (event) => {
            console.log("Notification Clicked:", event);
            const data = (event.notification as any).additionalData;

            if (data && data.open_url) {
                console.log("Opening URL from Notif:", data.open_url);
                const url = data.open_url;

                // Handle 'app://' Deep Links by converting to Hash Router paths
                if (url.startsWith('app://')) {
                    const path = url.replace('app://', '/');
                    // Use window.location.hash for HashRouter (e.g. #/home)
                    // If path is "home", result is "/home". Hash needs "#/home"
                    window.location.hash = '#' + path;
                }
                // Handle Standard Web Links
                else if (url.startsWith('http')) {
                    window.open(url, '_blank');
                }
                // Handle relative paths
                else {
                    window.location.hash = '#' + (url.startsWith('/') ? url : '/' + url);
                }
            }
        });

        // 6. Handle Subscription / Player ID (v5 uses Properties)
        const id = OneSignal.User.pushSubscription.id;

        if (id) {
            console.log("OneSignal ID (Initial):", id);
            // toast.info(`Debug: Device ID Found: ${id.substring(0, 5)}...`);
        }

        // Listen for subscription changes
        OneSignal.User.pushSubscription.addEventListener('change', (event) => {
            console.log("Push Subscription Changed:", event);
            if (event.current.id) {
                toast.success("Push Subscription Active!");
                updateUserOneSignalId(event.current.id);
            }
        });

        // 7. Auth Listener to Link User
        // This guarantees ID linking whenever auth state is valid
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in: Login to OneSignal (Alias)
                OneSignal.login(user.uid);

                // Ensure ID is saved to Firestore
                const currentId = OneSignal.User.pushSubscription.id;
                if (currentId) {
                    updateUserOneSignalId(currentId);
                } else {
                    // toast.warning("Debug: Device ID is missing.");
                }
            } else {
                // User logged out
                OneSignal.logout();
            }
        });

        setupFirestoreListener();

    } catch (e) {
        console.error('Error initializing OneSignal v5', e);
    }
};

const updateUserOneSignalId = async (playerId: string) => {
    const user = auth.currentUser;
    if (user && playerId) {
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                oneSignalPlayerId: playerId,
                fcmToken: playerId, // Store in both fields for compatibility
                lastSeen: Date.now()
            });
            console.log('OneSignal ID synced to Firestore:', playerId);
            // toast.success("Device Linked to Account"); 
        } catch (err) {
            console.error("Failed to link OneSignal ID", err);
            toast.error("Failed to Link Device: " + (err as any).message);
        }
    }
};

const setupFirestoreListener = () => {
    // Listen to the latest notification in Firestore (Legacy/Web fallback & In-App History)
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();

                // Handle various timestamp formats safely
                let createdMillis = 0;
                if (data.createdAt) {
                    if (typeof data.createdAt === 'number') {
                        createdMillis = data.createdAt;
                    } else if (typeof data.createdAt.toMillis === 'function') {
                        createdMillis = data.createdAt.toMillis();
                    }
                }

                // Only show if created in the last 60 seconds
                const isRecent = (Date.now() - createdMillis) < 60000;

                if (isRecent) {
                    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNative;
                    // Only show double toast if NOT native (since native handler shows one)
                    // if (!isNative) {
                    //     toast.info(data.title || "Alert", {
                    //         description: data.body,
                    //         duration: 8000
                    //     });
                    // }
                }
            }
        });
    });
};
