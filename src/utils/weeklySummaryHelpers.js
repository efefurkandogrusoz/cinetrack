import { getDateTime, startOfWeek } from './dateTime';
import { getWatchStatus, isTvShow } from './media';
import { formatWatchDuration, getMediaWatchMinutes } from './watchTimeHelpers';

const weekStartMs = () => startOfWeek().getTime();

const getEventTime = (movie, fields) => {
  for (const field of fields) {
    const time = getDateTime(movie[field]);
    if (time > 0) return time;
  }
  return 0;
};

const isThisWeek = (time) => time >= weekStartMs();

const getUserRating = (movie) => {
  const value = Number(movie.userRating ?? movie.personalRating ?? movie.myRating ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const calculateWeeklySummary = (movies = []) => {
  const start = weekStartMs();

  const watchedThisWeek = movies.filter((movie) => {
    const time = getEventTime(movie, ['watchedAt', 'watched_at', 'updatedAt', 'updated_at']);
    return isThisWeek(time) && (
      movie.watched
      || getWatchStatus(movie) === 'watched'
      || getWatchStatus(movie) === 'completed'
    );
  });

  const favoritesThisWeek = movies.filter((movie) => {
    const time = getEventTime(movie, ['favoriteAt', 'favorite_at', 'updatedAt', 'updated_at']);
    return isThisWeek(time) && (movie.favorite || movie.isFavorite);
  });

  const watchlistThisWeek = movies.filter((movie) => {
    const time = getEventTime(movie, ['createdAt', 'created_at', 'updatedAt', 'updated_at']);
    const isWatchlist = getWatchStatus(movie) === 'watchlist';
    return isThisWeek(time) && isWatchlist;
  });

  const moviesWatched = watchedThisWeek.filter(movie => !isTvShow(movie)).length;
  const showsWatched = watchedThisWeek.filter(isTvShow).length;
  const totalWatched = watchedThisWeek.length;

  const ratingValues = watchedThisWeek.map(getUserRating).filter(Boolean);
  const averageRating = ratingValues.length > 0
    ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
    : 0;

  const genreCounts = new Map();
  watchedThisWeek.forEach((movie) => {
    (movie.genres || []).forEach((genre) => {
      if (!genre) return;
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });
  });

  const topGenre = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  const weekMinutes = watchedThisWeek.reduce((sum, movie) => sum + getMediaWatchMinutes(movie), 0);

  const latestWatched = [...watchedThisWeek]
    .sort((a, b) => getEventTime(b, ['watchedAt', 'watched_at']) - getEventTime(a, ['watchedAt', 'watched_at']))[0] || null;

  const hasActivity = totalWatched > 0
    || favoritesThisWeek.length > 0
    || watchlistThisWeek.length > 0;

  return {
    hasActivity,
    moviesWatched,
    showsWatched,
    totalWatched,
    favoritesAdded: favoritesThisWeek.length,
    watchlistAdded: watchlistThisWeek.length,
    averageRating,
    topGenre: topGenre?.[0] || null,
    weekMinutes,
    weekDurationLabel: formatWatchDuration(weekMinutes),
    latestWatched,
    weekStart: new Date(start),
  };
};
