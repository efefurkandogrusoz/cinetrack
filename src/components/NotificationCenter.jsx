import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, ListChecks, Megaphone, MessageSquare, ShieldAlert, Sparkles, Trash2, TriangleAlert, Wrench, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import {
  formatNotificationTime,
  matchesNotificationFilter,
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPES,
} from '../utils/notificationHelpers';
import '../styles/components/NotificationCenter.css';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  const filtered = useMemo(
    () => notifications.filter(item => matchesNotificationFilter(item, filter)),
    [notifications, filter],
  );

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const shouldLockScroll = window.matchMedia('(max-width: 768px)').matches;

    if (shouldLockScroll) {
      document.documentElement.classList.add('notification-panel-scroll-lock');
      document.body.classList.add('notification-panel-scroll-lock');
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (shouldLockScroll) {
        document.documentElement.classList.remove('notification-panel-scroll-lock');
        document.body.classList.remove('notification-panel-scroll-lock');
      }

      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => setOpen(current => !current);
  const handleClose = () => setOpen(false);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      handleClose();
    }
  };

  const getNotificationPresentation = (notification) => {
    if (notification.type === NOTIFICATION_TYPES.COMMENT) return { icon: MessageSquare, label: 'Yeni yorum', tone: 'comment' };
    if (notification.type === NOTIFICATION_TYPES.MODERATION) return { icon: ShieldAlert, label: 'Moderasyon', tone: 'moderation' };
    if (notification.announcementType === 'feature' || notification.type === 'feature') return { icon: Sparkles, label: 'Yeni özellik', tone: 'feature' };
    if (notification.announcementType === 'maintenance') return { icon: Wrench, label: 'Sistem', tone: 'system' };
    if (notification.announcementType === 'warning' || notification.type === 'warning' || notification.type === 'account') return { icon: TriangleAlert, label: 'Moderasyon', tone: 'moderation' };
    if (notification.source === 'announcement' || notification.source === 'admin') return { icon: Megaphone, label: notification.badge || 'Admin duyurusu', tone: 'announcement' };
    if ([NOTIFICATION_TYPES.FAVORITE, NOTIFICATION_TYPES.WATCHLIST, NOTIFICATION_TYPES.WATCHED, NOTIFICATION_TYPES.RATING].includes(notification.type)) {
      return {
        icon: notification.type === NOTIFICATION_TYPES.FAVORITE ? Heart : ListChecks,
        label: 'Liste güncellemesi',
        tone: 'library',
      };
    }
    if (notification.type === NOTIFICATION_TYPES.SYSTEM) return { icon: Wrench, label: 'Sistem', tone: 'system' };
    return { icon: Bell, label: notification.badge || 'Bildirim', tone: 'default' };
  };

  return (
    <>
      <button
        className={open ? 'notification-bell active' : 'notification-bell'}
        type="button"
        aria-label="Bildirimleri aç"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <Bell size={18} strokeWidth={2} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} okunmamış bildirim`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {createPortal(
        <>
          <aside className={open ? 'notification-panel open' : 'notification-panel'} aria-hidden={!open}>
            <div className="notification-panel-head">
              <div>
                <h2>Bildirimler</h2>
                <p>{unreadCount > 0 ? `${unreadCount} okunmamış` : 'Tümü okundu'}</p>
              </div>
              <button type="button" className="notification-panel-close" onClick={handleClose} aria-label="Kapat">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="notification-panel-actions">
              <button type="button" onClick={markAllAsRead}>Tümünü okundu yap</button>
              <button type="button" onClick={clearNotifications}>Tümünü temizle</button>
            </div>

            <div className="notification-filters" role="tablist" aria-label="Bildirim filtreleri">
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

            <div className="notification-list">
              {filtered.length > 0 ? (
                filtered.map(notification => {
                  const presentation = getNotificationPresentation(notification);
                  const Icon = presentation.icon;

                  return (
                    <article
                      key={notification.id}
                      className={[
                        'notification-item',
                        notification.read ? 'read' : '',
                        notification.source === 'announcement' ? 'announcement' : '',
                        notification.source === 'admin' ? 'admin' : '',
                        `tone-${presentation.tone}`,
                      ].filter(Boolean).join(' ')}
                    >
                    <button
                      type="button"
                      className="notification-item-main"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <span className="notification-item-kicker">
                        <Icon size={14} aria-hidden="true" />
                        {presentation.label}
                      </span>
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{formatNotificationTime(notification.createdAt)}</small>
                    </button>
                    <button
                      type="button"
                      className="notification-item-delete"
                      aria-label="Bildirimi sil"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </article>
                  );
                })
              ) : (
                <div className="notification-empty">
                  <p>Henüz bildirimin yok.</p>
                  <span>Film ve dizileri takip ettikçe bildirimlerin burada görünecek.</span>
                </div>
              )}
            </div>
          </aside>

          {open && (
            <button
              className="notification-panel-backdrop"
              type="button"
              aria-label="Bildirim panelini kapat"
              onClick={handleClose}
            />
          )}
        </>,
        document.body,
      )}
    </>
  );
};

export default NotificationCenter;
