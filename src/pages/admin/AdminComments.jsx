import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquare, Search, Trash2 } from 'lucide-react';
import SpoilerContent from '../../components/SpoilerContent';
import UserAvatar from '../../components/UserAvatar';
import usePublicUserProfile from '../../hooks/usePublicUserProfile';
import { deleteAdminComment, subscribeAdminComments } from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

const deleteReasons = [
  'Küfür / hakaret',
  'Spam',
  'Spoiler ihlali',
  'Uygunsuz içerik',
  'Yanlış bilgi',
  'Diğer',
];

const AdminCommentCard = ({ comment, onDelete, busy }) => {
  const authorProfile = usePublicUserProfile(comment.userId, { username: comment.username });
  const authorName = authorProfile.displayName || comment.username || 'CineTrack kullanıcısı';
  const isReply = comment.kind === 'reply';

  return (
    <article className={comment.deleted ? 'admin-comment-card deleted' : 'admin-comment-card'}>
      <div className="admin-comment-top">
        <Link to={`/user/${comment.userId}`} className="admin-comment-author">
          <UserAvatar profile={authorProfile} className="admin-avatar" decorative />
          <span>
            <strong>{authorName}</strong>
            <small>{isReply ? 'Yanıt' : 'Ana yorum'} · {formatAdminDate(comment.createdAt)}</small>
          </span>
        </Link>
        <span className={comment.isSpoiler ? 'admin-spoiler-pill active' : 'admin-spoiler-pill'}>
          {comment.deleted ? 'Silindi' : comment.isSpoiler ? 'Spoiler' : (comment.status || 'published')}
        </span>
      </div>

      <div className="admin-comment-media">
        <MessageSquare size={15} aria-hidden="true" />
        <span>{comment.mediaTitle || 'İsimsiz içerik'}</span>
        <small>{comment.mediaType === 'tv' ? 'Dizi' : 'Film'}</small>
      </div>

      {comment.deleted ? (
        <p className="admin-muted">
          Bu yorum kaldırılmış. Sebep: {comment.deleteReason || 'Belirtilmedi'}
        </p>
      ) : (
        <SpoilerContent text={comment.text} isSpoiler={comment.isSpoiler === true} />
      )}

      <div className="admin-comment-footer">
        <span>{comment.likes || 0} beğeni</span>
        <div className="admin-row-actions">
          <Link to="/movies">
            <ExternalLink size={15} aria-hidden="true" />
            Filme git
          </Link>
          <button type="button" onClick={() => onDelete(comment)} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" />
            Sil
          </button>
        </div>
      </div>
    </article>
  );
};

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState(deleteReasons[0]);
  const [deleteNote, setDeleteNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAdminComments(
      (nextComments) => {
        setComments(nextComments);
        setLoading(false);
      },
      () => {
        setError('Yorumlar yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredComments = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR');
    const byStatus = comments.filter((comment) => {
      if (statusFilter === 'deleted') return comment.deleted;
      if (statusFilter === 'pending') return comment.status === 'pending';
      if (statusFilter === 'hidden') return comment.status === 'hidden' || comment.status === 'rejected';
      return !comment.deleted && (comment.status === 'published' || !comment.status);
    });

    if (!query) return byStatus;

    return byStatus.filter(comment => [
      comment.text,
      comment.username,
      comment.mediaTitle,
      comment.mediaType,
    ].some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(query)));
  }, [comments, searchTerm, statusFilter]);

  const openDeleteModal = (comment) => {
    setDeleteTarget(comment);
    setDeleteReason(deleteReasons[0]);
    setDeleteNote('');
  };

  const deleteComment = async () => {
    if (!deleteTarget) return;

    setBusyId(`${deleteTarget.kind}:${deleteTarget.id}`);
    setError('');
    try {
      await deleteAdminComment(deleteTarget, {
        reason: deleteReason,
        note: deleteNote.trim(),
      });
      setDeleteTarget(null);
    } catch {
      setError('Yorum silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Yorum Yönetimi</p>
          <h2>Tüm yorumlar</h2>
        </div>
        <span className="admin-count-pill">{comments.length}</span>
      </div>

      <label className="admin-search-field">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          placeholder="Yorum, kullanıcı veya film ara"
          onChange={event => setSearchTerm(event.target.value)}
        />
      </label>

      <div className="admin-filter-tabs">
        {[
          { id: 'active', label: 'Yayındaki yorumlar' },
          { id: 'pending', label: 'İnceleme bekleyen' },
          { id: 'hidden', label: 'Gizli / reddedilen' },
          { id: 'deleted', label: 'Silinen yorumlar' },
        ].map(item => (
          <button
            key={item.id}
            type="button"
            className={statusFilter === item.id ? 'active' : ''}
            onClick={() => setStatusFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="admin-alert">{error}</p>}

      {loading ? (
        <p className="admin-empty">Yorumlar yükleniyor...</p>
      ) : filteredComments.length === 0 ? (
        <p className="admin-empty">Eşleşen yorum bulunamadı.</p>
      ) : (
        <div className="admin-comment-grid">
          {filteredComments.map(comment => (
            <AdminCommentCard
              key={`${comment.kind}:${comment.id}`}
              comment={comment}
              onDelete={openDeleteModal}
              busy={busyId === `${comment.kind}:${comment.id}`}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-layer" role="dialog" aria-modal="true" aria-label="Yorum silme sebebi">
          <div className="admin-modal-card">
            <h3>Yorumu kaldır</h3>
            <p>Yorum soft delete olarak işaretlenecek ve silme sebebi saklanacak.</p>
            <label>
              <span>Silme sebebi</span>
              <select value={deleteReason} onChange={event => setDeleteReason(event.target.value)}>
                {deleteReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            <label>
              <span>Açıklama</span>
              <textarea value={deleteNote} onChange={event => setDeleteNote(event.target.value)} maxLength={240} />
            </label>
            <div className="admin-form-actions">
              <button type="button" onClick={deleteComment} disabled={Boolean(busyId)}>Onayla</button>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(busyId)}>Vazgeç</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminComments;
