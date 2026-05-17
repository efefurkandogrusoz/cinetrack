import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMovies } from '../context/MovieContext';
import { getMovieTrailer } from '../services/tmdb';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/MovieCard.css';

const MovieCard = ({ movie }) => {
  const { deleteMovie, setReaction, toggleFavorite, toggleWatched } = useMovies();
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(null);
  const [trailerKey, setTrailerKey] = useState(movie.trailerKey || null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const docId = movie.docId || movie.id;

  const stopAction = (event) => event.stopPropagation();

  const rating = Number(movie.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
  const metaItems = [movie.year, ...(movie.genres || []).slice(0, 2)].filter(Boolean);
  const overview =
    movie.overview && movie.overview.length > 132
      ? `${movie.overview.slice(0, 132).trim()}...`
      : movie.overview || 'Bu film için açıklama bulunamadı.';

  const openDetails = () => {
    setDetailsOpen(true);
  };

  const handleCardKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
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
        const key = await getMovieTrailer(movie.id);
        if (!key) {
          setTrailerError('Fragman bulunamadı.');
          return;
        }
        setTrailerKey(key);
      } catch (error) {
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
    <article className={`movie-card ${movie.watched ? 'is-watched has-reactions' : ''} ${movie.favorite ? 'is-favorite' : ''}`}>
      <div
        className="card-main"
        onClick={openDetails}
        role="button"
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        aria-label={`${movie.title} detaylarını aç`}
      >
        <div className="card-poster-container">
          {movie.poster ? (
            <img src={movie.poster} alt={movie.title} className="card-poster" />
          ) : (
            <div className="card-poster-placeholder">Poster Yok</div>
          )}

          <div className="card-gradient" />

          <div className="card-topline">
            {ratingLabel && (
              <span className="card-rating">
                <span aria-hidden="true">★</span>
                {ratingLabel}
              </span>
            )}
            <span className={`card-status ${movie.watched ? 'watched' : 'watchlist'}`}>
              {movie.watched ? 'İzlendi' : 'İzlenecek'}
            </span>
          </div>

          {movie.favorite && (
            <span className="card-favorite-badge" aria-label="Favori">
              ★
            </span>
          )}

          {movie.watched && (
            <div className="poster-reactions" aria-label="Film beğenisi">
              <button
                className={movie.reaction === 'liked' ? 'poster-reaction active liked' : 'poster-reaction'}
                onClick={event => {
                  stopAction(event);
                  setReaction(docId, 'liked');
                }}
                type="button"
              >
                Beğendim
              </button>
              <button
                className={movie.reaction === 'disliked' ? 'poster-reaction active disliked' : 'poster-reaction'}
                onClick={event => {
                  stopAction(event);
                  setReaction(docId, 'disliked');
                }}
                type="button"
              >
                Beğenmedim
              </button>
            </div>
          )}
        </div>

        <div className="card-info">
          <div className="card-heading">
            <h5 className="card-title" title={movie.title}>{movie.title}</h5>
            {movie.runtime && <span className="card-runtime">{movie.runtime} dk</span>}
          </div>

          {metaItems.length > 0 && (
            <div className="card-meta">
              {metaItems.map(item => <span key={item}>{item}</span>)}
            </div>
          )}

          <p className="card-description">{overview}</p>
        </div>
      </div>

      <div className="card-actions" aria-label={`${movie.title} işlemleri`}>
        <button
          className="action-btn trailer-btn"
          type="button"
          onClick={openTrailer}
          disabled={trailerLoading}
        >
          <span className="btn-icon" aria-hidden="true">▶</span>
          <span>{trailerLoading ? 'Yükleniyor' : 'Fragman'}</span>
        </button>
        <button
          className={`action-btn favorite-btn ${movie.favorite ? 'active' : ''}`}
          onClick={event => {
            stopAction(event);
            toggleFavorite(docId, movie.favorite || false);
          }}
          type="button"
          title={movie.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <span className="btn-icon" aria-hidden="true">★</span>
          <span>Favori</span>
        </button>
        <button
          className={`action-btn watch-btn ${movie.watched ? 'active' : ''}`}
          onClick={event => {
            stopAction(event);
            toggleWatched(docId, movie.watched);
          }}
          type="button"
        >
          <span className="btn-icon" aria-hidden="true">✓</span>
          <span>{movie.watched ? 'İzlendi' : 'İzle'}</span>
        </button>
        <button className="action-btn delete-btn" onClick={event => {
          stopAction(event);
          handleDelete();
        }} type="button">
          <span className="btn-icon" aria-hidden="true">×</span>
          <span>Sil</span>
        </button>
      </div>
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
                <div className="trailer-error">Fragman bulunamadı.</div>
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
