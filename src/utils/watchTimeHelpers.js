import { getDateTime, isWithinDays, startOfWeek } from './dateTime';
import { getTvProgress, getWatchStatus, isTvShow } from './media';

const DEFAULT_MOVIE_MINUTES = 120;
const DEFAULT_EPISODE_MINUTES = 45;

const isWatchedMovie = (movie) => (
  movie.watched
  || getWatchStatus(movie) === 'completed'
  || getWatchStatus(movie) === 'watched'
);

const getMovieMinutes = (movie) => {
  const runtime = Number(movie.runtime || movie.episodeRuntime);
  if (Number.isFinite(runtime) && runtime > 0) return runtime;
  return isTvShow(movie) ? DEFAULT_EPISODE_MINUTES : DEFAULT_MOVIE_MINUTES;
};

const getWatchedTvMinutes = (movie) => {
  const episodeMinutes = getMovieMinutes(movie);
  const progress = getTvProgress(movie);
  const watchedEpisodes = Math.max(
    progress.watchedEpisodes,
    Number(movie.watchedEpisodes) || 0,
    isWatchedMovie(movie) ? Number(movie.currentEpisode) || 1 : 0,
  );

  return watchedEpisodes * episodeMinutes;
};

export const getMediaWatchMinutes = (movie) => {
  if (!isWatchedMovie(movie) && getWatchStatus(movie) !== 'watching') return 0;

  if (isTvShow(movie)) {
    return getWatchedTvMinutes(movie);
  }

  return getMovieMinutes(movie);
};

export const sumWatchMinutes = (movies = []) => (
  movies.reduce((total, movie) => total + getMediaWatchMinutes(movie), 0)
);

export const formatWatchDuration = (totalMinutes = 0) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (hours <= 0) return `${remaining} dakika`;
  if (remaining === 0) return `${hours} saat`;

  return `${hours} saat ${remaining} dakika`;
};

export const formatWatchDurationLong = (totalMinutes = 0) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const remaining = minutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} saat`);
  if (remaining > 0 && days === 0) parts.push(`${remaining} dakika`);

  return parts.length > 0 ? parts.join(' ') : '0 dakika';
};

const getActivityTime = (movie) => Math.max(
  getDateTime(movie.watchedAt),
  getDateTime(movie.watched_at),
  getDateTime(movie.updatedAt),
  getDateTime(movie.updated_at),
  getDateTime(movie.createdAt),
  getDateTime(movie.created_at),
);

export const filterMoviesByPeriod = (movies = [], period = 'all') => {
  if (period === 'all') {
    return movies.filter(movie => getMediaWatchMinutes(movie) > 0);
  }

  if (period === 'week') {
    const weekStart = startOfWeek().getTime();
    return movies.filter(movie => getActivityTime(movie) >= weekStart && getMediaWatchMinutes(movie) > 0);
  }

  if (period === 'month') {
    return movies.filter(movie => isWithinDays(getActivityTime(movie), 30) && getMediaWatchMinutes(movie) > 0);
  }

  return movies;
};

export const calculateWatchTimeStats = (movies = []) => {
  const watchedMovies = movies.filter(movie => getMediaWatchMinutes(movie) > 0);
  const movieItems = watchedMovies.filter(movie => !isTvShow(movie));
  const tvItems = watchedMovies.filter(isTvShow);

  const totalMinutes = sumWatchMinutes(watchedMovies);
  const weekMinutes = sumWatchMinutes(filterMoviesByPeriod(movies, 'week'));
  const monthMinutes = sumWatchMinutes(filterMoviesByPeriod(movies, 'month'));
  const movieMinutes = sumWatchMinutes(movieItems);
  const tvMinutes = sumWatchMinutes(tvItems);

  const genreMinutes = new Map();
  watchedMovies.forEach((movie) => {
    const minutes = getMediaWatchMinutes(movie);
    (movie.genres || []).slice(0, 2).forEach((genre) => {
      genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + minutes);
    });
  });

  const topGenre = Array.from(genreMinutes.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return {
    totalMinutes,
    weekMinutes,
    monthMinutes,
    movieMinutes,
    tvMinutes,
    topGenre: topGenre ? { name: topGenre[0], minutes: topGenre[1] } : null,
    watchedCount: watchedMovies.length,
  };
};

export const WATCH_TIME_MILESTONES = [600, 1200, 3000];
export const WEEKLY_WATCH_MILESTONE = 300;
