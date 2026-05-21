import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bookmark,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Film,
  Flame,
  Heart,
  Lock,
  MessageSquare,
  Pencil,
  Save,
  Star,
  Trophy,
  Tv,
  UserRound,
  X,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SpoilerContent from '../components/SpoilerContent';
import UserAvatar from '../components/UserAvatar';
import usePublicUserProfile from '../hooks/usePublicUserProfile';
import { useMovies } from '../context/MovieContext';
import {
  PROFILE_AVATARS,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_SIZE,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';
import { subscribeToUserCommentSummary } from '../services/commentService';
import { ALL_GENRE_MAP } from '../services/tmdb';
import { formatCommentDate } from '../utils/commentFormat';
import { getMediaType, getMediaTypeLabel, getWatchStatus, isTvShow, MEDIA_TYPES } from '../utils/media';
import '../styles/pages/pages.css';

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const acceptedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
const watchedStatuses = new Set(['watched', 'completed']);
const profileRatingFields = ['userRating', 'personalRating', 'myRating', 'userScore', 'score'];

const formatProfileDate = (value) => {
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : value
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) return 'Kayıt tarihi yok';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const getDateTime = (value) => {
  if (!value) return 0;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value?.toDate === 'function') {
    const time = value.toDate().getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;

    if (typeof seconds === 'number') {
      return (seconds * 1000) + Math.floor(nanoseconds / 1000000);
    }
  }

  return 0;
};

const getSortTime = (item, fields) => {
  for (const field of fields) {
    const time = getDateTime(item?.[field]);
    if (time > 0) return time;
  }

  return 0;
};

const formatShortDate = (value) => {
  const time = getDateTime(value);
  if (time <= 0) return 'Tarih yok';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(time));
};

const getCommentPreview = (comment) => {
  if (!comment?.text) return 'Bu yorum silindi.';
  if (comment.isSpoiler === true) return comment.text;

  return comment.text.length > 170
    ? `${comment.text.slice(0, 170)}...`
    : comment.text;
};

const getMovieGenres = (movie) => {
  const namedGenres = (movie.genres || [])
    .map(genre => (typeof genre === 'string' ? genre : genre?.name))
    .filter(Boolean);

  if (namedGenres.length > 0) return namedGenres;

  return (movie.genre_ids || [])
    .map(id => ALL_GENRE_MAP[id])
    .filter(Boolean);
};

const incrementGenres = (counts, movie, weight = 1) => {
  getMovieGenres(movie).forEach((genre) => {
    counts.set(genre, (counts.get(genre) || 0) + weight);
  });
};

const normalizeSearchText = (value = '') => (
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const isWatchedItem = (movie) => (
  Boolean(movie?.watched) || watchedStatuses.has(getWatchStatus(movie))
);

const getUserRating = (movie) => {
  for (const field of profileRatingFields) {
    const value = Number(movie?.[field]);
    if (Number.isFinite(value) && value > 0) return value;
  }

  const rating = Number(movie?.rating);
  const voteAverage = Number(movie?.voteAverage ?? movie?.vote_average);
  const ratingLooksPersonal =
    movie?.ratingSource === 'user' ||
    movie?.isUserRating === true ||
    (Number.isFinite(rating) && rating > 0 && (!Number.isFinite(voteAverage) || Math.abs(rating - voteAverage) > 0.01));

  return ratingLooksPersonal ? rating : 0;
};

const toSortedRecent = (items, dateFields) => (
  items
    .map((item, index) => ({
      item,
      index,
      time: getSortTime(item, dateFields),
    }))
    .sort((first, second) => (second.time - first.time) || (second.index - first.index))
);

const getProfilePhotoValidationMessage = (file) => {
  if (!file) return 'Profil fotoğrafı seçilemedi.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  const isAcceptedType = acceptedImageTypes.includes(file.type);
  const isAcceptedExtension = acceptedImageExtensions.includes(extension);
  const hasImageMime = file.type ? file.type.startsWith('image/') : isAcceptedExtension;

  if (!hasImageMime || (!isAcceptedType && !isAcceptedExtension)) {
    return 'Sadece jpg, jpeg, png veya webp formatında görsel seçebilirsin.';
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return 'Profil fotoğrafı en fazla 2 MB olabilir.';
  }

  return '';
};

const resizeProfileImage = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('canvas-unavailable');

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;

      canvas.width = PROFILE_IMAGE_SIZE;
      canvas.height = PROFILE_IMAGE_SIZE;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        PROFILE_IMAGE_SIZE,
        PROFILE_IMAGE_SIZE,
      );

      const webpDataUrl = canvas.toDataURL('image/webp', 0.82);
      resolve(webpDataUrl.startsWith('data:image/webp') ? webpDataUrl : canvas.toDataURL('image/jpeg', 0.86));
    } catch (error) {
      reject(error);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };

  image.src = objectUrl;
});

