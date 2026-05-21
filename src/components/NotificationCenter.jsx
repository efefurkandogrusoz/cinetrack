import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import {
  formatNotificationTime,
  matchesNotificationFilter,
  NOTIFICATION_FILTERS,
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

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      handleClose();
    }
  };

  return (
    <>
      <button
        className={open ? 'notification-bell active' : 'notification-bell'}
        type="button"
        aria-label="Bildirimleri aç"
        onClick={handleOpen}
      >
        <Bell size={18} strokeWidth={2} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-label={`${unreadCount} okunmamış bildirim`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

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
            filtered.map(notification => (
              <article
                key={notification.id}
                className={notification.read ? 'notification-item read' : 'notification-item'}
              >
                <button
                  type="button"
                  className="notification-item-main"
                  onClick={() => handleNotificationClick(notification)}
                >
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
            ))
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
    </>
  );
};

export default NotificationCenter;
