import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getMediaType } from '../utils/media';

const COMMENTS_COLLECTION = 'comments';
const REPLIES_COLLECTION = 'replies';
const MIN_COMMENT_LENGTH = 2;
const MAX_COMMENT_LENGTH = 500;

const normalizeMediaId = (mediaId) => String(mediaId || '');

const getTimestampValue = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
};

const getCurrentUsername = (userProfile, user) => (
  userProfile?.displayName ||
  user.displayName ||
  user.email?.split('@')[0] ||
  'CineTrack kullanıcısı'
);

const validateCommentText = (text) => {
  const cleanText = text.trim();
  if (cleanText.length < MIN_COMMENT_LENGTH || cleanText.length > MAX_COMMENT_LENGTH) {
    throw new Error('Yorum 2-500 karakter arasında olmalı.');
  }
  return cleanText;
};

const normalizeSpoilerValue = (value) => value === true;

const normalizeCommentUpdatePayload = (payload) => {
  if (typeof payload === 'string') {
    return {
      text: validateCommentText(payload),
      isSpoiler: false,
    };
  }

  return {
    text: validateCommentText(payload?.text || ''),
    isSpoiler: normalizeSpoilerValue(payload?.isSpoiler),
  };
};

const normalizeCommentLikeData = (data) => {
  const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
  const legacyLikes = Number(data.likes) || 0;

  return {
    likedBy,
    likes: likedBy.length > 0 ? likedBy.length : legacyLikes,
  };
};

const normalizeComment = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    commentId: snapshot.id,
    kind: 'comment',
    refPath: snapshot.ref.path,
    ...data,
    isSpoiler: normalizeSpoilerValue(data.isSpoiler),
    ...normalizeCommentLikeData(data),
  };
};

const normalizeReply = (snapshot) => {
  const data = snapshot.data();
  const parentCommentRef = snapshot.ref.parent.parent;

  return {
    id: snapshot.id,
    commentId: data.commentId || parentCommentRef?.id || '',
    kind: 'reply',
    refPath: snapshot.ref.path,
    ...data,
    isSpoiler: normalizeSpoilerValue(data.isSpoiler),
    ...normalizeCommentLikeData(data),
  };
};

const sortNewestFirst = (first, second) => (
  getTimestampValue(second.createdAt) - getTimestampValue(first.createdAt)
);

const sortOldestFirst = (first, second) => (
  getTimestampValue(first.createdAt) - getTimestampValue(second.createdAt)
);

const getEmptyUserCommentSummary = () => ({
  totalComments: 0,
  totalReceivedLikes: 0,
  recentComments: [],
  firstActivityAt: null,
});

const buildUserCommentSummary = (comments = [], replies = []) => {
  const activeComments = comments
    .filter(comment => !comment.deleted)
    .map(comment => ({ ...comment, kind: 'comment' }));
  const activeReplies = replies
    .filter(reply => !reply.deleted)
    .map(reply => ({ ...reply, kind: 'reply' }));
  const allComments = [...activeComments, ...activeReplies].sort(sortNewestFirst);
  const firstActivity = [...allComments]
    .reverse()
    .find(item => getTimestampValue(item.createdAt) > 0);

  return {
    totalComments: allComments.length,
    totalReceivedLikes: allComments.reduce((total, item) => total + (item.likes || 0), 0),
    recentComments: allComments.slice(0, 6),
    firstActivityAt: firstActivity?.createdAt || null,
  };
};

export const subscribeToMediaComments = ({ mediaId, mediaType }, onComments, onError) => {
  const commentsQuery = query(
    collection(db, COMMENTS_COLLECTION),
    where('mediaId', '==', normalizeMediaId(mediaId)),
    where('mediaType', '==', mediaType),
  );

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs
        .map(normalizeComment)
        .sort(sortNewestFirst);

      onComments(comments);
    },
    onError,
  );
};

export const subscribeToCommentReplies = (commentId, onReplies, onError) => {
  const repliesQuery = collection(
    db,
    COMMENTS_COLLECTION,
    commentId,
    REPLIES_COLLECTION,
  );

  return onSnapshot(
    repliesQuery,
    (snapshot) => {
      const replies = snapshot.docs
        .map(normalizeReply)
        .sort(sortOldestFirst);

      onReplies(replies);
    },
    onError,
  );
};