const buildProfileDraft = (profile = {}, user = null) => {
  const avatarFields = normalizeProfileAvatarFields(profile);

  return {
    displayName: profile.displayName || user?.displayName || user?.email?.split('@')[0] || '',
    profileNote: profile.profileNote || '',
    ...avatarFields,
  };
};

const buildProfileAnalytics = (movies = []) => {
  const items = Array.isArray(movies) ? movies : [];
  const watchedItems = items.filter(isWatchedItem);
  const watchedMovieCount = watchedItems.filter(movie => getMediaType(movie) === MEDIA_TYPES.movie).length;
  const watchedTvCount = watchedItems.filter(isTvShow).length;
  const favoriteItems = items.filter(movie => movie.favorite || movie.isFavorite);
  const watchlistItems = items.filter(movie => getWatchStatus(movie) === 'watchlist');
  const ratingItems = items
    .map(movie => ({ movie, rating: getUserRating(movie) }))
    .filter(({ rating }) => rating > 0);
  const averageRating = ratingItems.length > 0
    ? ratingItems.reduce((total, item) => total + item.rating, 0) / ratingItems.length
    : 0;
  const genreCounts = new Map();

  watchedItems.forEach(movie => incrementGenres(genreCounts, movie));
  favoriteItems.forEach(movie => incrementGenres(genreCounts, movie, 1.35));

  const favoriteGenre = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, 'tr'))[0] || null;
  const lastWatched = toSortedRecent(watchedItems, ['watchedAt', 'watched_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'])[0]?.item || null;
  const recentActivities = [
    ...watchedItems.map(movie => ({
      id: `watched:${movie.docId || movie.id}`,
      movie,
      time: getSortTime(movie, ['watchedAt', 'watched_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at']),
      text: `${movie.title} izlendi olarak işaretlendi`,
      type: 'watched',
      icon: CheckCircle2,
    })),
    ...favoriteItems.map(movie => ({
      id: `favorite:${movie.docId || movie.id}`,
      movie,
      time: getSortTime(movie, ['favoriteAt', 'favorite_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at']),
      text: `${movie.title} favorilere eklendi`,
      type: 'favorite',
      icon: Heart,
    })),
    ...ratingItems.map(({ movie, rating }) => ({
      id: `rating:${movie.docId || movie.id}`,
      movie,
      time: getSortTime(movie, ['ratingAt', 'ratedAt', 'updatedAt', 'updated_at', 'createdAt', 'created_at']),
      text: `${movie.title} için ${Number(rating).toFixed(1)} puan verildi`,
      type: 'rating',
      icon: Star,
    })),
    ...watchlistItems.map(movie => ({
      id: `watchlist:${movie.docId || movie.id}`,
      movie,
      time: getSortTime(movie, ['watchlistAt', 'createdAt', 'created_at', 'updatedAt', 'updated_at']),
      text: `${movie.title} izlenecekler listesine eklendi`,
      type: 'watchlist',
      icon: Bookmark,
    })),
  ]
    .sort((first, second) => second.time - first.time)
    .slice(0, 8);

  return {
    totalCount: items.length,
    watchedItems,
    watchedMovieCount,
    watchedTvCount,
    favoriteItems,
    favoriteCount: favoriteItems.length,
    watchlistCount: watchlistItems.length,
    ratingCount: ratingItems.length,
    averageRating,
    favoriteGenre,
    lastWatched,
    recentActivities,
  };
};

