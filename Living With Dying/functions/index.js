/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentCreated} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Listen for new documents in the 'notifications' collection.
 * When a Master Admin adds a notification via the Dashboard, this triggers.
 * It sends an actual FCM Push Notification to all users (or filtered).
 */
exports.sendPushOnNewNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        return;
    }

    const data = snapshot.data();
    const notificationId = event.params.notificationId;

    logger.info(`New Notification Detected: ${notificationId}`, data);

    const title = data.title || "New Update";
    const body = data.body || "Check out the latest content!";
    const imageUrl = data.image || null;
    const targetAudience = data.target || 'all';

    // 1. Prepare the Payload
    const messagePayload = {
        notification: {
            title: title,
            body: body,
        },
        data: {
            // Data payload for deep linking or in-app handling
            notificationId: notificationId,
            click_action: "FLUTTER_NOTIFICATION_CLICK" // or generic
        }
    };

    if (imageUrl) {
        messagePayload.notification.imageUrl = imageUrl;
    }

    try {
        // 2. Fetch Target Tokens
        // Ideally, you should batch this if you have > 500 users.
        // For 'all' users:
        let usersQuery = admin.firestore().collection('users');

        if (targetAudience === 'premium') {
            usersQuery = usersQuery.where('paidUser', '==', true);
        } else if (targetAudience === 'free') {
            usersQuery = usersQuery.where('paidUser', '==', false);
        }

        const userSnaps = await usersQuery.get();
        const tokens = [];

        userSnaps.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
            }
        });

        if (tokens.length === 0) {
            logger.info("No tokens found to send.");
            return;
        }

        // 3. Send Multicast
        // FCM supports sending to up to 500 tokens at once.
        // For production, you must chunk the 'tokens' array.

        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < tokens.length; i += chunkSize) {
            chunks.push(tokens.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const response = await admin.messaging().sendEachForMulticast({
                tokens: chunk,
                notification: messagePayload.notification,
                data: messagePayload.data
            });
            logger.info(`Batch sent: Success ${response.successCount}, Fail ${response.failureCount}`);

            // Optional: Cleanup invalid tokens (if error code is 'messaging/registration-token-not-registered')
        }

    } catch (error) {
        logger.error("Error sending push notifications", error);
    }
});
