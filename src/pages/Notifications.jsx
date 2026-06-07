import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Heart,
  ListChecks,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Trash2,
  Wrench,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useNotifications } from '../context/NotificationContext';
import {
  formatNotificationTime,
  matchesNotificationFilter,
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
} from '../utils/notificationHelpers';
import '../styles/pages/pages.css';
import '../styles/components/NotificationCenter.css';

const getNotificationMeta = (notification = {}) => {
  if (notification.type === NOTIFICATION_TYPES.COMMENT) {
    return { icon: MessageSquare, label: 'Yeni yorum', tone: 'comment' };
  }
  if (notification.type === NOTIFICATION_TYPES.MODERATION || notification.type === NOTIFICATION_TYPES.WARNING || notification.type === NOTIFICATION_TYPES.ACCOUNT) {
    return { icon: ShieldAlert, label: 'Moderasyon', tone: 'moderation' };
  }
  if (notification.source === 'announcement' || notification.type === NOTIFICATION_TYPES.ANNOUNCEMENT || notification.source === 'admin') {
    return { icon: Megaphone, label: notification.badge || 'Admin duyurusu', tone: 'announcement' };
  }
  if ([NOTIFICATION_TYPES.FAVORITE, NOTIFICATION_TYPES.WATCHLIST, NOTIFICATION_TYPES.WATCHED, NOTIFICATION_TYPES.RATING].includes(notification.type)) {
    return {
      icon: notification.type === NOTIFICATION_TYPES.FAVORITE ? Heart : ListChecks,
      label: 'Liste güncellemesi',
      tone: 'library',
    };
  }
  if (notification.type === NOTIFICATION_TYPES.SYSTEM) {
    return { icon: Wrench, label: 'Sistem', tone: 'system' };
  }

  return { icon: Bell, label: notification.badge || 'Bildirim', tone: 'default' };
};

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  const filteredNotifications = useMemo(
    () => notifications.filter(item => matchesNotificationFilter(item, filter)),
    [filter, notifications],
  );

  const openNotification = (notification) => {
    markAsRead(notification.id);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <div className="page-container notifications-page">
      <Navbar />
      <div className="page-content">
        <main className="container-fluid notifications-page-shell">
          <section className="page-header">
            <p className="eyebrow">Hesap</p>
            <h2>Bildirimler</h2>
            <p>{unreadCount > 0 ? `${unreadCount} okunmamış bildirimin var` : 'Tüm bildirimlerin okunmuş görünüyor.'}</p>
          </section>

          <section className="notifications-summary-panel" aria-label="Bildirim özeti">
            <div>
              <span>Okunmamış</span>
              <strong>{unreadCount}</strong>
            </div>
            <div>
              <span>Toplam</span>
              <strong>{notifications.length}</strong>
            </div>
            <div className="notifications-page-actions">
              <button type="button" onClick={markAllAsRead} disabled={notifications.length === 0}>
                <CheckCheck size={16} aria-hidden="true" />
                Okundu İşaretle
              </button>
              <button type="button" onClick={clearNotifications} disabled={notifications.length === 0}>
                <Trash2 size={16} aria-hidden="true" />
                Temizle
              </button>
            </div>
          </section>

          <div className="notification-filters notifications-page-filters" role="tablist" aria-label="Bildirim filtreleri">
            {NOTIFICATION_FILTERS.map(item => (
              <button
                key={item.id}
                type="button"
                className={filter === item.id ? 'active' : ''}
                onClick={() => setFilter(item.id)}
                role="tab"
                aria-selected={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="notification-empty notifications-page-empty">
              <Bell size={22} aria-hidden="true" />
              <p>Henüz bildirimin yok</p>
              <span>Yeni yorumlar, admin duyuruları ve liste güncellemeleri burada görünecek.</span>
            </div>
          ) : (
            <div className="notifications-page-list">
              {filteredNotifications.map(notification => {
                const meta = getNotificationMeta(notification);
                const Icon = meta.icon;

                return (
                  <article
                    key={notification.id}
                    className={[
                      'notification-page-card',
                      notification.read ? 'read' : '',
                      `tone-${meta.tone}`,
                    ].filter(Boolean).join(' ')}
                  >
                    <button type="button" className="notification-page-card-main" onClick={() => openNotification(notification)}>
                      <span className="notification-type-icon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className="notification-page-card-copy">
                        <small>{meta.label}</small>
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <time>{formatNotificationTime(notification.createdAt)}</time>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="notification-item-delete"
                      aria-label="Bildirimi sil"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Notifications;
