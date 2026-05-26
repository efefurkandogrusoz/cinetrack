/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMovies } from './MovieContext';
import {
  getNotificationsFromLocal,
  saveNotificationsToLocal,
} from '../services/notificationStorage';
import {
  createNotificationId,
  NOTIFICATION_TYPES,
} from '../utils/notificationHelpers';
import { setNotifyHandler } from '../utils/notifyBridge';
import {
  subscribeTargetedNotifications,
  subscribeVisibleAnnouncements,
} from '../services/notificationService';
import {
  announcementTypeLabels,
  getDateValue,
  isActiveAudienceItem,
} from '../utils/adminContent';
import { isAdminProfile } from '../utils/admin';

const NotificationContext = createContext(null);

const TOAST_DURATION = 3200;

const getRemoteStateKey = (userId, type) => `cinetrack_remote_notifications_${type}_${userId || 'guest'}`;

const getStoredIdSet = (userId, type) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(getRemoteStateKey(userId, type)) || '[]'));
  } catch {
    return new Set();
  }
};

const saveStoredIdSet = (userId, type, values) => {
  localStorage.setItem(getRemoteStateKey(userId, type), JSON.stringify([...values]));
};

const toIsoDate = (value) => {
  const time = getDateValue(value);
  return time ? new Date(time).toISOString() : new Date().toISOString();
};

