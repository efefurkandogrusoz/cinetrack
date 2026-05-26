import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { isInactiveUserProfile } from '../utils/accountStatus';

const USERS_COLLECTION = 'users';
const COMMENTS_COLLECTION = 'comments';
const REPLIES_COLLECTION = 'replies';
const MOVIES_COLLECTION = 'movies';
const REPORTS_COLLECTION = 'reports';
const FEATURED_MOVIES_COLLECTION = 'featuredMovies';
const HOMEPAGE_CONFIG_COLLECTION = 'homepageConfig';
const HOMEPAGE_MAIN_DOC = 'main';
const ANNOUNCEMENTS_COLLECTION = 'announcements';
const NOTIFICATIONS_COLLECTION = 'notifications';
const BANNED_WORDS_COLLECTION = 'bannedWords';
const HERO_BANNERS_COLLECTION = 'heroBanners';

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

const normalizeAdminDoc = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const sortNewest = (items) => [...items].sort((first, second) => (
  getTimestampValue(second.createdAt) - getTimestampValue(first.createdAt)
));

const dateKeyFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
});

const getMediaType = (item = {}) => item.mediaType || item.media_type || 'movie';

const getMediaId = (item = {}) => String(
  item.mediaId || item.movieId || item.tmdbId || item.id || item.mediaTitle || item.title || 'unknown'
);

const getMediaKey = (item = {}) => `${getMediaType(item)}:${getMediaId(item)}`;

const getMediaTitle = (item = {}) => item.mediaTitle || item.title || item.name || 'İsimsiz içerik';

const getMediaPoster = (item = {}) => item.poster || item.posterUrl || item.posterPath || item.poster_path || '';

const isFavoriteMovie = (item = {}) => item.favorite === true || item.isFavorite === true;

const getWatchStatusValue = (item = {}) => item.watchStatus || (
  item.watched ? (getMediaType(item) === 'tv' ? 'completed' : 'watched') : 'watchlist'
);

const isWatchedMovie = (item = {}) => {
  const status = getWatchStatusValue(item);
  return item.watched === true || status === 'watched' || status === 'completed';
};

const isWatchlistMovie = (item = {}) => {
  const status = getWatchStatusValue(item);
  return status === 'watchlist' || (!item.watched && !status);
};

const getRatingValue = (item = {}) => {
  const value = Number(item.userRating || item.personalRating || item.rating || item.voteAverage || item.vote_average || 0);
  return Number.isFinite(value) ? value : 0;
};

const getLastSevenDays = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: dateKeyFormatter.format(date).replace('.', ''),
      value: 0,
    };
  });
};

const buildLastSevenDaysSeries = (items, fields) => {
  const series = getLastSevenDays();
  const map = new Map(series.map(item => [item.key, item]));

  items.forEach((item) => {
    const timestamp = fields.reduce((result, field) => result || getTimestampValue(item[field]), 0);
    if (!timestamp) return;

    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    const bucket = map.get(date.toISOString().slice(0, 10));
    if (bucket) bucket.value += 1;
  });

  return series;
};

const buildRecentActivities = ({ users, comments, reports, movies }) => {
  const activities = [
    ...users.map(user => ({
      type: 'user',
      text: `${user.displayName || user.email || 'Yeni kullanıcı'} kaydoldu`,
      createdAt: user.createdAt,
    })),
    ...comments.map(comment => ({
      type: 'comment',
      text: `${comment.username || 'Kullanıcı'} yorum ekledi`,
      meta: comment.mediaTitle || '',
      createdAt: comment.createdAt,
    })),
    ...reports.map(report => ({
      type: 'report',
      text: 'Yeni şikayet oluşturuldu',
      meta: report.reason || report.commentText || '',
      createdAt: report.createdAt,
    })),
    ...movies.filter(isFavoriteMovie).map(movie => ({
      type: 'favorite',
      text: `${getMediaTitle(movie)} favorilere eklendi`,
      createdAt: movie.favoriteAt || movie.favorite_at || movie.updatedAt || movie.createdAt,
    })),
    ...movies.filter(isWatchedMovie).map(movie => ({
      type: 'watched',
      text: `${getMediaTitle(movie)} izlendi olarak işaretlendi`,
      createdAt: movie.watchedAt || movie.watched_at || movie.updatedAt || movie.createdAt,
    })),
  ];

  return activities
    .filter(item => getTimestampValue(item.createdAt) > 0)
    .sort((first, second) => getTimestampValue(second.createdAt) - getTimestampValue(first.createdAt))
    .slice(0, 8);
};

