import { useEffect, useMemo, useState } from 'react';
import { Send, Search } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  sendAdminNotification,
  subscribeAdminUsers,
} from '../../services/adminService';
import { notificationTypeLabels } from '../../utils/adminContent';
import { isAdminProfile } from '../../utils/admin';

const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  targetType: 'all',
  targetUserId: '',
};

const AdminSendNotification = () => {
  const { showToast } = useNotifications();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [userQuery, setUserQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAdminUsers(
      (items) => {
        setUsers(items);
        setLoadingUsers(false);
      },
      () => {
        setError('Kullanıcılar yüklenemedi.');
        setLoadingUsers(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return users.slice(0, 8);

    return users.filter(user => [
      user.displayName,
      user.username,
      user.email,
    ].some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(query))).slice(0, 8);
  }, [userQuery, users]);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const selectUser = (profile) => {
    setForm(current => ({ ...current, targetUserId: profile.uid || profile.id }));
    setUserQuery(profile.displayName || profile.email || '');
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      setError('Bildirim başlığı ve mesajı zorunlu.');
      return;
    }

    if (form.targetType === 'user' && !form.targetUserId) {
      setError('Belirli kullanıcı bildirimi için kullanıcı seçmelisin.');
      return;
    }

    setSending(true);
    setError('');
    setMessage('');
    try {
      await sendAdminNotification(form);
      setForm(emptyForm);
      setUserQuery('');
      setMessage('Bildirim başarıyla gönderildi.');
      showToast('Bildirim gönderildi.', 'success');
    } catch {
      setError('Bildirim gönderilemedi.');
      showToast('Bildirim gönderilemedi.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Bildirim Merkezi</p>
          <h2>Bildirim Gönder</h2>
        </div>
        <span className="admin-count-pill">{users.length} kullanıcı</span>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-alert">{error}</p>}

      <form className="admin-form-grid" onSubmit={submit}>
        <label>
          <span>Bildirim başlığı</span>
          <input value={form.title} onChange={event => updateField('title', event.target.value)} maxLength={90} />
        </label>
        <label>
          <span>Bildirim tipi</span>
          <select value={form.type} onChange={event => updateField('type', event.target.value)}>
            {Object.entries(notificationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="admin-field-wide">
          <span>Bildirim mesajı</span>
          <textarea value={form.message} onChange={event => updateField('message', event.target.value)} maxLength={320} />
        </label>
        <label>
          <span>Alıcı seçimi</span>
          <select value={form.targetType} onChange={event => updateField('targetType', event.target.value)}>
            <option value="all">Tüm kullanıcılara gönder</option>
            <option value="admins">Sadece adminlere gönder</option>
            <option value="user">Belirli kullanıcıya gönder</option>
          </select>
        </label>

        {form.targetType === 'user' && (
          <div className="admin-user-picker">
            <label className="admin-search-field">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={userQuery}
                placeholder="Kullanıcı adı veya e-posta ara"
                onChange={event => {
                  setUserQuery(event.target.value);
                  updateField('targetUserId', '');
                }}
              />
            </label>
            <div className="admin-picker-list">
              {loadingUsers ? (
                <p>Kullanıcılar yükleniyor...</p>
              ) : filteredUsers.map(profile => (
                <button
                  key={profile.uid || profile.id}
                  type="button"
                  className={form.targetUserId === (profile.uid || profile.id) ? 'selected' : ''}
                  onClick={() => selectUser(profile)}
                >
                  <strong>{profile.displayName || profile.username || 'CineTrack kullanıcısı'}</strong>
                  <span>{profile.email || 'E-posta yok'}{isAdminProfile(profile) ? ' · Admin' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="admin-form-actions">
          <button type="submit" disabled={sending}>
            <Send size={15} aria-hidden="true" />
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSendNotification;