const buildProfileBadges = (analytics) => {
  const favoriteGenreName = normalizeSearchText(analytics.favoriteGenre?.name || '');
  const totalWatchedCount = analytics.watchedMovieCount + analytics.watchedTvCount;

  return [
    {
      id: 'first-content',
      title: 'İlk İçerik',
      description: 'İlk film veya dizisini izlediğinde kazanılır.',
      icon: Clapperboard,
      currentValue: Math.min(totalWatchedCount, 1),
      requirement: 1,
      unit: 'içerik',
      earned: totalWatchedCount >= 1,
    },
    {
      id: 'movie-monster',
      title: 'Film Canavarı',
      description: '10 film izlediğinde kazanılır.',
      icon: Film,
      currentValue: Math.min(analytics.watchedMovieCount, 10),
      requirement: 10,
      unit: 'film',
      earned: analytics.watchedMovieCount >= 10,
    },
    {
      id: 'tv-addict',
      title: 'Dizi Bağımlısı',
      description: '5 dizi izlediğinde kazanılır.',
      icon: Tv,
      currentValue: Math.min(analytics.watchedTvCount, 5),
      requirement: 5,
      unit: 'dizi',
      earned: analytics.watchedTvCount >= 5,
    },
    {
      id: 'favorite-collector',
      title: 'Favori Koleksiyoncusu',
      description: '10 içeriği favorilere eklediğinde kazanılır.',
      icon: Trophy,
      currentValue: Math.min(analytics.favoriteCount, 10),
      requirement: 10,
      unit: 'favori',
      earned: analytics.favoriteCount >= 10,
    },
    {
      id: 'critic',
      title: 'Eleştirmen',
      description: '5 farklı içeriğe puan verdiğinde kazanılır.',
      icon: Award,
      currentValue: Math.min(analytics.ratingCount, 5),
      requirement: 5,
      unit: 'puan',
      earned: analytics.ratingCount >= 5,
    },
    {
      id: 'action-fan',
      title: 'Aksiyon Tutkunu',
      description: 'En çok izlenen tür aksiyon olduğunda kazanılır.',
      icon: Flame,
      currentValue: favoriteGenreName.includes('aksiyon') ? 1 : 0,
      requirement: 1,
      unit: 'tür',
      earned: favoriteGenreName.includes('aksiyon'),
    },
  ].map((badge) => ({
    ...badge,
    progressPercent: badge.earned
      ? 100
      : Math.min(100, Math.round((badge.currentValue / badge.requirement) * 100)),
  }));
};

const ProfileMovieList = ({ movies, title }) => {
  if (movies.length === 0) return null;

  return (
    <section className="profile-panel profile-movies-panel">
      <h3>{title}</h3>
      <div className="profile-movie-strip">
        {movies.slice(0, 6).map(movie => (
          <article key={`${movie.mediaType || 'movie'}:${movie.id}:${movie.docId || ''}`}>
            <span>
              {movie.poster ? (
                <img src={movie.poster} alt={movie.title} />
              ) : (
                <Star size={22} aria-hidden="true" />
              )}
            </span>
            <strong>{movie.title}</strong>
            <small>{getMediaTypeLabel(movie)} · {movie.year || 'Yıl yok'}</small>
          </article>
        ))}
      </div>
    </section>
  );
};

const ProfileStatCard = ({ icon: Icon, label, value, hint }) => (
  <article>
    <Icon size={18} aria-hidden="true" />
    <span>{label}</span>
    <strong>{value}</strong>
    {hint && <small>{hint}</small>}
  </article>
);

