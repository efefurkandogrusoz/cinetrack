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

const NotificationContext = createContext(null);

const TOAST_DURATION = 3200;

export const NotificationProvider = ({ children }) => {
  const { user } = useMovies();
  const userId = user?.uid || 'guest';
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setNotifications(getNotificationsFromLocal(userId));
  }, [userId]);

  useEffect(() => {
    saveNotificationsToLocal(notifications, userId);
  }, [notifications, userId]);

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

    setNotifications(current => [entry, ...current].slice(0, 120));

    if (entry.showToast) {
      showToast(message, entry.toastVariant);
    }

    return entry;
  }, [showToast]);

  useEffect(() => {
    setNotifyHandler(addNotification);
    return () => setNotifyHandler(null);
  }, [addNotification]);

  useEffect(() => {
    if (!user?.uid) return;

    const welcomeKey = `cinetrack_welcome_${userId}`;
    if (sessionStorage.getItem(welcomeKey)) return;

    addNotification(
      NOTIFICATION_TYPES.SYSTEM,
      'Hoş geldin',
      'CineTrack\'e hoş geldin. Film ve dizilerini takip etmeye başlayabilirsin.',
      { showToast: false, actionUrl: '/' },
    );
    sessionStorage.setItem(welcomeKey, '1');
  }, [user?.uid, userId, addNotification]);

  const markAsRead = useCallback((id) => {
    setNotifications(current => current.map(item => (
      item.id === id ? { ...item, read: true } : item
    )));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(current => current.map(item => ({ ...item, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(current => current.filter(item => item.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    showToast('Bildirimler temizlendi.', 'success');
  }, [showToast]);

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
