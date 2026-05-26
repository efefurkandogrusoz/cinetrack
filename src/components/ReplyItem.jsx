import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Heart, Pencil, Trash2, X } from 'lucide-react';
import usePublicUserProfile from '../hooks/usePublicUserProfile';
import {
  formatCommentDate,
  getCommentValidationMessage,
  isCommentEdited,
  MAX_COMMENT_LENGTH,
} from '../utils/commentFormat';
import ReportForm from './ReportForm';
import SpoilerContent from './SpoilerContent';
import UserAvatar from './UserAvatar';

const ReplyItem = ({
  commentId,
  currentUser,
  onAuthRequired,
  onDelete,
  onLike,
  onReport,
  onUpdate,
  reply,
}) => {
  const authorProfile = usePublicUserProfile(reply.userId, { username: reply.username });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.text || '');
  const [draftSpoiler, setDraftSpoiler] = useState(Boolean(reply.isSpoiler));
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const owned = Boolean(currentUser?.uid && currentUser.uid === reply.userId);
  const liked = Boolean(currentUser?.uid && reply.likedBy?.includes(currentUser.uid));
  const deleted = Boolean(reply.deleted);
  const cleanDraft = draft.trim();
  const draftInvalid = Boolean(getCommentValidationMessage(draft));
  const authorName = authorProfile.displayName || reply.username || 'CineTrack kullanıcısı';

  const cancelEdit = () => {
    setDraft(reply.text || '');
    setDraftSpoiler(Boolean(reply.isSpoiler));
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(reply.text || '');
    setDraftSpoiler(Boolean(reply.isSpoiler));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (draftInvalid) return;

    setBusy(true);
    try {
      await onUpdate(commentId, reply.id, cleanDraft, draftSpoiler);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const deleteOwnReply = async () => {
    if (!window.confirm('Bu yanıtı silmek istediğine emin misin?')) return;

    setBusy(true);
    try {
      await onDelete(commentId, reply.id);
    } finally {
      setBusy(false);
    }
  };

  const openReportBox = () => {
    if (!currentUser) {
      onAuthRequired?.('Şikayet etmek için giriş yapmalısın.');
      return;
    }

    setReporting(true);
  };

  return (
    <article className="reply-item">
      <Link className="comment-avatar-link" to={`/user/${reply.userId}`} aria-label={`${authorName} profilini aç`}>
        <UserAvatar
          profile={authorProfile}
          className="reply-avatar"
          label={`${authorName} avatarı`}
        />
      </Link>

      <div className="comment-content">
        <div className="comment-meta">
          <div>
            <Link className="comment-author-link" to={`/user/${reply.userId}`}>
              {authorName}
            </Link>
            <span>{formatCommentDate(reply.createdAt)}</span>
          </div>
          {isCommentEdited(reply) && <em>Düzenlendi</em>}
        </div>

        {deleted ? (
          <p className="comment-deleted-text">
            {reply.deletedBy && reply.deleteReason && reply.deleteReason !== 'Kullanıcı tarafından silindi'
              ? `Bu yanıt admin tarafından kaldırıldı. Sebep: ${reply.deleteReason}.`
              : 'Bu yanıt silindi.'}
          </p>
        ) : editing ? (
          <div className="comment-edit-box">
            <textarea
              value={draft}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={event => setDraft(event.target.value)}
            />
            <label className="spoiler-option compact">
              <input
                type="checkbox"
                checked={draftSpoiler}
                onChange={event => setDraftSpoiler(event.target.checked)}
              />
              <span>
                <strong>Spoiler içerir</strong>
              </span>
            </label>
            <div className="comment-edit-actions">
              <span>{draft.length} / {MAX_COMMENT_LENGTH}</span>
              <button type="button" onClick={saveEdit} disabled={busy || draftInvalid}>
                <Check size={15} aria-hidden="true" />
                Kaydet
              </button>
              <button type="button" onClick={cancelEdit} disabled={busy}>
                <X size={15} aria-hidden="true" />
                İptal
              </button>
            </div>
          </div>
        ) : (
          <SpoilerContent isSpoiler={reply.isSpoiler} text={reply.text} />
        )}

        {!deleted && (
        <div className="comment-actions">
          <button
            className={liked ? 'liked' : ''}
            type="button"
            onClick={() => onLike(commentId, reply)}
            disabled={busy}
            aria-pressed={liked}
          >
            <Heart size={15} aria-hidden="true" />
            {reply.likes || 0}
          </button>

          <button type="button" onClick={openReportBox} disabled={busy}>
            <Flag size={15} aria-hidden="true" />
            Şikayet Et
          </button>

          {owned && !editing && (
            <>
              <button type="button" onClick={startEdit} disabled={busy}>
                <Pencil size={15} aria-hidden="true" />
                Düzenle
              </button>
              <button type="button" onClick={deleteOwnReply} disabled={busy}>
                <Trash2 size={15} aria-hidden="true" />
                Sil
              </button>
            </>
          )}
        </div>
        )}

        {reporting && (
          <ReportForm
            onCancel={() => setReporting(false)}
            onSubmit={async (reason, description) => {
              await onReport(reply, reason, description);
              setReporting(false);
            }}
          />
        )}
      </div>
    </article>
  );
};

export default ReplyItem;
