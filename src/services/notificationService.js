import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const NOTIFICATIONS_COLLECTION = 'notifications';

const normalizeDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const subscribeSafe = (queryRef, onItems, onError) => (
  onSnapshot(
    queryRef,
    (snapshot) => onItems(snapshot.docs.map(normalizeDoc)),
    onError,
  )
);

export const subscribeVisibleAnnouncements = (onAnnouncements, onError) => (
  subscribeSafe(
    query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(40)),
    onAnnouncements,
    onError,
  )
);

export const subscribeTargetedNotifications = ({ userId, isAdmin }, onNotifications, onError) => {
  if (!userId) {
    onNotifications([]);
    return () => {};
  }

  const buckets = new Map();
  const emit = () => {
    const merged = [...buckets.values()].flat().sort((first, second) => {
      const firstDate = first.createdAt?.toMillis?.() || Date.parse(first.createdAt || '') || 0;
      const secondDate = second.createdAt?.toMillis?.() || Date.parse(second.createdAt || '') || 0;
      return secondDate - firstDate;
    });

    onNotifications(merged);
  };

  const listeners = [
    subscribeSafe(
      query(collection(db, NOTIFICATIONS_COLLECTION), where('targetType', '==', 'all'), limit(40)),
      (items) => {
        buckets.set('all', items);
        emit();
      },
      onError,
    ),
    subscribeSafe(
      query(collection(db, NOTIFICATIONS_COLLECTION), where('targetType', '==', 'user'), where('targetUserId', '==', userId), limit(40)),
      (items) => {
        buckets.set('user', items);
        emit();
      },
      onError,
    ),
  ];

  if (isAdmin) {
    listeners.push(subscribeSafe(
      query(collection(db, NOTIFICATIONS_COLLECTION), where('targetType', '==', 'admins'), limit(40)),
      (items) => {
        buckets.set('admins', items);
        emit();
      },
      onError,
    ));
  }

  return () => listeners.forEach(unsubscribe => unsubscribe());
};
