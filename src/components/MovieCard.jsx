import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Heart,
  Info,
  Play,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import { getMediaTrailer } from '../services/tmdb';
import { getMediaTypeLabel, getTvProgress, getWatchStatus, getWatchStatusLabel, isTvShow } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/MovieCard.css';

const MovieCard = ({ movie }) => {
  const { advanceEpisode, deleteMovie, setReaction, setWatchStatus, toggleFavorite, toggleWatched } = useMovies();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(null);
  const [trailerKey, setTrailerKey] = useState(movie.trailerKey || null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const docId = movie.docId || movie.id;
  const tvShow = isTvShow(movie);
  const mediaLabel = getMediaTypeLabel(movie);
  const watchStatus = getWatchStatus(movie);
  const statusLabel = getWatchStatusLabel(movie);
  const tvProgress = tvShow ? getTvProgress(movie) : null;
  const completedTvShow = tvShow && watchStatus === 'completed';
  const tvWatchButtonLabel = watchStatus === 'watching'
    ? 'Devam ediyorum'
    : watchStatus === 'completed'
      ? 'Tamamladım'
      : 'Devam Et';

  const stopAction = (event) => event.stopPropagation();

  const rating = Number(movie.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
  const yearLabel = movie.year && movie.year !== 'N/A' ? movie.year : null;
  const overview = movie.overview
    ? (movie.overview.length > 120 ? `${movie.overview.slice(0, 120).trim()}…` : movie.overview)
    : null;

  const openDetails = () => {
    setDetailsOpen(true);
  };

  const handleDelete = () => {
    if (window.confirm(`"${movie.title}" silinsin mi?`)) {
      deleteMovie(docId);
    }
  };

  const openTrailer = async (event) => {
    stopAction(event);
    setTrailerOpen(true);
    setTrailerError(null);

    if (!trailerKey) {
      setTrailerLoading(true);
      try {
        const key = await getMediaTrailer(movie.id, movie.mediaType);
        if (!key) {
          setTrailerError(`Bu ${mediaLabel.toLowerCase()} için fragman bulunamadı.`);
          return;
        }
        setTrailerKey(key);
      } catch {
        setTrailerError('Fragman yüklenemedi.');
      } finally {
        setTrailerLoading(false);
      }
    }
  };

  const closeTrailer = () => {
    setTrailerOpen(false);
  };

  useEffect(() => {
    if (!trailerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeTrailer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trailerOpen]);

  return (
    <>
      <article
        className={`movie-card ${movie.watched ? 'is-watched' : ''} ${movie.favorite ? 'is-favorite' : ''} ${tvShow ? 'is-tv-show' : 'is-movie'}`}
      >
        <div className="card-poster-wrap">
          {movie.poster ? (
            <img src={movie.poster} alt="" className="card-poster" loading="lazy" />
          ) : (
            <div className="card-poster-placeholder" aria-hidden="true">
              <span>{mediaLabel}</span>
            </div>
          )}

          <div className="card-poster-shade" aria-hidden="true" />

          <div className="card-badges" aria-hidden="true">
            {ratingLabel ? (
              <span className="card-badge card-rating">
                <span className="card-rating-star">★</span>
                {ratingLabel}
              </span>
            ) : (
              <span className="card-badge card-rating card-rating-empty">—</span>
            )}
            <div className="card-badge-group">
              <span className="card-badge card-type">{mediaLabel}</span>
              <span className={`card-badge card-status ${watchStatus}`}>{statusLabel}</span>
            </div>
          </div>

          {movie.favorite && (
            <span className="card-favorite-mark" aria-label="Favori">
              <Heart size={14} fill="currentColor" aria-hidden="true" />
            </span>
          )}

          {tvShow && (
            <div className="card-tv-chip" aria-label={`Sezon ${movie.currentSeason || 1}, Bölüm ${movie.currentEpisode || 1}`}>
              <span>S{movie.currentSeason || 1} · B{movie.currentEpisode || 1}</span>
              <span className="card-tv-progress-meter" aria-hidden="true">
                <i style={{ width: `${tvProgress.progressPercent}%` }} />
              </span>
            </div>
          )}

          <div className="card-hover-panel" aria-label={`${movie.title} hızlı işlemler`}>
            {overview && <p className="card-hover-overview">{overview}</p>}

            {movie.watched && !tvShow && (
              <div className="card-hover-reactions" aria-label="Film beğenisi">
                <button
                  className={movie.reaction === 'liked' ? 'card-icon-btn active liked' : 'card-icon-btn'}
                  type="button"
                  title="Beğendim"
                  aria-label="Beğendim"
                  onClick={event => {
                    stopAction(event);
                    setReaction(docId, 'liked');
                  }}
                >
                  <ThumbsUp size={16} aria-hidden="true" />
                </button>
                <button
                  className={movie.reaction === 'disliked' ? 'card-icon-btn active disliked' : 'card-icon-btn'}
                  type="button"
                  title="Beğenmedim"
                  aria-label="Beğenmedim"
                  onClick={event => {
                    stopAction(event);
                    setReaction(docId, 'disliked');
                  }}
                >
                  <ThumbsDown size={16} aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="card-hover-actions">
              <button
                className="card-icon-btn"
                type="button"
                title="Fragman"
                aria-label="Fragmanı izle"
                disabled={trailerLoading}
                onClick={openTrailer}
              >
                <Play size={16} aria-hidden="true" />
              </button>
              <button
                className={`card-icon-btn ${movie.favorite ? 'active favorite' : ''}`}
                type="button"
                title={movie.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                aria-label={movie.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                onClick={event => {
                  stopAction(event);
                  toggleFavorite(docId, movie.favorite || false);
                }}
              >
                <Heart size={16} aria-hidden="true" />
              </button>
              <button
                className={`card-icon-btn ${movie.watched || watchStatus === 'watching' ? 'active watch' : ''}`}
                type="button"
                title={tvShow ? tvWatchButtonLabel : (movie.watched ? 'İzlendi' : 'İzledim')}
                aria-label={tvShow ? tvWatchButtonLabel : (movie.watched ? 'İzlendi' : 'İzledim')}
                onClick={event => {
                  stopAction(event);
                  if (tvShow) {
                    setWatchStatus(docId, watchStatus === 'watching' ? 'watchlist' : 'watching');
                    return;
                  }
                  toggleWatched(docId, movie.watched);
                }}
              >
                <Check size={16} aria-hidden="true" />
              </button>
              {tvShow && (
                <button
                  className="card-icon-btn"
                  type="button"
                  title={completedTvShow ? 'Tamamlandı' : 'Sonraki bölüm'}
                  aria-label={completedTvShow ? 'Tamamlandı' : 'Sonraki bölüm'}
                  disabled={completedTvShow}
                  onClick={event => {
                    stopAction(event);
                    if (completedTvShow) return;
                    advanceEpisode(docId);
                  }}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              )}
              <button
                className="card-icon-btn"
                type="button"
                title="Detayları aç"
                aria-label="Detayları aç"
                onClick={event => {
                  stopAction(event);
                  openDetails();
                }}
              >
                <Info size={16} aria-hidden="true" />
              </button>
              <button
                className="card-icon-btn danger"
                type="button"
                title="Sil"
                aria-label="Listeden sil"
                onClick={event => {
                  stopAction(event);
                  handleDelete();
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <button
          className="card-footer"
          type="button"
          onClick={openDetails}
          aria-label={`${movie.title} detaylarını aç`}
        >
          <span className="card-title" title={movie.title}>{movie.title}</span>
          {(yearLabel || tvShow) && (
            <span className="card-footer-meta">
              {yearLabel && <em>{yearLabel}</em>}
              {tvShow && <span>%{tvProgress.progressPercent}</span>}
            </span>
          )}
        </button>
      </article>

      {trailerOpen && createPortal(
        <div className="movie-trailer-layer" role="dialog" aria-modal="true" aria-label={`${movie.title} fragman`}>
          <button className="movie-trailer-backdrop" type="button" onClick={closeTrailer} aria-label="Fragmanı kapat" />
          <section className="movie-trailer-modal">
            <div className="movie-trailer-topbar">
              <div className="movie-trailer-heading">
                <span>Fragmanı Oynat</span>
              </div>
              <button className="movie-trailer-close" type="button" onClick={closeTrailer} aria-label="Kapat">
                ×
              </button>
            </div>

            <div className="movie-trailer-player">
              {trailerLoading ? (
                <div className="trailer-loading">Fragman yükleniyor...</div>
              ) : trailerError ? (
                <div className="trailer-error">{trailerError}</div>
              ) : trailerKey ? (
                <iframe
                  className="movie-trailer-iframe"
                  title={`${movie.title} fragman`}
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <div className="trailer-error">Bu {mediaLabel.toLowerCase()} için fragman bulunamadı.</div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
      {detailsOpen && <MovieDetailsModal movie={movie} onClose={() => setDetailsOpen(false)} />}
    </>
  );
};

export default MovieCard;
