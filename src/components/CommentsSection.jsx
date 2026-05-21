import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import { createCommentReport } from '../services/adminService';
import {
  createComment,
  createReply,
  deleteComment,
  deleteReply,
  subscribeToMediaComments,
  toggleCommentLike,
  toggleReplyLike,
  updateComment,
  updateReply,
} from '../services/commentService';
import {
  getCommentValidationMessage,
  MAX_COMMENT_LENGTH,
} from '../utils/commentFormat';
import { getMediaType } from '../utils/media';
import CommentItem from './CommentItem';

const COMMENT_LIMIT_STEP = 10;

const CommentsSection = ({ media }) => {
  const { user, userProfile } = useMovies();
  const messageTimerRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [visibleCount, setVisibleCount] = useState(COMMENT_LIMIT_STEP);
  const [text, setText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mediaType = getMediaType(media);
  const mediaKey = `${mediaType}:${media?.id}`;
  const validationMessage = getCommentValidationMessage(text);
  const submitDisabled = saving || Boolean(validationMessage);
  const visibleComments = useMemo(
    () => comments.slice(0, visibleCount),
    [comments, visibleCount],
  );

  useEffect(() => {
    if (!media?.id) return undefined;

    const unsubscribe = subscribeToMediaComments(
      { mediaId: media.id, mediaType },
      (nextComments) => {
        setComments(nextComments);
        setLoadError('');
        setLoading(false);
      },
      (loadError) => {
        console.error('Comments could not be loaded:', loadError);
        setLoadError('Yorumlar yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [media?.id, mediaType, mediaKey]);

  useEffect(() => () => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
  }, []);

  const showMessage = (nextMessage) => {
    setMessage(nextMessage);
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(''), 3000);
  };

  const submitComment = async (event) => {
    event.preventDefault();

    if (!user) {
      setError('Yorum yapmak için giriş yapmalısın.');
      return;
    }

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createComment({
        media,
        userProfile,
        text,
        isSpoiler,
      });
      setText('');
      setIsSpoiler(false);
      showMessage('Yorum paylaşıldı.');
    } catch (submitError) {
      console.error('Comment could not be sent:', submitError);
      setError('Yorum gönderilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const updateOwnComment = async (commentId, nextText, nextIsSpoiler = false) => {
    const editValidation = getCommentValidationMessage(nextText);
    if (editValidation) {
      setError(editValidation);
      return;
    }

    setError('');
    try {
      await updateComment(commentId, {
        text: nextText,
        isSpoiler: nextIsSpoiler,
      });
      showMessage('Yorum güncellendi.');
    } catch (updateError) {
      console.error('Comment could not be updated:', updateError);
      setError('Yorum güncellenemedi.');
      throw updateError;
    }
  };

  const deleteOwnComment = async (commentId) => {
    setError('');
    try {
      await deleteComment(commentId);
      showMessage('Yorum silindi.');
    } catch (deleteError) {
      console.error('Comment could not be deleted:', deleteError);
      setError('Yorum silinemedi.');
      throw deleteError;
    }
  };

  const likeComment = async (comment) => {
    if (!user) {
      setError('Beğeni yapmak için giriş yapmalısın.');
      return;
    }

    setError('');
    try {
      await toggleCommentLike(comment);
    } catch (likeError) {
      console.error('Comment could not be liked:', likeError);
      setError('Beğeni güncellenemedi.');
      throw likeError;
    }
  };

  const addReply = async (comment, replyText, replyIsSpoiler = false) => {
    if (!user) {
      setError('Yanıt yazmak için giriş yapmalısın.');
      throw new Error('Yanıt yazmak için giriş yapmalısın.');
    }

    const replyValidation = getCommentValidationMessage(replyText);
    if (replyValidation) {
      setError(replyValidation);
      throw new Error(replyValidation);
    }

    setError('');
    try {
      await createReply({
        comment,
        userProfile,
        text: replyText,
        isSpoiler: replyIsSpoiler,
      });
      showMessage('Yanıt paylaşıldı.');
    } catch (replyError) {
      console.error('Reply could not be sent:', replyError);
      setError('Yanıt gönderilemedi.');
      throw replyError;
    }
  };

  const updateOwnReply = async (commentId, replyId, nextText, nextIsSpoiler = false) => {
    const replyValidation = getCommentValidationMessage(nextText);
    if (replyValidation) {
      setError(replyValidation);
      throw new Error(replyValidation);
    }

    setError('');
    try {
      await updateReply(commentId, replyId, {
        text: nextText,
        isSpoiler: nextIsSpoiler,
      });
      showMessage('Yanıt güncellendi.');
    } catch (updateError) {
      console.error('Reply could not be updated:', updateError);
      setError('Yanıt güncellenemedi.');
      throw updateError;
    }
  };

  const deleteOwnReply = async (commentId, replyId) => {
    setError('');
    try {
      await deleteReply(commentId, replyId);
      showMessage('Yanıt silindi.');
    } catch (deleteError) {
      console.error('Reply could not be deleted:', deleteError);
      setError('Yanıt silinemedi.');
      throw deleteError;
    }
  };

  const likeReply = async (commentId, reply) => {
    if (!user) {
      setError('Beğeni yapmak için giriş yapmalısın.');
      return;
    }

    setError('');
    try {
      await toggleReplyLike(commentId, reply);
    } catch (likeError) {
      console.error('Reply could not be liked:', likeError);
      setError('Beğeni güncellenemedi.');
      throw likeError;
    }
  };

  const reportComment = async (comment, reason, description) => {
    if (!user) {
      setError('Şikayet etmek için giriş yapmalısın.');
      throw new Error('Şikayet etmek için giriş yapmalısın.');
    }

    setError('');
    try {
      await createCommentReport({
        comment,
        reason,
        description,
        reporterProfile: userProfile,
      });
      showMessage('Şikayet gönderildi.');
    } catch (reportError) {
      console.error('Comment report could not be sent:', reportError);
      setError('Şikayet gönderilemedi.');
      throw reportError;
    }
  };

  return (
    <section className="movie-modal-panel comments-section" aria-labelledby="comments-title">
      <div className="comments-head">
        <div>
          <h3 id="comments-title">Yorumlar</h3>
          <p>Bu film/dizi hakkında herkesin görebileceği yorumlar.</p>
        </div>
        <span>
          <MessageSquare size={15} aria-hidden="true" />
          {comments.length}
        </span>
      </div>

      {user ? (
        <form className="comment-form" onSubmit={submitComment}>
          <textarea
            value={text}
            minLength={2}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder="Bu film/dizi hakkında yorumunu yaz..."
            onChange={event => setText(event.target.value)}
          />
          <label className="spoiler-option">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={event => setIsSpoiler(event.target.checked)}
            />
            <span>
              <strong>Spoiler içerir</strong>
              <small>Film veya diziyle ilgili önemli olayları açıklıyorsa işaretle.</small>
            </span>
          </label>
          <div className="comment-form-footer">
            <span>{text.length} / {MAX_COMMENT_LENGTH}</span>
            <button type="submit" disabled={submitDisabled}>
              <Send size={15} aria-hidden="true" />
              {saving ? 'Gönderiliyor...' : 'Yorum Gönder'}
            </button>
          </div>
        </form>
      ) : (
        <p className="comments-login-message">Yorum yapmak için giriş yapmalısın.</p>
      )}

      {message && <p className="comments-message success">{message}</p>}
      {error && <p className="comments-message error">{error}</p>}
      {loadError && <p className="comments-message error">{loadError}</p>}

      {loading ? (
        <p className="comments-empty">Yorumlar yükleniyor...</p>
      ) : loadError ? (
        null
      ) : comments.length === 0 ? (
        <p className="comments-empty">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
      ) : (
        <div className="comments-list">
          {visibleComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={user}
              onAuthRequired={setError}
              onDelete={deleteOwnComment}
              onLike={likeComment}
              onReply={addReply}
              onReplyDelete={deleteOwnReply}
              onReplyLike={likeReply}
              onReplyUpdate={updateOwnReply}
              onReport={reportComment}
              onUpdate={updateOwnComment}
            />
          ))}
        </div>
      )}

      {comments.length > visibleCount && (
        <button
          className="comments-more"
          type="button"
          onClick={() => setVisibleCount(current => current + COMMENT_LIMIT_STEP)}
        >
          Daha fazla göster
        </button>
      )}
    </section>
  );
};

export default CommentsSection;
