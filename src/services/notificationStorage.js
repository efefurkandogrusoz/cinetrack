const STORAGE_KEY = 'cinetrack_notifications';
const MAX_NOTIFICATIONS = 120;

const getStorageKey = (userId = 'guest') => `${STORAGE_KEY}_${userId}`;

export const getNotificationsFromLocal = (userId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveNotificationsToLocal = (notifications, userId) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch (error) {
    console.warn('Bildirimler kaydedilemedi:', error);
  }
};
