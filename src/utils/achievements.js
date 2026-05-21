import { getMediaType, getTvProgress, getWatchStatus, isTvShow, MEDIA_TYPES } from './media';

export const badgeCategoryFilters = [
  { id: 'all', label: 'Tümü' },
  { id: 'movie', label: 'Film' },
  { id: 'tv', label: 'Dizi' },
  { id: 'favorite', label: 'Favori' },
  { id: 'general', label: 'Genel' },
];

export const achievementBadges = [
  {
    id: 'movie-beginner',
    title: 'Sinema Başlangıcı',
    description: '10 film izledin.',
    category: 'movie',
    metric: 'watchedMovieCount',
    requirement: 10,
    unit: 'film',
    icon: 'Clapperboard',
  },
  {
    id: 'movie-follower',
    title: 'Film Takipçisi',
    description: '25 film izledin.',
    category: 'movie',
    metric: 'watchedMovieCount',
    requirement: 25,
    unit: 'film',
    icon: 'Popcorn',
  },
  {
    id: 'movie-hunter',
    title: 'Film Avcısı',
    description: '50 film izledin.',
    category: 'movie',
    metric: 'watchedMovieCount',
    requirement: 50,
    unit: 'film',
    icon: 'Trophy',
  },
  {
    id: 'cine-master',
    title: 'CineMaster',
    description: '100 film izledin.',
    category: 'movie',
    metric: 'watchedMovieCount',
    requirement: 100,
    unit: 'film',
    icon: 'Crown',
  },
  {
    id: 'tv-starter',
    title: 'Diziye Başladın',
    description: '5 dizi takip ettin.',
    category: 'tv',
    metric: 'trackedTvCount',
    requirement: 5,
    unit: 'dizi',
    icon: 'Tv',
  },
  {
    id: 'season-hunter',
    title: 'Sezon Avcısı',
    description: '10 dizi takip ettin.',
    category: 'tv',
    metric: 'trackedTvCount',
    requirement: 10,
    unit: 'dizi',
    icon: 'Flame',
  },
  {
    id: 'tv-expert',
    title: 'Dizi Uzmanı',
    description: '25 dizi takip ettin.',
    category: 'tv',
    metric: 'trackedTvCount',
    requirement: 25,
    unit: 'dizi',
    icon: 'Medal',
  },
  {
    id: 'binge-master',
    title: 'Binge Master',
    description: '50 dizi takip ettin.',
    category: 'tv',
    metric: 'trackedTvCount',
    requirement: 50,
    unit: 'dizi',
    icon: 'Award',
  },
  {
    id: 'selective-viewer',
    title: 'Seçici İzleyici',
    description: '5 favori ekledin.',
    category: 'favorite',
    metric: 'favoriteCount',
    requirement: 5,
    unit: 'favori',
    icon: 'Heart',
  },
  {
    id: 'favorite-collector',
    title: 'Favori Koleksiyoner',
    description: '20 favori ekledin.',
    category: 'favorite',
    metric: 'favoriteCount',
    requirement: 20,
    unit: 'favori',
    icon: 'Star',
  },
  {
    id: 'taste-maker',
    title: 'Zevk Sahibi',
    description: '50 favori ekledin.',
    category: 'favorite',
    metric: 'favoriteCount',
    requirement: 50,
    unit: 'favori',
    icon: 'Crown',
  },
  {
    id: 'library-builder',
    title: 'Arşiv Kurucusu',
    description: '25 kayıtlık liste oluşturdun.',
    category: 'general',
    metric: 'totalCount',
    requirement: 25,
    unit: 'kayıt',
    icon: 'Award',
  },
  {
    id: 'episode-marathon',
    title: 'Bölüm Maratonu',
    description: '100 bölüm izledin.',
    category: 'general',
    metric: 'totalWatchedEpisodes',
    requirement: 100,
    unit: 'bölüm',
    icon: 'Flame',
  },
];

const getBadgeWatchStatus = (item) => item?.watchStatus || item?.watchedStatus || getWatchStatus(item);

export const calculateAchievementMetrics = (items = []) => {
  const movies = Array.isArray(items) ? items : [];
  const watchedMovieCount = movies.filter((item) => {
    const mediaType = getMediaType(item);
    const status = getBadgeWatchStatus(item);

    return mediaType === MEDIA_TYPES.movie && (status === 'watched' || status === 'completed' || item?.watched);
  }).length;
  const tvShows = movies.filter(isTvShow);
  const trackedTvCount = tvShows.filter((item) => {
    const status = getBadgeWatchStatus(item);

    return status === 'watching' || status === 'completed' || status === 'watched' || status === 'dropped' || item?.watched;
  }).length;
  const completedTvCount = tvShows.filter((item) => {
    const status = getBadgeWatchStatus(item);

    return status === 'completed' || item?.watched;
  }).length;
  const favoriteCount = movies.filter(item => item?.favorite || item?.isFavorite).length;
  const totalWatchedEpisodes = tvShows.reduce((total, show) => total + getTvProgress(show).watchedEpisodes, 0);

  return {
    totalCount: movies.length,
    watchedMovieCount,
    trackedTvCount,
    completedTvCount,
    favoriteCount,
    totalWatchedEpisodes,
  };
};

export const calculateAchievements = (items = []) => {
  const metrics = calculateAchievementMetrics(items);
  const badges = achievementBadges.map((badge) => {
    const currentValue = metrics[badge.metric] || 0;
    const cappedValue = Math.min(currentValue, badge.requirement);
    const progressPercent = badge.requirement > 0
      ? Math.min(100, Math.round((currentValue / badge.requirement) * 100))
      : 0;
    const earned = currentValue >= badge.requirement;

    return {
      ...badge,
      currentValue,
      displayValue: cappedValue,
      progressPercent: earned ? 100 : progressPercent,
      earned,
    };
  });

  return {
    badges,
    metrics,
    earnedCount: badges.filter(badge => badge.earned).length,
    totalCount: badges.length,
  };
};
