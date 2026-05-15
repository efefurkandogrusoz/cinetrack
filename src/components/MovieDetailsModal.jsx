import React, { useEffect, useMemo, useState } from 'react';
import { getMovieFullDetails } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import '../styles/components/MovieDetailsModal.css';

const MovieDetailsModal = ({ movie, onClose }) => {
  const { addMovie, movies, setReaction, toggleFavorite, toggleWatched } = useMovies();
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);

  const listedMovie = useMemo(
    () => movies.find(item => item.id === movie.id),
    [movies, movie.id]
  );

  const activeMovie = listedMovie || details || movie;
  const docId = activeMovie?.docId || activeMovie?.id;

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      getMovieFullDetails(movie.id)
        .then(fullDetails => {
          if (!cancelled && fullDetails) {
            setDetails({ ...movie, ...fullDetails });
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [movie]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const addToList = async (overrides = {}) => {
    await addMovie({ ...details, ...overrides });
  };

  const handleWatch = async () => {
    if (listedMovie) {
      await toggleWatched(docId, listedMovie.watched);
      return;
    }

    await addToList({ watched: true });
  };

  const handleFavorite = async () => {
    if (listedMovie) {
      await toggleFavorite(docId, listedMovie.favorite || false);
      return;
    }

    await addToList({ favorite: true });
  };

  const handleLike = async () => {
    if (listedMovie) {
      await setReaction(docId, 'liked');
      return;
    }

    await addToList({ watched: true, reaction: 'liked' });
  };

  const backdrop = details?.backdrop || details?.poster;

  return (
    <div className="movie-modal-layer" role="dialog" aria-modal="true" aria-label={`${activeMovie.title} detaylari`}>
      <button className="movie-modal-backdrop" type="button" onClick={onClose} aria-label="Detaylari kapat" />
      <section className="movie-modal">
        <button className="movie-modal-close" type="button" onClick={onClose} aria-label="Kapat">
          X
        </button>

        <div className="movie-modal-hero" style={backdrop ? { backgroundImage: `linear-gradient(90deg, #181818 0%, rgba(24, 24, 24, 0.82) 45%, rgba(24, 24, 24, 0.22)), url(${backdrop})` } : undefined}>
          <div className="movie-modal-copy">
            <p className="eyebrow">Film Detayi</p>
            <h2>{activeMovie.title}</h2>
            <div className="movie-modal-meta">
              <span>{activeMovie.year}</span>
              {details?.runtime && <span>{details.runtime} dk</span>}
              {activeMovie.rating > 0 && <span>{activeMovie.rating.toFixed(1)} puan</span>}
              {activeMovie.genres?.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}
            </div>
            <p>{activeMovie.overview || 'Bu film icin aciklama bulunamadi.'}</p>
            <div className="movie-modal-actions">
              <button type="button" onClick={() => addToList()}>
                {listedMovie ? 'Listede' : 'Listeye Ekle'}
              </button>
              <button type="button" onClick={handleWatch}>
                {listedMovie?.watched ? 'Izlendi' : 'Izle'}
              </button>
              <button type="button" onClick={handleLike}>
                {listedMovie?.reaction === 'liked' ? 'Begenildi' : 'Begen'}
              </button>
              <button type="button" onClick={handleFavorite}>
                {listedMovie?.favorite ? 'Favori' : 'Favorile'}
              </button>
            </div>
          </div>
        </div>

        <div className="movie-modal-body">
          <div className="movie-modal-poster">
            {activeMovie.poster && <img src={activeMovie.poster} alt={activeMovie.title} />}
          </div>

          <div className="movie-modal-panel">
            <h3>Fragman</h3>
            {loading ? (
              <p>Detaylar yukleniyor...</p>
            ) : details?.trailerKey ? (
              <iframe
                className="movie-modal-trailer"
                title={`${activeMovie.title} fragman`}
                src={`https://www.youtube.com/embed/${details.trailerKey}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Bu film icin fragman bulunamadi.</p>
            )}
          </div>

          <div className="movie-modal-panel cast-panel">
            <h3>Oyuncular</h3>
            {details?.cast?.length > 0 ? (
              <div className="cast-list">
                {details.cast.map(actor => (
                  <span key={actor.id}>
                    <strong>{actor.name}</strong>
                    <small>{actor.character}</small>
                  </span>
                ))}
              </div>
            ) : (
              <p>Oyuncu bilgisi bulunamadi.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MovieDetailsModal;
