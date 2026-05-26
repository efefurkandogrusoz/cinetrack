import { useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, EyeOff, ShieldAlert, Trash2, UserX, XCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import {
  addBannedWord,
  deleteAdminComment,
  deleteBannedWord,
  sendAdminNotification,
  subscribeBannedWords,
  subscribePendingComments,
  updateBannedWordActive,
  updateCommentModerationStatus,
  updateUserDisabled,
} from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

const statusLabels = {
  pending: 'İnceleme bekliyor',
  published: 'Yayında',
  hidden: 'Gizli',
  rejected: 'Reddedildi',
};

const AdminModeration = () => {
  const { showToast } = useNotifications();
  const [words, setWords] = useState([]);
  const [comments, setComments] = useState([]);
  const [wordDraft, setWordDraft] = useState('');
  const [loadingWords, setLoadingWords] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeBannedWords(
      (items) => {
        setWords(items);
        setLoadingWords(false);
      },
      () => {
        setError('Yasaklı kelimeler yüklenemedi.');
        setLoadingWords(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribePendingComments(
      (items) => {
        setComments(items);
        setLoadingComments(false);
      },
      () => {
        setError('Şüpheli yorumlar yüklenemedi.');
        setLoadingComments(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredComments = useMemo(() => (
    filter === 'all' ? comments : comments.filter(comment => (comment.status || 'published') === filter)
  ), [comments, filter]);

  const createWord = async (event) => {
    event.preventDefault();
    const word = wordDraft.trim();
    if (!word) return;

    setError('');
    try {
      await addBannedWord(word);
      setWordDraft('');
      showToast('Yasaklı kelime eklendi.', 'success');
    } catch {
      setError('Yasaklı kelime eklenemedi.');
      showToast('Yasaklı kelime eklenemedi.', 'error');
    }
  };

  const runCommentAction = async (comment, action, successMessage) => {
    const key = `${comment.kind}:${comment.id}`;
    setBusyId(key);
    setError('');
    try {
      await action();
      showToast(successMessage, 'success');
    } catch {
      setError('Moderasyon işlemi tamamlanamadı.');
      showToast('Moderasyon işlemi tamamlanamadı.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const warnUser = (comment) => runCommentAction(
    comment,
    () => sendAdminNotification({
      title: 'Yorum uyarısı',
      message: 'Bir yorumunuz moderasyon kurallarına takıldı. Lütfen yorum kurallarına dikkat edin.',
      type: 'account',
      targetType: 'user',
      targetUserId: comment.userId,
    }),
    'Kullanıcıya uyarı gönderildi.',
  );

  const disableUser = (comment) => {
    if (!window.confirm('Bu kullanıcıyı pasifleştirmek istiyor musun?')) return;
    runCommentAction(comment, () => updateUserDisabled(comment.userId, true), 'Kullanıcı pasifleştirildi.');
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Yorum Güvenliği</p>
          <h2>Moderasyon</h2>
        </div>
        <span className="admin-count-pill">{comments.filter(item => item.status === 'pending').length} pending</span>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <div className="admin-grid-two">
        <section className="admin-panel-card">
          <h3>Yasaklı Kelimeler</h3>
          <form className="admin-inline-form" onSubmit={createWord}>
            <input value={wordDraft} placeholder="Kelime ekle" onChange={event => setWordDraft(event.target.value)} />
            <button type="submit">
              <Ban size={15} aria-hidden="true" />
              Ekle
            </button>
          </form>
          {loadingWords ? (
            <p className="admin-empty">Kelimeler yükleniyor...</p>
          ) : words.length === 0 ? (
            <p className="admin-empty">Henüz yasaklı kelime yok.</p>
          ) : (
            <div className="admin-chip-list">
              {words.map(item => (
                <span className={item.isActive === false ? 'muted' : ''} key={item.id}>
                  {item.word}
                  <button type="button" onClick={() => updateBannedWordActive(item.id, item.isActive === false)}>
                    {item.isActive === false ? 'Aktif yap' : 'Pasifleştir'}
                  </button>
                  <button type="button" aria-label="Kelimeyi sil" onClick={() => deleteBannedWord(item.id)}>
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel-card">
          <h3>Moderasyon Kuralları</h3>
          <div className="admin-rule-list">
            <span>En az 10 karakter ve 3 kelime</span>
            <span>Yasaklı kelime yakalanırsa pending</span>
            <span>Tekrarlanan yorum engellenir</span>
            <span>Aşırı büyük harf pending olur</span>
          </div>
        </section>
      </div>

      <div className="admin-filter-tabs">
        {['pending', 'hidden', 'rejected', 'all'].map(status => (
          <button key={status} type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>
            {status === 'all' ? 'Tümü' : statusLabels[status]}
          </button>
        ))}
      </div>

      {loadingComments ? (
        <p className="admin-empty">Şüpheli yorumlar yükleniyor...</p>
      ) : filteredComments.length === 0 ? (
        <p className="admin-empty">Bu filtrede yorum yok.</p>
      ) : (
        <div className="admin-comment-grid">
          {filteredComments.map(comment => {
            const key = `${comment.kind}:${comment.id}`;
            const busy = busyId === key;

            return (
              <article className="admin-comment-card" key={key}>
                <div className="admin-comment-top">
                  <div>
                    <strong>{comment.username || 'CineTrack kullanıcısı'}</strong>
                    <span>{comment.mediaTitle || 'İsimsiz içerik'} · {formatAdminDate(comment.createdAt)}</span>
                  </div>
                  <span className={`admin-status ${comment.status || 'pending'}`}>{statusLabels[comment.status] || 'İnceleme'}</span>
                </div>
                <p className="admin-report-description">{comment.text || 'Silinmiş yorum'}</p>
                <p className="admin-muted">
                  Sebep: {comment.moderationReason || comment.deleteReason || 'Belirtilmedi'}
                </p>
                <div className="admin-row-actions">
                  <button type="button" disabled={busy} onClick={() => runCommentAction(comment, () => updateCommentModerationStatus(comment, 'published', 'Admin onayladı'), 'Yorum yayınlandı.')}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    Yayınla
                  </button>
                  <button type="button" disabled={busy} onClick={() => runCommentAction(comment, () => updateCommentModerationStatus(comment, 'hidden', 'Admin gizledi'), 'Yorum gizlendi.')}>
                    <EyeOff size={15} aria-hidden="true" />
                    Gizle
                  </button>
                  <button type="button" disabled={busy} onClick={() => runCommentAction(comment, () => updateCommentModerationStatus(comment, 'rejected', 'Admin reddetti'), 'Yorum reddedildi.')}>
                    <XCircle size={15} aria-hidden="true" />
                    Reddet
                  </button>
                  <button type="button" disabled={busy} onClick={() => runCommentAction(comment, () => deleteAdminComment(comment, { reason: 'Uygunsuz içerik', note: 'Moderasyon panelinden kaldırıldı.' }), 'Yorum silindi.')}>
                    <Trash2 size={15} aria-hidden="true" />
                    Yorumu sil
                  </button>
                  <button type="button" disabled={busy} onClick={() => warnUser(comment)}>
                    <ShieldAlert size={15} aria-hidden="true" />
                    Kullanıcıyı uyar
                  </button>
                  <button type="button" disabled={busy} onClick={() => disableUser(comment)}>
                    <UserX size={15} aria-hidden="true" />
                    Pasifleştir
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

export default AdminModeration;
