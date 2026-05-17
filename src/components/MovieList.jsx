import React, { useMemo, useState } from 'react';
import MovieCard from './MovieCard';
import { useMovies } from '../context/MovieContext';
import '../styles/components/MovieList.css';

const MovieList = ({ movies = null, listId }) => {
  const { filteredMovies, loading } = useMovies();
  const sourceMovies = movies !== null ? movies : filteredMovies;
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const genreOptions = useMemo(() => {
    const genres = sourceMovies.flatMap(movie => movie.genres || []).filter(Boolean);
    return [...new Set(genres)].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [sourceMovies]);

  const activeGenre = selectedGenre === 'all' || genreOptions.includes(selectedGenre)
    ? selectedGenre
    : 'all';

  const moviesToDisplay = useMemo(() => {
    return sourceMovies.filter((movie) => {
      const matchesGenre = activeGenre === 'all' || movie.genres?.includes(activeGenre);
      const matchesFavorite = !favoriteOnly || movie.favorite;

      return matchesGenre && matchesFavorite;
    });
  }, [activeGenre, favoriteOnly, sourceMovies]);

  const filtersActive = activeGenre !== 'all' || favoriteOnly;

  const resetFilters = () => {
    setSelectedGenre('all');
    setFavoriteOnly(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
        <p className="mt-3">Filmler yükleniyor...</p>
      </div>
    );
  }

  if (sourceMovies.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">CT</div>
        <h4>Film Bulunamadı</h4>
        <p>Film listesi boş. Yeni filmler eklemek için arama yapın.</p>
      </div>
    );
  }

  return (
    <div id={listId} className="movie-list-container">
      <div className="movie-filter-panel" aria-label="Film filtreleri">
        <div className="movie-filter-title">
          <span>Filtrele</span>
          <strong>Listendeki filmler</strong>
        </div>

        <div className="movie-filter-controls">
          <label className="filter-field">
            <span>Kategori</span>
            <select
              value={activeGenre}
              onChange={event => setSelectedGenre(event.target.value)}
              disabled={genreOptions.length === 0}
            >
              <option value="all">Tüm kategoriler</option>
              {genreOptions.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </label>

          <button
            className={favoriteOnly ? 'filter-chip active' : 'filter-chip'}
            type="button"
            onClick={() => setFavoriteOnly(current => !current)}
            aria-pressed={favoriteOnly}
          >
            Favoriler
          </button>

          {filtersActive && (
            <button className="filter-reset" type="button" onClick={resetFilters}>
              Sıfırla
            </button>
          )}
        </div>
      </div>

      <div className="movie-stats">
        <span className="stats-item">Toplam <strong>{moviesToDisplay.length}</strong></span>
        <span className="stats-item">İzlendi <strong>{moviesToDisplay.filter(movie => movie.watched).length}</strong></span>
        <span className="stats-item">Favori <strong>{moviesToDisplay.filter(movie => movie.favorite).length}</strong></span>
        <span className="stats-item">Beğendim <strong>{moviesToDisplay.filter(movie => movie.reaction === 'liked').length}</strong></span>
      </div>

      {moviesToDisplay.length === 0 ? (
        <div className="filter-empty-state">
          <h4>Bu filtrelerle film bulunamadı</h4>
          <p>Kategori veya favori filtresini değiştirerek tekrar deneyin.</p>
          <button type="button" onClick={resetFilters}>Filtreleri sıfırla</button>
        </div>
      ) : (
        <div className="movie-grid">
          {moviesToDisplay.map((movie) => (
            <div key={movie.docId || movie.id} className="movie-grid-item">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovieList;
