export const NOTIFICATION_TYPES = {
  FAVORITE: 'favorite',
  WATCHLIST: 'watchlist',
  WATCHED: 'watched',
  DELETE: 'delete',
  RATING: 'rating',
  COMMENT: 'comment',
  RECOMMENDATION: 'recommendation',
  WEEKLY_SUMMARY: 'weekly-summary',
  WATCH_TIME: 'watch-time',
  SHARE: 'share',
  COMPARE: 'compare',
  SYSTEM: 'system',
  ANNOUNCEMENT: 'announcement',
  ADMIN: 'admin',
  WARNING: 'warning',
  FEATURE: 'feature',
  ACCOUNT: 'account',
};

export const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'unread', label: 'Okunmamış' },
  { id: 'actions', label: 'İşlemler' },
  { id: 'recommendation', label: 'Öneriler' },
  { id: 'weekly-summary', label: 'Özet' },
  { id: 'system', label: 'Sistem' },
  { id: 'announcement', label: 'Duyurular' },
];

const ACTION_TYPES = new Set([
  NOTIFICATION_TYPES.FAVORITE,
  NOTIFICATION_TYPES.WATCHLIST,
  NOTIFICATION_TYPES.WATCHED,
  NOTIFICATION_TYPES.DELETE,
  NOTIFICATION_TYPES.RATING,
  NOTIFICATION_TYPES.COMMENT,
  NOTIFICATION_TYPES.SHARE,
]);

export const createNotificationId = () => `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const formatNotificationTime = (isoDate) => {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} sa önce`;

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const matchesNotificationFilter = (notification, filterId) => {
  if (filterId === 'all') return true;
  if (filterId === 'unread') return !notification.read;
  if (filterId === 'actions') return ACTION_TYPES.has(notification.type);
  if (filterId === 'recommendation') {
    return notification.type === NOTIFICATION_TYPES.RECOMMENDATION
      || notification.type === NOTIFICATION_TYPES.COMPARE;
  }
  if (filterId === 'weekly-summary') {
    return notification.type === NOTIFICATION_TYPES.WEEKLY_SUMMARY
      || notification.type === NOTIFICATION_TYPES.WATCH_TIME;
  }
  if (filterId === 'system') return notification.type === NOTIFICATION_TYPES.SYSTEM;
  if (filterId === 'announcement') {
    return notification.type === NOTIFICATION_TYPES.ANNOUNCEMENT
      || notification.source === 'announcement'
      || notification.source === 'admin';
  }
  return true;
};
