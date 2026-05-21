import { getWatchStatus, isTvShow } from './media';
import { getMediaWatchMinutes } from './watchTimeHelpers';

const getUserRating = (movie) => {
  const value = Number(movie.userRating ?? movie.personalRating ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const getTmdbRating = (movie) => {
  const value = Number(movie.rating ?? movie.voteAverage ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const scoreMovie = (movie, favoriteGenres = new Set()) => {
  let score = 0;
  const reasons = [];

  const tmdb = getTmdbRating(movie);
  if (tmdb > 0) {
    score += tmdb;
    if (tmdb >= 7.5) reasons.push('daha yüksek TMDB puanı');
  }

  const userRating = getUserRating(movie);
  if (userRating > 0) {
    score += userRating * 1.2;
    reasons.push('senin puanın daha yüksek');
  }

  if (movie.favorite || movie.isFavorite) {
    score += 4;
    reasons.push('favorilerinde');
  }

  const status = getWatchStatus(movie);
  if (status === 'watchlist') {
    score += 2;
    reasons.push('izlenecekler listende');
  }

  if (status === 'watching') {
    score += 1.5;
  }

  const overlap = (movie.genres || []).filter(genre => favoriteGenres.has(genre));
  if (overlap.length > 0) {
    score += overlap.length * 2;
    reasons.push('favori türlerine daha yakın');
  }

  const minutes = getMediaWatchMinutes(movie) || (isTvShow(movie) ? 45 : 120);
  if (minutes <= 110) {
    score += 1.5;
    reasons.push('bugün izlemek için daha kısa');
  }

  return { score, reasons };
};

export const compareMovies = (movieA, movieB, allMovies = []) => {
  const favoriteGenres = new Set();
  allMovies
    .filter(movie => movie.favorite || movie.isFavorite)
    .forEach(movie => (movie.genres || []).forEach(genre => favoriteGenres.add(genre)));

  const resultA = scoreMovie(movieA, favoriteGenres);
  const resultB = scoreMovie(movieB, favoriteGenres);

  const winner = resultA.score >= resultB.score ? movieA : movieB;
  const winnerResult = resultA.score >= resultB.score ? resultA : resultB;
  const uniqueReasons = [...new Set(winnerResult.reasons)].slice(0, 2);

  const reason = uniqueReasons.length > 0
    ? `Sebep: ${uniqueReasons.join(' ve ')}.`
    : 'Sebep: Genel skor ve liste uyumuna göre seçildi.';

  return {
    winner,
    loser: winner === movieA ? movieB : movieA,
    reason,
    scores: {
      a: resultA.score,
      b: resultB.score,
    },
  };
};
