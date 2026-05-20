import { ALL_GENRE_MAP } from '../services/tmdb';
import { getTvProgress, getWatchStatus, isTvShow } from './media';

const getMovieRating = (movie) => {
  const value = Number(movie.rating ?? movie.vote_average ?? movie.voteAverage);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getMovieGenres = (movie) => {
  const namedGenres = (movie.genres || []).filter(Boolean);
  if (namedGenres.length > 0) return namedGenres;

  return (movie.genre_ids || [])
    .map(id => ALL_GENRE_MAP[id])
    .filter(Boolean);
};

const incrementGenreCounts = (counts, movie, weight = 1) => {
  getMovieGenres(movie).forEach((genre) => {
    counts.set(genre, (counts.get(genre) || 0) + weight);
  });
};

const toSortedDistribution = (counts) => (
  Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'))
);

export const calculateMovieStatistics = (movies = []) => {
  const totalCount = movies.length;
  const watchedMovies = movies.filter(movie => movie.watched || getWatchStatus(movie) === 'completed' || getWatchStatus(movie) === 'watched');
  const watchlistMovies = movies.filter(movie => getWatchStatus(movie) === 'watchlist');
  const favoriteMovies = movies.filter(movie => movie.favorite || movie.isFavorite);
  const tvShows = movies.filter(isTvShow);
  const watchingTvShows = tvShows.filter(show => getWatchStatus(show) === 'watching');
  const completedTvShows = tvShows.filter(show => getWatchStatus(show) === 'completed');
  const droppedTvShows = tvShows.filter(show => getWatchStatus(show) === 'dropped');
  const tvProgressValues = tvShows.map(show => getTvProgress(show));
  const totalWatchedEpisodes = tvProgressValues.reduce((total, progress) => total + progress.watchedEpisodes, 0);
  const averageTvProgress = tvProgressValues.length > 0
    ? tvProgressValues.reduce((total, progress) => total + progress.progressPercent, 0) / tvProgressValues.length
    : 0;
  const ratingValues = movies.map(getMovieRating).filter(Boolean);
  const genreCounts = new Map();
  const watchedGenreCounts = new Map();
  const tasteGenreCounts = new Map();

  movies.forEach(movie => incrementGenreCounts(genreCounts, movie));
  watchedMovies.forEach(movie => incrementGenreCounts(watchedGenreCounts, movie));
  watchedMovies.forEach(movie => incrementGenreCounts(tasteGenreCounts, movie, 1));
  favoriteMovies.forEach(movie => incrementGenreCounts(tasteGenreCounts, movie, 1.4));

  const genreDistribution = toSortedDistribution(genreCounts);
  const watchedGenreDistribution = toSortedDistribution(watchedGenreCounts);
  const tasteGenres = toSortedDistribution(tasteGenreCounts).slice(0, 3).map(genre => genre.name);
  const favoriteRate = totalCount > 0 ? (favoriteMovies.length / totalCount) * 100 : 0;
  const averageTmdbRating = ratingValues.length > 0
    ? ratingValues.reduce((total, rating) => total + rating, 0) / ratingValues.length
    : 0;
  const highestRatedFavorite = [...favoriteMovies].sort((a, b) => (
    getMovieRating(b) - getMovieRating(a) || String(a.title).localeCompare(String(b.title), 'tr')
  ))[0] || null;

  return {
    totalCount,
    watchedCount: watchedMovies.length,
    watchlistCount: watchlistMovies.length,
    favoriteCount: favoriteMovies.length,
    watchingTvCount: watchingTvShows.length,
    completedTvCount: completedTvShows.length,
    droppedTvCount: droppedTvShows.length,
    averageTvProgress,
    totalWatchedEpisodes,
    favoriteRate,
    averageTmdbRating,
    ratingCount: ratingValues.length,
    topWatchedGenre: watchedGenreDistribution[0]?.name || 'Bilinmiyor',
    highestRatedFavorite,
    genreDistribution,
    statusDistribution: [
      { name: 'İzlendi', count: watchedMovies.length },
      { name: 'Planlanan', count: watchlistMovies.length },
      { name: 'Favoriler', count: favoriteMovies.length },
      { name: 'Devam edilen diziler', count: watchingTvShows.length },
    ],
    tasteGenres,
  };
};

export const formatMovieRating = (movie) => {
  const rating = getMovieRating(movie);
  return rating > 0 ? rating.toFixed(1) : '-';
};