const UserProfile = () => {
  const { userId } = useParams();
  const { movies, user, userProfile, updateAccountSettings } = useMovies();
  const [statsState, setStatsState] = useState({
    userId,
    loading: true,
    error: '',
    totalComments: 0,
    totalReceivedLikes: 0,
    recentComments: [],
    firstActivityAt: null,
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => buildProfileDraft(userProfile, user));
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);
  const [editorMessage, setEditorMessage] = useState('');
  const [editorMessageType, setEditorMessageType] = useState('success');
  const isOwnProfile = Boolean(user?.uid && user.uid === userId);
  const profileFallback = useMemo(() => (
    isOwnProfile
      ? {
        ...userProfile,
        createdAt: userProfile?.createdAt || user?.metadata?.creationTime || user?.metadata?.createdAt,
      }
      : {}
  ), [isOwnProfile, user, userProfile]);
  const resolvedProfile = usePublicUserProfile(userId, profileFallback);
  const stats = statsState.userId === userId
    ? statsState
    : {
      error: '',
      totalComments: 0,
      totalReceivedLikes: 0,
      recentComments: [],
      firstActivityAt: null,
    };
  const statsLoading = statsState.userId !== userId || statsState.loading;
  const profileDate =
    resolvedProfile.createdAt ||
    resolvedProfile.registeredAt ||
    resolvedProfile.created_at ||
    resolvedProfile.updatedAt ||
    resolvedProfile.lastLoginAt ||
    stats.firstActivityAt;
  const profileDateLabel = resolvedProfile.createdAt || resolvedProfile.registeredAt || resolvedProfile.created_at
    ? 'Kayıt tarihi'
    : resolvedProfile.updatedAt
      ? 'Profil tarihi'
      : resolvedProfile.lastLoginAt
        ? 'Son giriş'
        : 'İlk yorum tarihi';
  const analytics = useMemo(
    () => buildProfileAnalytics(isOwnProfile ? movies : []),
    [isOwnProfile, movies],
  );
  const badges = useMemo(() => buildProfileBadges(analytics), [analytics]);
  const earnedBadgeCount = badges.filter(badge => badge.earned).length;
  const favoriteMovies = useMemo(
    () => isOwnProfile
      ? movies.filter(movie => movie.favorite || movie.isFavorite)
      : [],
    [isOwnProfile, movies],
  );
  const watchlistMovies = useMemo(
    () => isOwnProfile
      ? movies.filter(movie => getWatchStatus(movie) === 'watchlist')
      : [],
    [isOwnProfile, movies],
  );
  const selectedAvatar = normalizeProfileAvatarFields(profileDraft);
  const selectedPresetId = selectedAvatar.avatarType === 'preset' ? selectedAvatar.avatarId : null;
  const displayName = resolvedProfile.displayName || 'CineTrack kullanıcısı';
  const favoriteGenreLabel = analytics.favoriteGenre?.name || 'Henüz favori tür belirlenmedi';
  const averageRatingLabel = analytics.ratingCount > 0
    ? analytics.averageRating.toFixed(1)
    : 'Henüz puan verilmedi';

  useEffect(() => (
    subscribeToUserCommentSummary(
      userId,
      (summary) => {
        setStatsState(current => ({
          userId,
          error: current.userId === userId ? current.error : '',
          ...summary,
        }));
      },
      (error, source) => {
        if (source === 'replies') return;

        console.warn('User comment summary could not be loaded:', error);
        setStatsState(current => {
          const base = current.userId === userId
            ? current
            : {
              totalComments: 0,
              totalReceivedLikes: 0,
              recentComments: [],
              firstActivityAt: null,
            };

          return {
            ...base,
            userId,
            loading: false,
            error: 'Yorumlar okunamadı. Firestore rules güncel olmayabilir.',
          };
        });
      },
    )
  ), [userId]);

  const openEditor = () => {
    setProfileDraft(buildProfileDraft(userProfile || resolvedProfile, user));
    setEditorMessage('');
    setEditorOpen(true);
  };

  const updateDraftField = (field, value) => {
    setProfileDraft(current => ({
      ...current,
      [field]: value,
    }));
  };

  const selectPresetAvatar = (avatarId) => {
    setEditorMessage('');
    setProfileDraft(current => ({
      ...current,
      avatarType: 'preset',
      avatarId,
      avatarUrl: null,
      avatar: avatarId,
    }));
  };

  const handleProfilePhotoFile = async (file) => {
    const validationMessage = getProfilePhotoValidationMessage(file);

    if (validationMessage) {
      setEditorMessageType('error');
      setEditorMessage(validationMessage);
      return;
    }

    setPhotoProcessing(true);
    setEditorMessage('');

    try {
      const avatarUrl = await resizeProfileImage(file);
      setProfileDraft(current => ({
        ...current,
        avatarType: 'image',
        avatarId: null,
        avatarUrl,
        avatar: null,
      }));
    } catch (error) {
      console.error('Profile photo could not be processed:', error);
      setEditorMessageType('error');
      setEditorMessage('Profil fotoğrafı okunamadı. Lütfen başka bir görsel seç.');
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handlePhotoInputChange = (event) => {
    handleProfilePhotoFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const submitProfileEditor = async (event) => {
    event.preventDefault();
    setEditorMessage('');
    setProfileSaving(true);

    try {
      const nextAvatar = normalizeProfileAvatarFields(profileDraft);
      const nextProfile = await updateAccountSettings({
        displayName: profileDraft.displayName,
        profileNote: profileDraft.profileNote,
        avatarType: nextAvatar.avatarType,
        avatarId: nextAvatar.avatarId,
        avatarUrl: nextAvatar.avatarUrl,
        avatar: nextAvatar.avatar,
      });

      setProfileDraft(buildProfileDraft(nextProfile, user));
      setEditorMessageType('success');
      setEditorMessage('Profil güncellendi.');
      setEditorOpen(false);
    } catch (error) {
      console.error('Profile could not be updated:', error);
      setEditorMessageType('error');
      setEditorMessage('Profil güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="page-container">
      {user && <Navbar />}
      <div className={user ? 'page-content' : 'page-content public-profile-content'}>
        <main className="container-fluid user-profile-page">
          <section className="user-profile-hero">
            <div className="user-profile-identity">
              <UserAvatar
                profile={resolvedProfile}
                className="user-profile-avatar"
                label={`${displayName} profil görseli`}
              />
              <div>
                <p className="eyebrow">Profil</p>
                <h2>{displayName}</h2>
                <p>{resolvedProfile.profileNote || 'Film ve dizi zevkini keşfeden bir CineTrack kullanıcısı.'}</p>
                {profileDate && (
                  <span>
                    <CalendarDays size={15} aria-hidden="true" />
                    {profileDateLabel}: {formatProfileDate(profileDate)}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-hero-summary" aria-label="Profil özeti">
              <span><strong>{isOwnProfile ? analytics.totalCount : stats.totalComments}</strong>{isOwnProfile ? 'Kayıt' : 'Yorum'}</span>
              <span><strong>{isOwnProfile ? earnedBadgeCount : stats.totalReceivedLikes}</strong>{isOwnProfile ? 'Rozet' : 'Beğeni'}</span>
              {isOwnProfile && (
                <button
                  className="profile-edit-button"
                  type="button"
                  onClick={openEditor}
                >
                  <Pencil size={16} aria-hidden="true" />
                  Profili Düzenle
                </button>
              )}
            </div>
          </section>

          {isOwnProfile && editorOpen && (
            <section className="profile-editor-panel" aria-labelledby="profile-editor-title">
              <form onSubmit={submitProfileEditor}>
                <div className="profile-editor-head">
                  <div>
                    <p className="eyebrow">Profil</p>
                    <h3 id="profile-editor-title">Profili düzenle</h3>
                  </div>
                  <button
                    className="profile-editor-close"
                    type="button"
                    aria-label="Profil düzenlemeyi kapat"
                    onClick={() => setEditorOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="profile-editor-layout">
                  <div className="profile-editor-fields">
                    <label>
                      Kullanıcı adı
                      <input
                        type="text"
                        value={profileDraft.displayName}
                        onChange={event => updateDraftField('displayName', event.target.value)}
                        maxLength={36}
                        placeholder="Kullanıcı adın"
                        required
                      />
                    </label>
                    <label>
                      Profil açıklaması
                      <input
                        type="text"
                        value={profileDraft.profileNote}
                        onChange={event => updateDraftField('profileNote', event.target.value)}
                        maxLength={90}
                        placeholder="Kısa bio veya izleme ruh halin"
                      />
                    </label>
                  </div>

                  <div className="profile-editor-avatar">
                    <div className="profile-avatar-head">
                      <UserAvatar
                        avatarType={selectedAvatar.avatarType}
                        avatarId={selectedAvatar.avatarId}
                        avatarUrl={selectedAvatar.avatarUrl}
                        className="profile-avatar-preview"
                        label="Seçili profil görseli"
                      />
                      <div>
                        <h4>Avatar</h4>
                        <p>Hazır avatar seç veya kendi profil fotoğrafını yükle.</p>
                      </div>
                    </div>

                    <div className="profile-avatar-grid" role="radiogroup" aria-label="Hazır avatarlar">
                      {PROFILE_AVATARS.map(avatarOption => {
                        const selected = selectedPresetId === avatarOption.id;

                        return (
                          <button
                            key={avatarOption.id}
                            className={selected ? 'avatar-option selected' : 'avatar-option'}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={`${avatarOption.label} avatarını seç`}
                            onClick={() => selectPresetAvatar(avatarOption.id)}
                          >
                            <UserAvatar
                              avatarType="preset"
                              avatarId={avatarOption.id}
                              decorative
                            />
                            <span className="avatar-option-label">{avatarOption.label}</span>
                            {selected && <span className="avatar-check" aria-hidden="true">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    <label
                      className={[
                        'profile-upload-dropzone',
                        selectedAvatar.avatarType === 'image' ? 'selected' : '',
                        draggingPhoto ? 'dragging' : '',
                      ].filter(Boolean).join(' ')}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDraggingPhoto(true);
                      }}
                      onDragLeave={() => setDraggingPhoto(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDraggingPhoto(false);
                        handleProfilePhotoFile(event.dataTransfer.files?.[0]);
                      }}
                    >
                      <input
                        className="profile-photo-input"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handlePhotoInputChange}
                        disabled={profileSaving || photoProcessing}
                      />
                      <UserAvatar
                        avatarType={selectedAvatar.avatarType}
                        avatarId={selectedAvatar.avatarId || 'user-slate'}
                        avatarUrl={selectedAvatar.avatarUrl}
                        className="profile-upload-preview"
                        decorative
                      />
                      <span className="profile-upload-copy">
                        <strong>{photoProcessing ? 'Fotoğraf hazırlanıyor...' : 'Profil fotoğrafı yükle'}</strong>
                        <small>JPG, PNG veya WEBP; 2 MB'a kadar.</small>
                      </span>
                    </label>
                  </div>
                </div>

                {editorMessage && <p className={`settings-message ${editorMessageType}`}>{editorMessage}</p>}

                <div className="profile-editor-actions">
                  <button type="button" onClick={() => setEditorOpen(false)}>
                    Vazgeç
                  </button>
                  <button type="submit" disabled={profileSaving || photoProcessing}>
                    <Save size={16} aria-hidden="true" />
                    {profileSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {isOwnProfile ? (
            <>
              <section className="profile-stats-grid" aria-label="Profil istatistikleri">
                <ProfileStatCard
                  icon={Film}
                  label="İzlenen Film"
                  value={analytics.watchedMovieCount}
                  hint="İzlendi olarak işaretlenen filmler"
                />
                <ProfileStatCard
                  icon={Tv}
                  label="İzlenen Dizi"
                  value={analytics.watchedTvCount}
                  hint="Tamamlanan veya izlendi durumundaki diziler"
                />
                <ProfileStatCard
                  icon={Heart}
                  label="Favoriler"
                  value={analytics.favoriteCount}
                  hint="Favorilere eklenen içerikler"
                />
                <ProfileStatCard
                  icon={Bookmark}
                  label="İzlenecekler"
                  value={analytics.watchlistCount}
                  hint="Planlanan film ve diziler"
                />
                <ProfileStatCard
                  icon={Star}
                  label="Ortalama Puan"
                  value={averageRatingLabel}
                  hint={analytics.ratingCount > 0 ? `${analytics.ratingCount} puanlı kayıt` : 'Henüz puan verilmedi'}
                />
                <ProfileStatCard
                  icon={Clock3}
                  label="Son İzlenen"
                  value={analytics.lastWatched?.title || 'Henüz yok'}
                  hint={analytics.lastWatched ? formatShortDate(analytics.lastWatched.watchedAt || analytics.lastWatched.watched_at) : 'Henüz izlenen içerik yok'}
                />
                <ProfileStatCard
                  icon={Flame}
                  label="Favori Tür"
                  value={favoriteGenreLabel}
                  hint={analytics.favoriteGenre ? 'İzlenen ve favorilerden hesaplandı' : 'Henüz favori tür belirlenmedi'}
                />
              </section>

              <section className="profile-insight-grid" aria-label="Profil özet alanları">
                <article className="profile-insight-card">
                  <span className="profile-insight-icon"><Flame size={22} aria-hidden="true" /></span>
                  <div>
                    <h3>Favori Tür: {favoriteGenreLabel}</h3>
                    <p>{analytics.favoriteGenre ? 'En çok izlediğin ve favorilediğin türlerden otomatik hesaplandı.' : 'İçerik izledikçe veya favorilere ekledikçe burada baskın türün görünecek.'}</p>
                  </div>
                </article>
                <article className="profile-insight-card">
                  <span className="profile-insight-icon"><Star size={22} aria-hidden="true" /></span>
                  <div>
                    <h3>Ortalama Puanın: {averageRatingLabel}</h3>
                    <p>{analytics.ratingCount > 0 ? `${analytics.ratingCount} farklı içerik üzerinden hesaplandı.` : 'Henüz puan verilmedi.'}</p>
                  </div>
                </article>
              </section>

              <section className="profile-panel profile-latest-panel">
                <div className="profile-panel-head">
                  <h3>En Son İzlenen İçerik</h3>
                  <span>{analytics.lastWatched ? getMediaTypeLabel(analytics.lastWatched) : 'Boş'}</span>
                </div>

                {analytics.lastWatched ? (
                  <article className="profile-latest-card">
                    <span className="profile-latest-poster">
                      {analytics.lastWatched.poster ? (
                        <img src={analytics.lastWatched.poster} alt={analytics.lastWatched.title} />
                      ) : (
                        <Camera size={26} aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <strong>{analytics.lastWatched.title}</strong>
                      <span>{getMovieGenres(analytics.lastWatched).slice(0, 3).join(' · ') || 'Tür bilgisi yok'}</span>
                      <small>{formatShortDate(analytics.lastWatched.watchedAt || analytics.lastWatched.watched_at || analytics.lastWatched.updatedAt || analytics.lastWatched.updated_at)}</small>
                    </div>
                  </article>
                ) : (
                  <p className="profile-empty">Henüz izlenen içerik yok.</p>
                )}
              </section>

              <section className="profile-panel profile-badges-panel">
                <div className="profile-panel-head">
                  <h3>Rozetler</h3>
                  <span>{earnedBadgeCount} / {badges.length} aktif</span>
                </div>

                <div className="profile-badge-grid">
                  {badges.map((badge) => {
                    const Icon = badge.icon;

                    return (
                      <article key={badge.id} className={badge.earned ? 'profile-badge earned' : 'profile-badge locked'}>
                        <div className="profile-badge-top">
                          <span className="profile-badge-icon">
                            <Icon size={24} aria-hidden="true" />
                          </span>
                          <span className="profile-badge-status">
                            {badge.earned ? <CheckCircle2 size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
                            {badge.earned ? 'Kazanıldı' : 'Kilitli'}
                          </span>
                        </div>
                        <div>
                          <h4>{badge.title}</h4>
                          <p>{badge.description}</p>
                        </div>
                        <div className="profile-badge-progress">
                          <span>{badge.currentValue} / {badge.requirement} {badge.unit}</span>
                          <i><b style={{ width: `${badge.progressPercent}%` }} /></i>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="profile-panel profile-activities-panel">
                <div className="profile-panel-head">
                  <h3>Son Aktiviteler</h3>
                  <span>{analytics.recentActivities.length}</span>
                </div>

                {analytics.recentActivities.length > 0 ? (
                  <div className="profile-activity-list">
                    {analytics.recentActivities.map((activity, index) => {
                      const Icon = activity.icon;

                      return (
                        <article key={`${activity.id}:${index}`} className={`profile-activity ${activity.type}`}>
                          <span>
                            <Icon size={16} aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{activity.text}</strong>
                            <small>{formatShortDate(activity.time)}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="profile-empty">Henüz profil aktivitesi yok.</p>
                )}
              </section>
            </>
          ) : (
            <section className="profile-panel">
              <div className="profile-panel-head">
                <h3>İzleme panosu</h3>
                <span>Gizli</span>
              </div>
              <p className="profile-empty">Kişisel izleme istatistikleri yalnızca profil sahibi tarafından görüntülenebilir.</p>
            </section>
          )}

          <section className="profile-social-stats" aria-label="Sosyal profil istatistikleri">
            <article>
              <MessageSquare size={18} aria-hidden="true" />
              <span>Toplam yorum</span>
              <strong>{statsLoading ? '...' : stats.totalComments}</strong>
            </article>
            <article>
              <Heart size={18} aria-hidden="true" />
              <span>Alınan beğeni</span>
              <strong>{statsLoading ? '...' : stats.totalReceivedLikes}</strong>
            </article>
            {isOwnProfile && (
              <article>
                <UserRound size={18} aria-hidden="true" />
                <span>Kişisel kayıt</span>
                <strong>{analytics.totalCount}</strong>
              </article>
            )}
          </section>

          <section className="profile-panel">
            <div className="profile-panel-head">
              <h3>Son yorumlar</h3>
              <span>{stats.recentComments.length}</span>
            </div>

            {stats.error && <p className="profile-warning">{stats.error}</p>}

            {statsLoading ? (
              <p className="profile-empty">Yorumlar yükleniyor...</p>
            ) : stats.recentComments.length === 0 ? (
              <p className="profile-empty">Henüz herkese açık yorum yok.</p>
            ) : (
              <div className="profile-comment-list">
                {stats.recentComments.map(comment => (
                  <article key={`${comment.kind}:${comment.id}:${comment.commentId || ''}`}>
                    <div>
                      <strong>{comment.mediaTitle || 'İsimsiz içerik'}</strong>
                      <span>{comment.kind === 'reply' ? 'Yanıt' : 'Yorum'} · {formatCommentDate(comment.createdAt)}</span>
                    </div>
                    <SpoilerContent
                      isSpoiler={comment.isSpoiler === true}
                      text={getCommentPreview(comment)}
                    />
                    <small>
                      <Heart size={13} aria-hidden="true" />
                      {comment.likes || 0}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </section>

          {isOwnProfile && (
            <>
              <ProfileMovieList movies={favoriteMovies} title="Favori içerikler" />
              <ProfileMovieList movies={watchlistMovies} title="İzleme listesi" />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserProfile;
