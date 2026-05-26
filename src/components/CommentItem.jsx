import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Flag, Heart, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import usePublicUserProfile from '../hooks/usePublicUserProfile';
import { subscribeToCommentReplies } from '../services/commentService';
import {
  formatCommentDate,
  getCommentValidationMessage,
  isCommentEdited,
  MAX_COMMENT_LENGTH,
} from '../utils/commentFormat';
import ReplyItem from './ReplyItem';
import ReportForm from './ReportForm';
import SpoilerContent from './SpoilerContent';
import UserAvatar from './UserAvatar';

const CommentItem = ({
  comment,
  currentUser,
  onAuthRequired,
  onDelete,
  onLike,
  onReply,
  onReplyDelete,
  onReplyLike,
  onReplyUpdate,
  onReport,
  onUpdate,
}) => {
  const authorProfile = usePublicUserProfile(comment.userId, { username: comment.username });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text || '');
  const [draftSpoiler, setDraftSpoiler] = useState(Boolean(comment.isSpoiler));
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySpoiler, setReplySpoiler] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [replyState, setReplyState] = useState({
    commentId: comment.id,
    loading: true,
    replies: [],
  });
  const [busy, setBusy] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');
  const owned = Boolean(currentUser?.uid && currentUser.uid === comment.userId);
  const liked = Boolean(currentUser?.uid && comment.likedBy?.includes(currentUser.uid));
  const deleted = Boolean(comment.deleted);
  const cleanDraft = draft.trim();
  const draftInvalid = Boolean(getCommentValidationMessage(draft));
  const cleanReplyDraft = replyDraft.trim();
  const replyInvalid = Boolean(getCommentValidationMessage(replyDraft));
  const authorName = authorProfile.displayName || comment.username || 'CineTrack kullanıcısı';
  const replies = replyState.commentId === comment.id ? replyState.replies : [];
  const repliesLoading = replyState.commentId !== comment.id || replyState.loading;

  useEffect(() => {
    return subscribeToCommentReplies(
      comment.id,
      (nextReplies) => {
        setReplyState({
          commentId: comment.id,
          loading: false,
          replies: nextReplies,
        });
      },
      (error) => {
        console.error('Replies could not be loaded:', error);
        setReplyState({
          commentId: comment.id,
          loading: false,
          replies: [],
        });
      },
    );
  }, [comment.id]);

  const cancelEdit = () => {
    setDraft(comment.text || '');
    setDraftSpoiler(Boolean(comment.isSpoiler));
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(comment.text || '');
    setDraftSpoiler(Boolean(comment.isSpoiler));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (draftInvalid) return;

    setBusy(true);
    try {
      await onUpdate(comment.id, cleanDraft, draftSpoiler);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const deleteOwnComment = async () => {
    if (!window.confirm('Bu yorumu silmek istediğine emin misin? Yanıtlar görünmeye devam eder.')) return;

    setBusy(true);
    try {
      await onDelete(comment.id);
    } finally {
      setBusy(false);
    }
  };

  const openReplyBox = () => {
    if (!currentUser) {
      onAuthRequired('Yanıt yazmak için giriş yapmalısın.');
      return;
    }

    setReplying(true);
    setReplyError('');
  };

  const cancelReply = () => {
    setReplyDraft('');
    setReplySpoiler(false);
    setReplyError('');
    setReplying(false);
  };

  const submitReply = async () => {
    const validation = getCommentValidationMessage(replyDraft);
    if (validation) {
      setReplyError(validation);
      return;
    }

    setReplyBusy(true);
    setReplyError('');
    try {
      await onReply(comment, cleanReplyDraft, replySpoiler);
      setReplyDraft('');
      setReplySpoiler(false);
      setReplying(false);
    } catch (error) {
      setReplyError(error?.message || 'Yanıt gönderilemedi.');
    } finally {
      setReplyBusy(false);
    }
  };

  const openReportBox = () => {
    if (!currentUser) {
      onAuthRequired('Şikayet etmek için giriş yapmalısın.');
      return;
    }

    setReporting(true);
  };

  return (
    <article className={deleted ? 'comment-card comment-deleted' : 'comment-card'}>
      <Link className="comment-avatar-link" to={`/user/${comment.userId}`} aria-label={`${authorName} profilini aç`}>
        <UserAvatar
          profile={authorProfile}
          className="comment-avatar"
          label={`${authorName} avatarı`}
        />
      </Link>

      <div className="comment-content">
        <div className="comment-meta">
          <div>
            <Link className="comment-author-link" to={`/user/${comment.userId}`}>
              {authorName}
            </Link>
            <span>{formatCommentDate(comment.createdAt)}</span>
          </div>
          {!deleted && isCommentEdited(comment) && <em>Düzenlendi</em>}
        </div>

        {deleted ? (
          <p className="comment-deleted-text">
            {comment.deletedBy && comment.deleteReason && comment.deleteReason !== 'Kullanıcı tarafından silindi'
              ? `Bu yorum admin tarafından kaldırıldı. Sebep: ${comment.deleteReason}.`
              : 'Bu yorum silindi.'}
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
          <SpoilerContent isSpoiler={comment.isSpoiler} text={comment.text} />
        )}

        {!deleted && (
          <div className="comment-actions">
            <button
              className={liked ? 'liked' : ''}
              type="button"
              onClick={() => onLike(comment)}
              disabled={busy}
              aria-pressed={liked}
            >
              <Heart size={15} aria-hidden="true" />
              {comment.likes || 0}
            </button>

            <button type="button" onClick={openReplyBox} disabled={busy}>
              <MessageCircle size={15} aria-hidden="true" />
              Yanıtla
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
                <button type="button" onClick={deleteOwnComment} disabled={busy}>
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
              await onReport(comment, reason, description);
              setReporting(false);
            }}
          />
        )}

        {replying && (
          <div className="reply-form">
            <textarea
              value={replyDraft}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Yanıtını yaz..."
              onChange={event => setReplyDraft(event.target.value)}
            />
            <label className="spoiler-option compact">
              <input
                type="checkbox"
                checked={replySpoiler}
                onChange={event => setReplySpoiler(event.target.checked)}
              />
              <span>
                <strong>Spoiler içerir</strong>
              </span>
            </label>
            <div className="comment-edit-actions">
              <span>{replyDraft.length} / {MAX_COMMENT_LENGTH}</span>
              <button type="button" onClick={submitReply} disabled={replyBusy || replyInvalid}>
                <Check size={15} aria-hidden="true" />
                Yanıtla
              </button>
              <button type="button" onClick={cancelReply} disabled={replyBusy}>
                <X size={15} aria-hidden="true" />
                İptal
              </button>
            </div>
            {replyError && <p className="comments-message error">{replyError}</p>}
          </div>
        )}

        {(repliesLoading || replies.length > 0) && (
          <div className="comment-replies">
            {repliesLoading ? (
              <p className="replies-loading">Yanıtlar yükleniyor...</p>
            ) : (
              replies.map(reply => (
                <ReplyItem
                  key={reply.id}
                  commentId={comment.id}
                  currentUser={currentUser}
                  onAuthRequired={onAuthRequired}
                  onDelete={onReplyDelete}
                  onLike={onReplyLike}
                  onReport={onReport}
                  onUpdate={onReplyUpdate}
                  reply={reply}
                />
              ))
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default CommentItem;
