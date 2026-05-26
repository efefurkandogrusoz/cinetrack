import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Shield, ShieldOff, UserX } from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { useMovies } from '../../context/MovieContext';
import {
  loadUserCommentCounts,
  subscribeAdminUsers,
  updateUserDisabled,
  updateUserRole,
} from '../../services/adminService';
import { formatAdminDate, isAdminProfile } from '../../utils/admin';

const getUserId = (profile) => profile.uid || profile.id;

const AdminUsers = () => {
  const { user } = useMovies();
  const [users, setUsers] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAdminUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        setLoading(false);
      },
      () => {
        setError('Kullanıcılar yüklenemedi.');
        setLoading(false);
      },
    );

    loadUserCommentCounts()
      .then(setCommentCounts)
      .catch(() => {
        setError('Yorum sayıları şu anda yüklenemedi.');
      });

    return () => unsubscribe();
  }, []);

  const changeRole = async (profile) => {
    const userId = getUserId(profile);
    const nextRole = isAdminProfile(profile) ? 'user' : 'admin';

    if (userId === user?.uid && nextRole !== 'admin') {
      setError('Kendi admin yetkini buradan kaldıramazsın.');
      return;
    }

    setBusyUserId(userId);
    setError('');
    try {
      await updateUserRole(userId, nextRole);
    } catch {
      setError('Rol güncellenemedi.');
    } finally {
      setBusyUserId('');
    }
  };

  const toggleDisabled = async (profile) => {
    const userId = getUserId(profile);
    const disabled = profile.disabled === true;

    if (userId === user?.uid && !disabled) {
      setError('Kendi hesabını pasif hale getiremezsin.');
      return;
    }

    setBusyUserId(userId);
    setError('');
    try {
      await updateUserDisabled(userId, !disabled);
    } catch {
      setError('Kullanıcı durumu güncellenemedi.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Kullanıcı Yönetimi</p>
          <h2>Kullanıcılar</h2>
        </div>
        <span className="admin-count-pill">{users.length}</span>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      {loading ? (
        <p className="admin-empty">Kullanıcılar yükleniyor...</p>
      ) : users.length === 0 ? (
        <p className="admin-empty">Henüz kullanıcı yok.</p>
      ) : (
        <div className="admin-table admin-users-table">
          <div className="admin-table-head">
            <span>Kullanıcı</span>
            <span>E-posta</span>
            <span>Rol</span>
            <span>Kayıt</span>
            <span>Yorum</span>
            <span>İşlem</span>
          </div>

          {users.map(profile => {
            const userId = getUserId(profile);
            const isBusy = busyUserId === userId;

            return (
              <article className="admin-table-row" key={userId}>
                <div className="admin-user-cell">
                  <UserAvatar profile={profile} className="admin-avatar" decorative />
                  <div>
                    <strong>{profile.displayName || profile.username || 'CineTrack kullanıcısı'}</strong>
                    {profile.disabled && <small>Pasif hesap</small>}
                  </div>
                </div>
                <span>{profile.email || 'E-posta yok'}</span>
                <span className={isAdminProfile(profile) ? 'admin-role-badge admin' : 'admin-role-badge'}>
                  {isAdminProfile(profile) ? 'Admin' : 'Kullanıcı'}
                </span>
                <span>{formatAdminDate(profile.createdAt)}</span>
                <span>{commentCounts[userId] || 0}</span>
                <div className="admin-row-actions">
                  <Link to={`/user/${userId}`} title="Profili görüntüle">
                    <ExternalLink size={15} aria-hidden="true" />
                    Profil
                  </Link>
                  <button type="button" onClick={() => changeRole(profile)} disabled={isBusy}>
                    {isAdminProfile(profile) ? <ShieldOff size={15} aria-hidden="true" /> : <Shield size={15} aria-hidden="true" />}
                    {isAdminProfile(profile) ? 'Yetkiyi kaldır' : 'Admin yap'}
                  </button>
                  <button type="button" onClick={() => toggleDisabled(profile)} disabled={isBusy}>
                    <UserX size={15} aria-hidden="true" />
                    {profile.disabled ? 'Aktif yap' : 'Pasifleştir'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