const getAllReplies = async () => {
  try {
    const snapshot = await getDocs(collectionGroup(db, REPLIES_COLLECTION));
    return snapshot.docs.map(docSnapshot => normalizeComment(docSnapshot, 'reply'));
  } catch {
    return [];
  }
};

export const isCurrentUserAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;

  const snapshot = await getDoc(doc(db, USERS_COLLECTION, user.uid));
  const profile = snapshot.exists() ? snapshot.data() : null;
  return profile?.role === 'admin' && !isInactiveUserProfile(profile);
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
    const key = getMediaKey(comment);
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

  const movieCount = movies.filter(movie => getMediaType(movie) !== 'tv').length;
  const tvCount = movies.filter(movie => getMediaType(movie) === 'tv').length;
  const favoriteCount = movies.filter(isFavoriteMovie).length;
  const watchedCount = movies.filter(isWatchedMovie).length;
  const watchlistCount = movies.filter(isWatchlistMovie).length;

  const mediaMap = movies.reduce((map, movie) => {
    const key = getMediaKey(movie);
    const current = map.get(key) || {
      key,
      mediaId: getMediaId(movie),
      mediaType: getMediaType(movie),
      mediaTitle: getMediaTitle(movie),
      poster: getMediaPoster(movie),
      commentCount: mediaCounts.get(key)?.count || 0,
      favoriteCount: 0,
      watchedCount: 0,
      ratings: [],
    };

    current.favoriteCount += isFavoriteMovie(movie) ? 1 : 0;
    current.watchedCount += isWatchedMovie(movie) ? 1 : 0;
    current.poster = current.poster || getMediaPoster(movie);

    const rating = getRatingValue(movie);
    if (rating > 0) current.ratings.push(rating);
    map.set(key, current);
    return map;
  }, new Map());

  mediaCounts.forEach((item, key) => {
    if (!mediaMap.has(key)) {
      mediaMap.set(key, {
        ...item,
        commentCount: item.count,
        favoriteCount: 0,
        watchedCount: 0,
        poster: '',
        ratings: [],
      });
    }
  });

  const topEngagedMedia = [...mediaMap.values()]
    .map(item => ({
      ...item,
      commentCount: item.commentCount ?? item.count ?? 0,
      averageRating: item.ratings.length
        ? item.ratings.reduce((total, value) => total + value, 0) / item.ratings.length
        : 0,
      engagementScore: (item.commentCount ?? item.count ?? 0) * 3 + item.favoriteCount * 2 + item.watchedCount,
    }))
    .sort((first, second) => second.engagementScore - first.engagementScore)
    .slice(0, 6);

  return {
    totals: {
      users: users.length,
      activeUsers: users.filter(user => !isInactiveUserProfile(user)).length,
      passiveUsers: users.filter(isInactiveUserProfile).length,
      comments: comments.length,
      movies: movieCount,
      tv: tvCount,
      content: movies.length,
      favorites: favoriteCount,
      watched: watchedCount,
      watchlist: watchlistCount,
      reports: reports.length,
      pendingReports: reports.filter(report => report.status === 'pending' || !report.status).length,
    },
    userRegistrationsSeries: buildLastSevenDaysSeries(users, ['createdAt', 'created_at']),
    commentSeries: buildLastSevenDaysSeries(comments, ['createdAt', 'created_at']),
    contentDistribution: [
      { name: 'Filmler', value: movieCount },
      { name: 'Diziler', value: tvCount },
    ],
    libraryStatusDistribution: [
      { name: 'İzlenen', value: watchedCount },
      { name: 'İzlenecek', value: watchlistCount },
      { name: 'Favori', value: favoriteCount },
    ],
    topCommentedMedia: topEngagedMedia,
    topEngagedMedia,
    topLikedComments: comments
      .filter(comment => (comment.likes || 0) > 0)
      .sort((first, second) => (second.likes || 0) - (first.likes || 0))
      .slice(0, 6),
    recentActivities: buildRecentActivities({ users, comments, reports, movies }),
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
      onError(error);
      replies = [];
      emit();
    },
  );

  return () => {
    commentsUnsubscribe();
    repliesUnsubscribe();
  };
};

export const deleteAdminComment = async (comment, deletion = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Admin işlemi için giriş yapmalısın.');

  const targetRef = comment.kind === 'reply'
    ? doc(db, comment.refPath)
    : doc(db, COMMENTS_COLLECTION, comment.commentId || comment.id);

  return updateDoc(targetRef, {
    text: '',
    deleted: true,
    isDeleted: true,
    status: 'hidden',
    deletedAt: serverTimestamp(),
    deletedBy: user.uid,
    deleteReason: deletion.reason || 'Uygunsuz içerik',
    deleteNote: deletion.note || '',
    updatedAt: serverTimestamp(),
  });
};

