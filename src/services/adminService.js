import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

const USERS_COLLECTION = 'users';
const COMMENTS_COLLECTION = 'comments';
const REPLIES_COLLECTION = 'replies';
const MOVIES_COLLECTION = 'movies';
const REPORTS_COLLECTION = 'reports';
const FEATURED_MOVIES_COLLECTION = 'featuredMovies';
const HOMEPAGE_CONFIG_COLLECTION = 'homepageConfig';
const HOMEPAGE_MAIN_DOC = 'main';

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

const likedByCount = (data = {}) => {
  const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
  return likedBy.length > 0 ? likedBy.length : Number(data.likes) || 0;
};

const normalizeUser = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const normalizeComment = (snapshot, kind = 'comment') => {
  const data = snapshot.data();
  const parentCommentRef = kind === 'reply' ? snapshot.ref.parent.parent : null;

  return {
    id: snapshot.id,
    commentId: kind === 'reply' ? parentCommentRef?.id : snapshot.id,
    kind,
    refPath: snapshot.ref.path,
    ...data,
    isSpoiler: data.isSpoiler === true,
    likes: likedByCount(data),
  };
};

const normalizeMovie = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const normalizeReport = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const normalizeFeaturedMovie = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const sortNewest = (items) => [...items].sort((first, second) => (
  getTimestampValue(second.createdAt) - getTimestampValue(first.createdAt)
));

const getAllReplies = async () => {
  try {
    const snapshot = await getDocs(collectionGroup(db, REPLIES_COLLECTION));
    return snapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'reply'));
  } catch (error) {
    console.warn('Replies could not be loaded for admin summary:', error);
    return [];
  }
};

export const isCurrentUserAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;

  const snapshot = await getDoc(doc(db, USERS_COLLECTION, user.uid));
  return snapshot.exists() && snapshot.data()?.role === 'admin';
};

export const loadAdminDashboard = async () => {
  const [
    usersSnapshot,
    commentsSnapshot,
    moviesSnapshot,
    reportsSnapshot,
    replies,
  ] = await Promise.all([
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(collection(db, COMMENTS_COLLECTION)),
    getDocs(collection(db, MOVIES_COLLECTION)),
    getDocs(collection(db, REPORTS_COLLECTION)),
    getAllReplies(),
  ]);

  const users = usersSnapshot.docs.map(normalizeUser);
  const comments = [
    ...commentsSnapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'comment')),
    ...replies,
  ].filter(comment => !comment.deleted);
  const movies = moviesSnapshot.docs.map(normalizeMovie);
  const reports = reportsSnapshot.docs.map(normalizeReport);
  const mediaCounts = comments.reduce((map, comment) => {
    const key = `${comment.mediaType || 'movie'}:${comment.mediaId || comment.mediaTitle || 'unknown'}`;
    const current = map.get(key) || {
      key,
      mediaId: comment.mediaId,
      mediaType: comment.mediaType,
      mediaTitle: comment.mediaTitle || 'İsimsiz içerik',
      count: 0,
    };

    current.count += 1;
    map.set(key, current);
    return map;
  }, new Map());

  return {
    totals: {
      users: users.length,
      comments: comments.length,
      movies: movies.length,
      reports: reports.length,
    },
    topCommentedMedia: [...mediaCounts.values()]
      .sort((first, second) => second.count - first.count)
      .slice(0, 6),
    topLikedComments: comments
      .filter(comment => (comment.likes || 0) > 0)
      .sort((first, second) => (second.likes || 0) - (first.likes || 0))
      .slice(0, 6),
  };
};

export const subscribeAdminUsers = (onUsers, onError) => (
  onSnapshot(
    collection(db, USERS_COLLECTION),
    (snapshot) => {
      onUsers(snapshot.docs.map(normalizeUser).sort((first, second) => (
        (first.displayName || first.email || '').localeCompare(second.displayName || second.email || '', 'tr')
      )));
    },
    onError,
  )
);

export const loadUserCommentCounts = async () => {
  const [commentsSnapshot, replies] = await Promise.all([
    getDocs(collection(db, COMMENTS_COLLECTION)),
    getAllReplies(),
  ]);
  const counts = {};

  for (const comment of commentsSnapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'comment'))) {
    if (!comment.deleted && comment.userId) {
      counts[comment.userId] = (counts[comment.userId] || 0) + 1;
    }
  }

  for (const reply of replies) {
    if (!reply.deleted && reply.userId) {
      counts[reply.userId] = (counts[reply.userId] || 0) + 1;
    }
  }

  return counts;
};

export const updateUserRole = async (userId, role) => (
  updateDoc(doc(db, USERS_COLLECTION, userId), {
    role,
    updatedAt: serverTimestamp(),
  })
);

export const updateUserDisabled = async (userId, disabled) => (
  updateDoc(doc(db, USERS_COLLECTION, userId), {
    disabled,
    updatedAt: serverTimestamp(),
  })
);

export const subscribeAdminComments = (onComments, onError) => {
  let comments = [];
  let replies = [];

  const emit = () => {
    onComments(sortNewest([...comments, ...replies]));
  };

  const commentsUnsubscribe = onSnapshot(
    collection(db, COMMENTS_COLLECTION),
    (snapshot) => {
      comments = snapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'comment'));
      emit();
    },
    onError,
  );

  const repliesUnsubscribe = onSnapshot(
    collectionGroup(db, REPLIES_COLLECTION),
    (snapshot) => {
      replies = snapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'reply'));
      emit();
    },
    (error) => {
      console.warn('Admin replies could not be loaded:', error);
      replies = [];
      emit();
    },
  );

  return () => {
    commentsUnsubscribe();
    repliesUnsubscribe();
  };
};

