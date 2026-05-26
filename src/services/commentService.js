import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
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
const BANNED_WORDS_COLLECTION = 'bannedWords';
const MIN_COMMENT_LENGTH = 10;
const MIN_COMMENT_WORDS = 3;
const MAX_COMMENT_LENGTH = 500;
const RECENT_COMMENT_WINDOW_MS = 2 * 60 * 1000;
const DUPLICATE_COMMENT_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECENT_COMMENTS = 5;

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
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  if (cleanText.length < MIN_COMMENT_LENGTH || wordCount < MIN_COMMENT_WORDS) {
    throw new Error('Yorum en az 10 karakter ve 3 kelime olmalı.');
  }
  if (cleanText.length > MAX_COMMENT_LENGTH) {
    throw new Error('Yorum en fazla 500 karakter olabilir.');
  }
  return cleanText;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTextForCompare = (value) => (
  value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
);

const loadActiveBannedWords = async () => {
  const snapshot = await getDocs(collection(db, BANNED_WORDS_COLLECTION));

  return snapshot.docs
    .map(docSnapshot => docSnapshot.data())
    .filter(item => item.isActive !== false)
    .map(item => String(item.word || '').trim())
    .filter(Boolean);
};

const getUserRecentComments = async (userId) => {
  const snapshot = await getDocs(query(
    collection(db, COMMENTS_COLLECTION),
    where('userId', '==', userId),
  ));

  return snapshot.docs.map(normalizeComment);
};

const getUppercaseRatio = (text) => {
  const letters = [...text].filter(char => char.toLocaleLowerCase('tr-TR') !== char.toLocaleUpperCase('tr-TR'));
  if (letters.length < 12) return 0;

  const uppercaseCount = letters.filter(char => char === char.toLocaleUpperCase('tr-TR')).length;
  return uppercaseCount / letters.length;
};

const evaluateModeration = async ({ text, userId }) => {
  const [bannedWords, recentComments] = await Promise.all([
    loadActiveBannedWords(),
    getUserRecentComments(userId),
  ]);
  const cleanComparable = normalizeTextForCompare(text);
  const matchedWord = bannedWords.find((word) => {
    const pattern = new RegExp(`(^|\\s|[^\\p{L}\\p{N}])${escapeRegExp(word)}($|\\s|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(cleanComparable);
  });

  if (matchedWord) {
    return {
      status: 'pending',
      reason: `Yasaklı kelime tespit edildi: ${matchedWord}`,
    };
  }

  const now = Date.now();
  const recentByTime = recentComments.filter(comment => (
    now - getTimestampValue(comment.createdAt) <= RECENT_COMMENT_WINDOW_MS
  ));

  if (recentByTime.length >= MAX_RECENT_COMMENTS) {
    throw new Error('Kısa süre içinde çok fazla yorum gönderdin. Lütfen biraz bekle.');
  }

  const duplicate = recentComments.find(comment => (
    normalizeTextForCompare(comment.text || '') === cleanComparable &&
    now - getTimestampValue(comment.createdAt) <= DUPLICATE_COMMENT_WINDOW_MS
  ));

  if (duplicate) {
    throw new Error('Aynı yorumu kısa süre içinde tekrar gönderemezsin.');
  }

  if (getUppercaseRatio(text) > 0.72) {
    return {
      status: 'pending',
      reason: 'Çok fazla büyük harf kullanımı',
    };
  }

  return {
    status: 'published',
    reason: null,
  };
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
    status: data.status || (data.deleted || data.isDeleted ? 'hidden' : 'published'),
    deleted: data.deleted === true || data.isDeleted === true,
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
    status: data.status || (data.deleted || data.isDeleted ? 'hidden' : 'published'),
    deleted: data.deleted === true || data.isDeleted === true,
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
        .filter(comment => comment.status === 'published' || comment.deleted)
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
        .filter(reply => reply.status === 'published' || reply.deleted)
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
  const moderation = await evaluateModeration({ text: cleanText, userId: user.uid });

  const ref = await addDoc(collection(db, COMMENTS_COLLECTION), {
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
    status: moderation.status,
    moderationReason: moderation.reason,
    reviewedBy: null,
    reviewedAt: null,
  });

  return { ref, status: moderation.status, moderationReason: moderation.reason };
};

export const createReply = async ({ comment, userProfile, text, isSpoiler = false }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yanıt yazmak için giriş yapmalısın.');
  if (comment?.deleted) throw new Error('Silinen bir yoruma yanıt yazılamaz.');

  const cleanText = validateCommentText(text);
  const username = getCurrentUsername(userProfile, user);
  const moderation = await evaluateModeration({ text: cleanText, userId: user.uid });

  const ref = await addDoc(
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
      status: moderation.status,
      moderationReason: moderation.reason,
      reviewedBy: null,
      reviewedAt: null,
    },
  );

  return { ref, status: moderation.status, moderationReason: moderation.reason };
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
    isDeleted: true,
    status: 'hidden',
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    deleteReason: 'Kullanıcı tarafından silindi',
    deleteNote: '',
  });
};

export const deleteReply = async (commentId, replyId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yanıtı silmek için giriş yapmalısın.');

  return updateDoc(doc(db, COMMENTS_COLLECTION, commentId, REPLIES_COLLECTION, replyId), {
    text: '',
    deleted: true,
    isDeleted: true,
    status: 'hidden',
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    deleteReason: 'Kullanıcı tarafından silindi',
    deleteNote: '',
  });
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
