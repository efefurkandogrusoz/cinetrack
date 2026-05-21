import { useEffect, useState } from 'react';
import { Film, Flag, MessageSquare, RefreshCw, Users } from 'lucide-react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import SpoilerContent from '../../components/SpoilerContent';
import { loadAdminDashboard } from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

const emptyDashboard = {
  totals: {
    users: 0,
    comments: 0,
    movies: 0,
    reports: 0,
  },
  topCommentedMedia: [],
  topLikedComments: [],
};

const AdminDashboard = () => {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await loadAdminDashboard());
    } catch (loadError) {
      console.error('Admin dashboard could not be loaded:', loadError);
      setError('Dashboard verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    loadAdminDashboard()
      .then((nextDashboard) => {
        if (!cancelled) setDashboard(nextDashboard);
      })
      .catch((loadError) => {
        console.error('Admin dashboard could not be loaded:', loadError);
        if (!cancelled) setError('Dashboard verileri yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Genel Bakış</p>
          <h2>Dashboard</h2>
        </div>
        <button type="button" onClick={loadDashboard} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" />
          Yenile
        </button>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <div className="admin-stat-grid">
        <AdminStatCard icon={Users} label="Toplam kullanıcı" value={loading ? '...' : dashboard.totals.users} />
        <AdminStatCard icon={MessageSquare} label="Toplam yorum" value={loading ? '...' : dashboard.totals.comments} />
        <AdminStatCard icon={Film} label="Film kayıtları" value={loading ? '...' : dashboard.totals.movies} />
        <AdminStatCard icon={Flag} label="Şikayetler" value={loading ? '...' : dashboard.totals.reports} />
      </div>

      <div className="admin-grid-two">
        <section className="admin-panel-card">
          <h3>En çok yorum yapılan filmler</h3>
          {dashboard.topCommentedMedia.length === 0 ? (
            <p className="admin-empty">Henüz veri yok.</p>
          ) : dashboard.topCommentedMedia.map(item => (
            <article className="admin-mini-row" key={item.key}>
              <div>
                <strong>{item.mediaTitle}</strong>
                <span>{item.mediaType === 'tv' ? 'Dizi' : 'Film'}</span>
              </div>
              <b>{item.count}</b>
            </article>
          ))}
        </section>

        <section className="admin-panel-card">
          <h3>En çok beğenilen yorumlar</h3>
          {dashboard.topLikedComments.length === 0 ? (
            <p className="admin-empty">Henüz beğeni alan yorum yok.</p>
          ) : dashboard.topLikedComments.map(comment => (
            <article className="admin-comment-preview" key={`${comment.kind}:${comment.id}`}>
              <div>
                <strong>{comment.username || 'Kullanıcı'}</strong>
                <span>{comment.mediaTitle || 'İsimsiz'} · {formatAdminDate(comment.createdAt)}</span>
              </div>
              <SpoilerContent text={comment.text} isSpoiler={comment.isSpoiler === true} />
              <small>{comment.likes || 0} beğeni</small>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