export const subscribeToUserCommentSummary = (userId, onSummary, onError) => {
  if (!userId) {
    onSummary(getEmptyUserCommentSummary());
    return () => {};
  }

  let comments = [];
  let replies = [];
  let commentsReady = false;
  let repliesReady = false;

  const emit = () => {
    onSummary({
      ...buildUserCommentSummary(comments, replies),
      loading: !(commentsReady && repliesReady),
    });
  };

  const commentsUnsubscribe = onSnapshot(
    query(
      collection(db, COMMENTS_COLLECTION),
      where('userId', '==', userId),
    ),
    (snapshot) => {
      comments = snapshot.docs.map(normalizeComment);
      commentsReady = true;
      emit();
    },
    (error) => {
      comments = [];
      commentsReady = true;
      onError?.(error, 'comments');
      emit();
    },
  );

  const repliesUnsubscribe = onSnapshot(
    collectionGroup(db, REPLIES_COLLECTION),
    (snapshot) => {
      replies = snapshot.docs
        .map(normalizeReply)
        .filter(reply => reply.userId === userId);
      repliesReady = true;
      emit();
    },
    (error) => {
      replies = [];
      repliesReady = true;
      onError?.(error, 'replies');
      emit();
    },
  );

  return () => {
    commentsUnsubscribe();
    repliesUnsubscribe();
  };
};

export const createComment = async ({ media, userProfile, text, isSpoiler = false }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yorum yapmak için giriş yapmalısın.');

  const cleanText = validateCommentText(text);
  const username = getCurrentUsername(userProfile, user);

  return addDoc(collection(db, COMMENTS_COLLECTION), {
    mediaId: normalizeMediaId(media.id),
    mediaType: getMediaType(media),
    mediaTitle: media.title || media.name || 'İsimsiz',
    userId: user.uid,
    username,
    text: cleanText,
    isSpoiler: normalizeSpoilerValue(isSpoiler),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isEdited: false,
    editedAt: null,
    likedBy: [],
  });
};

export const createReply = async ({ comment, userProfile, text, isSpoiler = false }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yanıt yazmak için giriş yapmalısın.');
  if (comment?.deleted) throw new Error('Silinen bir yoruma yanıt yazılamaz.');

  const cleanText = validateCommentText(text);
  const username = getCurrentUsername(userProfile, user);

  return addDoc(
    collection(db, COMMENTS_COLLECTION, comment.id, REPLIES_COLLECTION),
    {
      commentId: comment.id,
      mediaId: normalizeMediaId(comment.mediaId),
      mediaType: comment.mediaType,
      mediaTitle: comment.mediaTitle || 'İsimsiz',
      userId: user.uid,
      username,
      text: cleanText,
      isSpoiler: normalizeSpoilerValue(isSpoiler),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isEdited: false,
      editedAt: null,
      likedBy: [],
    },
  );
};

export const updateComment = async (commentId, payload) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yorumu düzenlemek için giriş yapmalısın.');

  const updatePayload = normalizeCommentUpdatePayload(payload);

  return updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
    text: updatePayload.text,
    isSpoiler: updatePayload.isSpoiler,
    updatedAt: serverTimestamp(),
    isEdited: true,
    editedAt: serverTimestamp(),
  });
};

export const updateReply = async (commentId, replyId, payload) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yanıtı düzenlemek için giriş yapmalısın.');

  const updatePayload = normalizeCommentUpdatePayload(payload);

  return updateDoc(
    doc(db, COMMENTS_COLLECTION, commentId, REPLIES_COLLECTION, replyId),
    {
      text: updatePayload.text,
      isSpoiler: updatePayload.isSpoiler,
      updatedAt: serverTimestamp(),
      isEdited: true,
      editedAt: serverTimestamp(),
    },
  );
};

export const deleteComment = async (commentId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yorumu silmek için giriş yapmalısın.');

  return updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
    text: '',
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
  });
};

export const deleteReply = async (commentId, replyId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yanıtı silmek için giriş yapmalısın.');

  return deleteDoc(doc(db, COMMENTS_COLLECTION, commentId, REPLIES_COLLECTION, replyId));
};

export const toggleCommentLike = async (comment) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Beğeni yapmak için giriş yapmalısın.');
  if (comment?.deleted) throw new Error('Silinen yorum beğenilemez.');

  const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
  const liked = likedBy.includes(user.uid);

  return updateDoc(doc(db, COMMENTS_COLLECTION, comment.id), {
    likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
  });
};

export const toggleReplyLike = async (commentId, reply) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Beğeni yapmak için giriş yapmalısın.');

  const likedBy = Array.isArray(reply.likedBy) ? reply.likedBy : [];
  const liked = likedBy.includes(user.uid);

  return updateDoc(doc(db, COMMENTS_COLLECTION, commentId, REPLIES_COLLECTION, reply.id), {
    likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
  });
};

export const getUserCommentSummary = async (userId) => {
  if (!userId) {
    return getEmptyUserCommentSummary();
  }

  const [commentsSnapshot, repliesSnapshot] = await Promise.all([
    getDocs(query(
      collection(db, COMMENTS_COLLECTION),
      where('userId', '==', userId),
    )),
    getDocs(collectionGroup(db, REPLIES_COLLECTION)),
  ]);

  return buildUserCommentSummary(
    commentsSnapshot.docs.map(normalizeComment),
    repliesSnapshot.docs
      .map(normalizeReply)
      .filter(reply => reply.userId === userId),
  );
};
