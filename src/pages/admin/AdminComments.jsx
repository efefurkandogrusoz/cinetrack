import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquare, Search, Trash2 } from 'lucide-react';
import SpoilerContent from '../../components/SpoilerContent';
import UserAvatar from '../../components/UserAvatar';
import usePublicUserProfile from '../../hooks/usePublicUserProfile';
import { deleteAdminComment, subscribeAdminComments } from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

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
          {comment.isSpoiler ? 'Spoiler' : 'Normal'}
        </span>
      </div>

      <div className="admin-comment-media">
        <MessageSquare size={15} aria-hidden="true" />
        <span>{comment.mediaTitle || 'İsimsiz içerik'}</span>
        <small>{comment.mediaType === 'tv' ? 'Dizi' : 'Film'}</small>
      </div>

      {comment.deleted ? (
        <p className="admin-muted">Bu yorum kullanıcı tarafından silinmiş.</p>
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
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAdminComments(
      (nextComments) => {
        setComments(nextComments);
        setLoading(false);
      },
      (loadError) => {
        console.error('Admin comments could not be loaded:', loadError);
        setError('Yorumlar yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredComments = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!query) return comments;

    return comments.filter(comment => [
      comment.text,
      comment.username,
      comment.mediaTitle,
      comment.mediaType,
    ].some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(query)));
  }, [comments, searchTerm]);

  const deleteComment = async (comment) => {
    if (!window.confirm('Bu yorumu kalıcı olarak silmek istediğine emin misin?')) return;

    setBusyId(`${comment.kind}:${comment.id}`);
    setError('');
    try {
      await deleteAdminComment(comment);
    } catch (deleteError) {
      console.error('Admin comment could not be deleted:', deleteError);
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
              onDelete={deleteComment}
              busy={busyId === `${comment.kind}:${comment.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminComments;
