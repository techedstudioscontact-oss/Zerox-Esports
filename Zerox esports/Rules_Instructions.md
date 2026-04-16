# Zerox eSports - Firebase Security Rules
I have provided a production-ready `firestore.rules` file in your project folder (`f:\Zerox eSports\Living With Dying\firestore.rules`).

### To deploy these rules:
**Method 1: Using Firebase CLI (Recommended)**
1. Ensure you have `firebase-tools` installed globally (`npm install -g firebase-tools`).
2. Run `firebase login`.
3. Make sure `firebase.json` points to this `firestore.rules` file:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```
4. Run `firebase deploy --only firestore:rules`

**Method 2: Manual Update in Firebase Console**
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left sidebar, click on **Firestore Database**.
4. Click on the **Rules** tab at the top.
5. Copy the contents of the `firestore.rules` file and paste it there.
6. Click **Publish**.

These rules guarantee your application is secure against rogue actions. Only authenticated Administrators can edit the `content` (Tournaments) table, and Users can only modify their own profiles.