export const NotificationProvider = ({ children }) => {
  const { user, userProfile } = useMovies();
  const userId = user?.uid || 'guest';
  const isAdmin = isAdminProfile(userProfile);
  const [notificationsByUser, setNotificationsByUser] = useState(() => ({
    [userId]: getNotificationsFromLocal(userId),
  }));
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [remoteStateVersion, setRemoteStateVersion] = useState(0);
  const [toasts, setToasts] = useState([]);

  const remoteReadIds = useMemo(() => {
    void remoteStateVersion;
    return getStoredIdSet(userId, 'read');
  }, [remoteStateVersion, userId]);
  const remoteHiddenIds = useMemo(() => {
    void remoteStateVersion;
    return getStoredIdSet(userId, 'hidden');
  }, [remoteStateVersion, userId]);

  const localNotifications = useMemo(() => (
    notificationsByUser[userId] ?? getNotificationsFromLocal(userId)
  ), [notificationsByUser, userId]);

  const announcementNotifications = useMemo(() => (
    announcements
      .filter(announcement => announcement.showInNotifications === true)
      .filter(announcement => isActiveAudienceItem(announcement, { user, isAdmin }))
      .map(announcement => ({
        id: `announcement:${announcement.id}`,
        remoteId: announcement.id,
        source: 'announcement',
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        title: announcement.title,
        message: announcement.message,
        read: remoteReadIds.has(`announcement:${announcement.id}`),
        createdAt: toIsoDate(announcement.createdAt || announcement.startDate),
        actionUrl: null,
        toastVariant: announcement.type === 'warning' || announcement.type === 'maintenance' ? 'warning' : 'info',
        badge: announcementTypeLabels[announcement.type] || 'Duyuru',
        announcementType: announcement.type,
      }))
  ), [announcements, isAdmin, remoteReadIds, user]);

  const firestoreNotifications = useMemo(() => (
    (user?.uid ? remoteNotifications : []).map(notification => ({
      id: `remote:${notification.id}`,
      remoteId: notification.id,
      source: 'admin',
      type: notification.type || NOTIFICATION_TYPES.ADMIN,
      title: notification.title,
      message: notification.message,
      read: remoteReadIds.has(`remote:${notification.id}`) || notification.isRead === true,
      createdAt: toIsoDate(notification.createdAt),
      actionUrl: notification.actionUrl || null,
      toastVariant: notification.type === 'warning' || notification.type === 'account' ? 'warning' : 'info',
      badge: 'Admin',
    }))
  ), [remoteNotifications, remoteReadIds, user?.uid]);

  const notifications = useMemo(() => (
    [
      ...announcementNotifications,
      ...firestoreNotifications,
      ...localNotifications,
    ]
      .filter(item => !remoteHiddenIds.has(item.id))
      .sort((first, second) => getDateValue(second.createdAt) - getDateValue(first.createdAt))
  ), [announcementNotifications, firestoreNotifications, localNotifications, remoteHiddenIds]);

  const updateNotifications = useCallback((updater) => {
    setNotificationsByUser((current) => {
      const currentNotifications = current[userId] ?? getNotificationsFromLocal(userId);
      const nextNotifications = updater(currentNotifications);

      return {
        ...current,
        [userId]: nextNotifications,
      };
    });
  }, [userId]);

  useEffect(() => {
    saveNotificationsToLocal(localNotifications, userId);
  }, [localNotifications, userId]);

  useEffect(() => {
    const unsubscribeAnnouncements = subscribeVisibleAnnouncements(
      setAnnouncements,
      () => {},
    );

    return () => unsubscribeAnnouncements();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const unsubscribe = subscribeTargetedNotifications(
      { userId: user.uid, isAdmin },
      setRemoteNotifications,
      () => {},
    );

    return () => unsubscribe();
  }, [isAdmin, user?.uid]);

  const showToast = useCallback((message, variant = 'info') => {
    const id = createNotificationId();
    setToasts(current => [...current.slice(-2), { id, message, variant }]);

    window.setTimeout(() => {
      setToasts(current => current.filter(toast => toast.id !== id));
    }, TOAST_DURATION);
  }, []);

  const addNotification = useCallback((type, title, message, options = {}) => {
    const entry = {
      id: createNotificationId(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      movieId: options.movieId || null,
      actionUrl: options.actionUrl || null,
      toastVariant: options.toastVariant || 'info',
      showToast: options.showToast !== false,
    };

    updateNotifications(current => [entry, ...current].slice(0, 120));

    if (entry.showToast) {
      showToast(message, entry.toastVariant);
    }

    return entry;
  }, [showToast, updateNotifications]);

  useEffect(() => {
    setNotifyHandler(addNotification);
    return () => setNotifyHandler(null);
  }, [addNotification]);

  useEffect(() => {
    if (!user?.uid) return;

    const welcomeKey = `cinetrack_welcome_${userId}`;
    if (sessionStorage.getItem(welcomeKey)) return;

    sessionStorage.setItem(welcomeKey, '1');

    const timeoutId = window.setTimeout(() => {
      addNotification(
        NOTIFICATION_TYPES.SYSTEM,
        'Hoş geldin',
        'CineTrack\'e hoş geldin. Film ve dizilerini takip etmeye başlayabilirsin.',
        { showToast: false, actionUrl: '/' },
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [user?.uid, userId, addNotification]);

  const markAsRead = useCallback((id) => {
    if (id.startsWith('remote:') || id.startsWith('announcement:')) {
      const next = getStoredIdSet(userId, 'read');
      next.add(id);
      saveStoredIdSet(userId, 'read', next);
      setRemoteStateVersion(current => current + 1);
      return;
    }

    updateNotifications(current => current.map(item => (
      item.id === id ? { ...item, read: true } : item
    )));
  }, [updateNotifications, userId]);

  const markAllAsRead = useCallback(() => {
    const remoteIds = notifications
      .filter(item => item.id.startsWith('remote:') || item.id.startsWith('announcement:'))
      .map(item => item.id);

    if (remoteIds.length > 0) {
      const next = getStoredIdSet(userId, 'read');
      remoteIds.forEach(id => next.add(id));
      saveStoredIdSet(userId, 'read', next);
      setRemoteStateVersion(current => current + 1);
    }

    updateNotifications(current => current.map(item => ({ ...item, read: true })));
  }, [notifications, updateNotifications, userId]);

  const removeNotification = useCallback((id) => {
    if (id.startsWith('remote:') || id.startsWith('announcement:')) {
      const next = getStoredIdSet(userId, 'hidden');
      next.add(id);
      saveStoredIdSet(userId, 'hidden', next);
      setRemoteStateVersion(current => current + 1);
      return;
    }

    updateNotifications(current => current.filter(item => item.id !== id));
  }, [updateNotifications, userId]);

  const clearNotifications = useCallback(() => {
    const remoteIds = notifications
      .filter(item => item.id.startsWith('remote:') || item.id.startsWith('announcement:'))
      .map(item => item.id);

    if (remoteIds.length > 0) {
      const next = getStoredIdSet(userId, 'hidden');
      remoteIds.forEach(id => next.add(id));
      saveStoredIdSet(userId, 'hidden', next);
      setRemoteStateVersion(current => current + 1);
    }

    updateNotifications(() => []);
    showToast('Bildirimler temizlendi.', 'success');
  }, [notifications, showToast, updateNotifications, userId]);

  const unreadCount = useMemo(
    () => notifications.filter(item => !item.read).length,
    [notifications],
  );

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    toasts,
    addNotification,
    showToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    NOTIFICATION_TYPES,
  }), [
    notifications,
    unreadCount,
    toasts,
    addNotification,
    showToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