export const deleteAdminComment = async (comment) => {
  if (comment.kind === 'reply') {
    return deleteDoc(doc(db, comment.refPath));
  }

  const commentId = comment.commentId || comment.id;
  const commentRef = doc(db, COMMENTS_COLLECTION, commentId);
  const repliesSnapshot = await getDocs(collection(db, COMMENTS_COLLECTION, commentId, REPLIES_COLLECTION));
  const batch = writeBatch(db);

  repliesSnapshot.docs.forEach(replySnapshot => batch.delete(replySnapshot.ref));
  batch.delete(commentRef);

  return batch.commit();
};

export const createCommentReport = async ({ comment, reason, description = '', reporterProfile = {} }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Şikayet etmek için giriş yapmalısın.');

  const reporterUsername =
    reporterProfile?.displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'CineTrack kullanıcısı';

  return addDoc(collection(db, REPORTS_COLLECTION), {
    commentId: comment.commentId || comment.id,
    replyId: comment.kind === 'reply' ? comment.id : null,
    targetType: comment.kind || 'comment',
    targetRefPath: comment.refPath || `${COMMENTS_COLLECTION}/${comment.id}`,
    commentText: comment.text || '',
    commentMediaTitle: comment.mediaTitle || 'İsimsiz içerik',
    isSpoiler: comment.isSpoiler === true,
    likes: Number(comment.likes) || 0,
    reportedUserId: comment.userId,
    reportedUsername: comment.username || 'CineTrack kullanıcısı',
    reporterUserId: user.uid,
    reporterUsername,
    reason,
    description: description.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

export const subscribeAdminReports = (onReports, onError) => (
  onSnapshot(
    collection(db, REPORTS_COLLECTION),
    (snapshot) => {
      onReports(sortNewest(snapshot.docs.map(normalizeReport)));
    },
    onError,
  )
);

export const updateReportStatus = async (reportId, status) => (
  updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status,
    updatedAt: serverTimestamp(),
  })
);

export const deleteReportedComment = async (report) => (
  deleteAdminComment({
    id: report.replyId || report.commentId,
    commentId: report.commentId,
    kind: report.targetType === 'reply' ? 'reply' : 'comment',
    refPath: report.targetRefPath,
  })
);

export const subscribeFeaturedMovies = (onMovies, onError) => (
  onSnapshot(
    collection(db, FEATURED_MOVIES_COLLECTION),
    (snapshot) => {
      onMovies(snapshot.docs
        .map(normalizeFeaturedMovie)
        .sort((first, second) => (Number(first.order) || 0) - (Number(second.order) || 0)));
    },
    onError,
  )
);

export const saveFeaturedMovie = async (movie, extra = {}) => {
  const mediaType = movie.mediaType || movie.media_type || 'movie';
  const movieId = String(movie.id || movie.movieId);
  const docId = `${mediaType}_${movieId}`;

  return setDoc(doc(db, FEATURED_MOVIES_COLLECTION, docId), {
    movieId,
    mediaId: movieId,
    title: movie.title || movie.name || 'İsimsiz',
    poster: movie.poster || null,
    posterPath: movie.posterPath || movie.poster_path || null,
    poster_path: movie.poster_path || movie.posterPath || null,
    backdrop: movie.backdrop || null,
    backdropPath: movie.backdropPath || movie.backdrop_path || null,
    mediaType,
    year: movie.year || 'N/A',
    order: Number(extra.order) || 1,
    isActive: extra.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const updateFeaturedMovie = async (featuredId, updates) => (
  updateDoc(doc(db, FEATURED_MOVIES_COLLECTION, featuredId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
);

export const deleteFeaturedMovie = async (featuredId) => (
  deleteDoc(doc(db, FEATURED_MOVIES_COLLECTION, featuredId))
);

export const subscribeHomepageConfig = (onConfig, onError) => (
  onSnapshot(
    doc(db, HOMEPAGE_CONFIG_COLLECTION, HOMEPAGE_MAIN_DOC),
    (snapshot) => {
      onConfig(snapshot.exists() ? snapshot.data() : {});
    },
    onError,
  )
);

export const saveHomepageConfig = async (updates) => (
  setDoc(doc(db, HOMEPAGE_CONFIG_COLLECTION, HOMEPAGE_MAIN_DOC), {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true })
);

export const loadPublicHomepageData = async () => {
  const [featuredSnapshot, configSnapshot] = await Promise.all([
    getDocs(query(collection(db, FEATURED_MOVIES_COLLECTION), where('isActive', '==', true))),
    getDoc(doc(db, HOMEPAGE_CONFIG_COLLECTION, HOMEPAGE_MAIN_DOC)),
  ]);

  return {
    featuredMovies: featuredSnapshot.docs
      .map(normalizeFeaturedMovie)
      .sort((first, second) => (Number(first.order) || 0) - (Number(second.order) || 0)),
    homepageConfig: configSnapshot.exists() ? configSnapshot.data() : {},
  };
};
