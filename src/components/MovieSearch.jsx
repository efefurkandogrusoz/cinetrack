import React, { useEffect, useRef, useState } from 'react';
import { searchMovies } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/MovieSearch.css';

const MovieSearch = ({ autoFocus = false, onAdd = null }) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const inputRef = useRef(null);
  const { searchResults, setSearchResults, addMovie } = useMovies();

  useEffect(() => {
    if (!autoFocus) return undefined;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [autoFocus]);

  useEffect(() => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      const resetTimer = window.setTimeout(() => {
        setSearchResults([]);
        setSearching(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const results = await searchMovies(searchQuery);
      if (!cancelled) {
        setSearchResults(results);
        setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, setSearchResults]);

  const handleAddMovie = async (movie) => {
    await addMovie(movie);
    setQuery('');
    setSearchResults([]);
    onAdd?.();
  };

  const handleClear = () => {
    setQuery('');
    setSearchResults([]);
  };

  return (
    <div className="movie-search-container">
      <div className="search-box">
        <div className="search-input-wrap">
          <span className="search-prefix">Ara</span>
          <input
            ref={inputRef}
            type="search"
            className="form-control search-input"
            placeholder="Film adi yaz..."
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {searching && <span className="search-status">Araniyor</span>}
          {query && (
            <button className="clear-search" type="button" onClick={handleClear} aria-label="Aramayi temizle">
              X
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            <h6 className="results-title">{searchResults.length} sonuc bulundu</h6>
            <div className="results-grid">
              {searchResults.map((movie) => (
                <div
                  key={movie.id}
                  className="search-result-item"
                  onClick={() => setSelectedMovie(movie)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => {
                    if (event.key === 'Enter') setSelectedMovie(movie);
                  }}
                >
                  {movie.poster ? (
                    <img src={movie.poster} alt={movie.title} className="result-poster" />
                  ) : (
                    <div className="result-poster-placeholder">Poster Yok</div>
                  )}
                  <div className="result-info">
                    <h6 className="result-title">{movie.title}</h6>
                    <p className="result-year">{movie.year}</p>
                    {movie.genres?.length > 0 && (
                      <p className="result-genres">{movie.genres.slice(0, 2).join(', ')}</p>
                    )}
                    {movie.rating > 0 && (
                      <p className="result-rating">{movie.rating.toFixed(1)} IMDb</p>
                    )}
                    <button
                      className="btn btn-sm btn-primary mt-2 w-100"
                      onClick={event => {
                        event.stopPropagation();
                        handleAddMovie(movie);
                      }}
                    >
                      Listeye Ekle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {query.trim() && !searching && searchResults.length === 0 && (
          <div className="search-empty" role="status">
            Sonuc bulunamadi. Baska bir film adi deneyin.
          </div>
        )}
      </div>
      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default MovieSearch;
