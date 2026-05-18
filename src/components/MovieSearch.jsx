import React, { useEffect, useRef, useState } from 'react';
import { searchMedia } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import { getMediaKey, getMediaTypeLabel } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/MovieSearch.css';

const MovieSearch = ({ autoFocus = false, onAdd = null, compact = false }) => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [resultsVisible, setResultsVisible] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
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
        setResultsVisible(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const results = await searchMedia(searchQuery, mediaFilter);
      if (!cancelled) {
        setSearchResults(results);
        setResultsVisible(true);
        setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mediaFilter, query, setSearchResults]);

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

  const handleResultsClick = (e) => {
    if (e.target === e.currentTarget) {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handleDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSearchResults([]);
        setResultsVisible(false);
        setQuery('');
        setSearching(false);
      }
    };

    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [setSearchResults]);

  return (
    <div ref={containerRef} className={compact ? 'movie-search-container compact' : 'movie-search-container'}>
      <div className="search-box">
        <div className="search-media-toggle" aria-label="Arama türü">
          {[
            { id: 'movie', label: 'Film' },
            { id: 'tv', label: 'Dizi' },
            { id: 'all', label: 'Tümü' },
          ].map(option => (
            <button
              key={option.id}
              className={mediaFilter === option.id ? 'active' : ''}
              type="button"
              onClick={() => setMediaFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="search-input-wrap">
          {!compact && <span className="search-prefix">Ara</span>}
          <input
            ref={inputRef}
            type="search"
            className="form-control search-input"
            placeholder={compact ? 'Film veya dizi ara...' : 'Film ya da dizi adı yaz...'}
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          {searching && <span className="search-status">Aranıyor</span>}
        </div>

        {resultsVisible && searchResults.length > 0 && (
          <div className="search-results" onClick={handleResultsClick}>
            <h6 className="results-title">{searchResults.length} sonuç bulundu</h6>
            <div className="results-grid">
              {searchResults.map((movie) => (
                <div
                  key={getMediaKey(movie)}
                  className="search-result-item"
                  onClick={() => {
                    setSelectedMovie(movie);
                    setSearchResults([]);
                    setResultsVisible(false);
                  }}
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
                    <div className="result-title-line">
                      <h6 className="result-title">{movie.title}</h6>
                      <span>{getMediaTypeLabel(movie)}</span>
                    </div>
                    <p className="result-year">{movie.year}</p>
                    {movie.genres?.length > 0 && (
                      <p className="result-genres">{movie.genres.slice(0, 2).join(', ')}</p>
                    )}
                    {movie.rating > 0 && (
                      <p className="result-rating">{movie.rating.toFixed(1)} TMDB</p>
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
            Sonuç bulunamadı. Başka bir film adı deneyin.
          </div>
        )}
      </div>
      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default MovieSearch;