export const updateCommentModerationStatus = async (comment, status, reason = '') => {
  const user = auth.currentUser;
  if (!user) throw new Error('Admin işlemi için giriş yapmalısın.');

  const targetRef = comment.kind === 'reply'
    ? doc(db, comment.refPath)
    : doc(db, COMMENTS_COLLECTION, comment.commentId || comment.id);

  return updateDoc(targetRef, {
    status,
    moderationReason: reason || null,
    reviewedBy: user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const subscribePendingComments = (onComments, onError) => {
  let comments = [];
  let replies = [];

  const emit = () => {
    onComments(sortNewest([...comments, ...replies].filter(item => (
      item.status === 'pending' || item.status === 'hidden' || item.status === 'rejected'
    ))));
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
      onError?.(error);
      replies = [];
      emit();
    },
  );

  return () => {
    commentsUnsubscribe();
    repliesUnsubscribe();
  };
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

export const subscribeAnnouncements = (onAnnouncements, onError) => (
  onSnapshot(
    query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(40)),
    (snapshot) => {
      onAnnouncements(snapshot.docs.map(normalizeAdminDoc));
    },
    onError,
  )
);

export const saveAnnouncement = async (announcement, announcementId = null) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Duyuru kaydetmek için admin girişi gerekli.');

  const payload = {
    title: announcement.title.trim(),
    message: announcement.message.trim(),
    type: announcement.type,
    targetAudience: announcement.targetAudience,
    startDate: announcement.startDate || null,
    endDate: announcement.endDate || null,
    isActive: announcement.isActive === true,
    showInNotifications: announcement.showInNotifications === true,
    updatedAt: serverTimestamp(),
  };

  if (announcementId) {
    return updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcementId), payload);
  }

  return addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });
};

export const deleteAnnouncement = async (announcementId) => (
  deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, announcementId))
);

export const sendAdminNotification = async (notification) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Bildirim göndermek için admin girişi gerekli.');

  return addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
    title: notification.title.trim(),
    message: notification.message.trim(),
    type: notification.type,
    targetType: notification.targetType,
    targetUserId: notification.targetUserId || null,
    isRead: false,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });
};

export const subscribeBannedWords = (onWords, onError) => (
  onSnapshot(
    query(collection(db, BANNED_WORDS_COLLECTION), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onWords(snapshot.docs.map(normalizeAdminDoc));
    },
    onError,
  )
);

export const addBannedWord = async (word) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Yasaklı kelime eklemek için admin girişi gerekli.');

  return addDoc(collection(db, BANNED_WORDS_COLLECTION), {
    word: word.trim().toLocaleLowerCase('tr-TR'),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    isActive: true,
  });
};

export const deleteBannedWord = async (wordId) => (
  deleteDoc(doc(db, BANNED_WORDS_COLLECTION, wordId))
);

export const updateBannedWordActive = async (wordId, isActive) => (
  updateDoc(doc(db, BANNED_WORDS_COLLECTION, wordId), {
    isActive,
    updatedAt: serverTimestamp(),
  })
);

export const subscribeHeroBanners = (onBanners, onError) => (
  onSnapshot(
    query(collection(db, HERO_BANNERS_COLLECTION), orderBy('createdAt', 'desc'), limit(30)),
    (snapshot) => {
      onBanners(snapshot.docs.map(normalizeAdminDoc));
    },
    onError,
  )
);

export const saveHeroBanner = async (banner, bannerId = null) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Hero banner kaydetmek için admin girişi gerekli.');

  const payload = {
    title: (banner.title || '').trim(),
    description: (banner.description || '').trim(),
    imageUrl: (banner.imageUrl || '').trim(),
    posterUrl: (banner.posterUrl || '').trim(),
    buttonText: (banner.buttonText || '').trim(),
    buttonLink: (banner.buttonLink || '').trim(),
    featuredContentId: (banner.featuredContentId || '').trim(),
    featuredContentType: banner.featuredContentType || 'movie',
    featuredContentTitle: (banner.featuredContentTitle || '').trim(),
    featuredContentYear: (banner.featuredContentYear || '').trim(),
    isActive: banner.isActive === true,
    startDate: banner.startDate || null,
    endDate: banner.endDate || null,
    updatedAt: serverTimestamp(),
  };

  if (bannerId) {
    return updateDoc(doc(db, HERO_BANNERS_COLLECTION, bannerId), payload);
  }

  return addDoc(collection(db, HERO_BANNERS_COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });
};

export const deleteHeroBanner = async (bannerId) => (
  deleteDoc(doc(db, HERO_BANNERS_COLLECTION, bannerId))
);
