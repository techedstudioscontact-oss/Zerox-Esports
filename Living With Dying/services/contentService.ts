import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Tournament } from '../types';
import { serverTimestamp, runTransaction } from 'firebase/firestore';

// Helper for Month ID
const getCurrentMonthId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Subscribe to content updates in real-time
export const subscribeToContent = (callback: (content: Tournament[]) => void) => {
  const q = query(collection(db, 'content'), orderBy('createdAt', 'desc'));

  // onSnapshot provides real-time updates and handles offline/online sync
  return onSnapshot(q, (snapshot) => {
    const contentList: Tournament[] = [];
    snapshot.forEach((doc) => {
      contentList.push(doc.data() as Tournament);
    });
    callback(contentList);
  }, (error) => {
    console.error("Error fetching real-time content:", error);
    // CRITICAL FIX: In case of error (e.g. permission denied, network), return empty list 
    // so the UI can stop loading and render the empty state.
    callback([]);
  });
};

export const addContentToDb = async (content: Tournament) => {
  try {
    const monthId = getCurrentMonthId();
    // Composite ID: UID_YYYY-MM
    const activityId = `${content.uploadedBy}_${monthId}`;
    const activityRef = doc(db, 'admin_activity', activityId);
    const contentRef = doc(db, 'content', content.id);

    await runTransaction(db, async (transaction) => {
      // 1. READ FIRST (Client SDK requirement)
      const activityDoc = await transaction.get(activityRef);

      // 2. Add Content
      transaction.set(contentRef, content);

      // 3. Update Admin Activity
      if (!activityDoc.exists()) {
        transaction.set(activityRef, {
          id: activityId,
          adminId: content.uploadedBy,
          month: monthId,
          uploadCount: 1,
          totalViews: 0,
          isEligible: false,
          lastUpdated: serverTimestamp()
        });
      } else {
        const currentCount = activityDoc.data().uploadCount || 0;
        const newCount = currentCount + 1;
        transaction.update(activityRef, {
          uploadCount: newCount,
          isEligible: newCount >= 2,
          lastUpdated: serverTimestamp()
        });
      }
    });
  } catch (error) {
    console.error("Error adding content with activity tracking:", error);
    throw error;
  }
};

export const updateContentInDb = async (contentId: string, updates: Partial<Tournament>) => {
  try {
    await updateDoc(doc(db, 'content', contentId), updates);
  } catch (error) {
    console.error("Error updating content:", error);
    throw error;
  }
};

export const deleteContentFromDb = async (contentId: string) => {
  try {
    await deleteDoc(doc(db, 'content', contentId));
  } catch (error) {
    console.error("Error deleting content:", error);
    throw error;
  }
};