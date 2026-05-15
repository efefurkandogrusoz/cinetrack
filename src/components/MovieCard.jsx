import React, { useState } from 'react';
import { useMovies } from '../context/MovieContext';
import { getMovieTrailer } from '../services/tmdb';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/MovieCard.css';

const MovieCard = ({ movie }) => {
  const { deleteMovie, setReaction, toggleFavorite, toggleWatched } = useMovies();
  const [hovered, setHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(movie.trailerKey || null);
  const [trailerChecked, setTrailerChecked] = useState(Boolean(movie.trailerKey));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const docId = movie.docId || movie.id;

  const stopAction = (event) => event.stopPropagation();

  const handleDelete = () => {
    if (window.confirm(`"${movie.title}" silinsin mi?`)) {
      deleteMovie(docId);
    }
  };

  const handleMouseEnter = async () => {
    setHovered(true);
    if (trailerChecked) return;

    setTrailerChecked(true);
    const key = await getMovieTrailer(movie.id);
    if (key) setTrailerKey(key);
  };

  return (
    <>
    <div
      className="movie-card"
      onClick={() => setDetailsOpen(true)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter') setDetailsOpen(true);
      }}
    >
      <div className="card-poster-container">
        {hovered && trailerKey ? (
          <iframe
            className="card-trailer"
            title={`${movie.title} fragman`}
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        ) : movie.poster ? (
          <img src={movie.poster} alt={movie.title} className="card-poster" />
        ) : (
          <div className="card-poster-placeholder">Poster Yok</div>
        )}

        <div className="card-gradient" />

        <div className="card-topline">
          {movie.rating > 0 && <span className="card-rating">{movie.rating.toFixed(1)}</span>}
          {movie.favorite && <span className="card-pill favorite">Favori</span>}
        </div>

        <div className="card-overlay">
          <div className="card-details">
            <h5>{movie.title}</h5>
            <p>{movie.year} {movie.genres?.length ? `- ${movie.genres.slice(0, 2).join(', ')}` : ''}</p>
            {movie.overview && <small>{movie.overview.substring(0, 120)}...</small>}
          </div>
          <div className="card-actions">
            <button
              className={`action-btn favorite-btn ${movie.favorite ? 'active' : ''}`}
              onClick={event => {
                stopAction(event);
                toggleFavorite(docId, movie.favorite || false);
              }}
              type="button"
              title="Favorilere ekle"
            >
              Favori
            </button>
            <button
              className={`action-btn watch-btn ${movie.watched ? 'active' : ''}`}
              onClick={event => {
                stopAction(event);
                toggleWatched(docId, movie.watched);
              }}
              type="button"
            >
              {movie.watched ? 'Izlendi' : 'Izlenecek'}
            </button>
            <button className="action-btn delete-btn" onClick={event => {
              stopAction(event);
              handleDelete();
            }} type="button">
              Sil
            </button>
          </div>
        </div>
      </div>

      <div className="card-info">
        <h5 className="card-title" title={movie.title}>{movie.title}</h5>
        <div className="card-meta">
          <span>{movie.year}</span>
          {movie.genres?.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}
        </div>

        {movie.watched && (
          <div className="reaction-row" aria-label="Film begenisi">
            <button
              className={movie.reaction === 'liked' ? 'reaction active liked' : 'reaction'}
              onClick={event => {
                stopAction(event);
                setReaction(docId, 'liked');
              }}
              type="button"
            >
              Begendim
            </button>
            <button
              className={movie.reaction === 'disliked' ? 'reaction active disliked' : 'reaction'}
              onClick={event => {
                stopAction(event);
                setReaction(docId, 'disliked');
              }}
              type="button"
            >
              Begenmedim
            </button>
          </div>
        )}
      </div>
    </div>
    {detailsOpen && <MovieDetailsModal movie={movie} onClose={() => setDetailsOpen(false)} />}
    </>
  );
};

export default MovieCard;
