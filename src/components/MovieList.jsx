import React from 'react';
import MovieCard from './MovieCard';
import { useMovies } from '../context/MovieContext';
import '../styles/components/MovieList.css';

const MovieList = ({ movies = null }) => {
  const { filteredMovies, loading } = useMovies();
  const moviesToDisplay = movies !== null ? movies : filteredMovies;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yukleniyor...</span>
        </div>
        <p className="mt-3">Filmler yukleniyor...</p>
      </div>
    );
  }

  if (moviesToDisplay.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CT</div>
        <h4>Film Bulunamadi</h4>
        <p>Film listesi bos. Yeni filmler eklemek icin arama yapin.</p>
      </div>
    );
  }

  return (
    <div className="movie-list-container">
      <div className="movie-stats">
        <span className="stats-item">Toplam <strong>{moviesToDisplay.length}</strong></span>
        <span className="stats-item">Izlendi <strong>{moviesToDisplay.filter(movie => movie.watched).length}</strong></span>
        <span className="stats-item">Favori <strong>{moviesToDisplay.filter(movie => movie.favorite).length}</strong></span>
        <span className="stats-item">Begendim <strong>{moviesToDisplay.filter(movie => movie.reaction === 'liked').length}</strong></span>
      </div>

      <div className="movie-grid">
        {moviesToDisplay.map((movie) => (
          <div key={movie.docId || movie.id} className="movie-grid-item">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieList;
