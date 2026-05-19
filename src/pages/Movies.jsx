import { useEffect, useMemo, useState } from 'react';
import MovieDetailsModal from '../components/MovieDetailsModal';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import { ALL_GENRE_MAP, getMovieCatalog } from '../services/tmdb';
import { getMediaKey, getMediaTypeLabel } from '../utils/media';
import '../styles/pages/pages.css';

const sortOptions = [
  { id: 'popularity.desc', label: 'Popüler' },
  { id: 'primary_release_date.desc', label: 'Yeni Çıkanlar' },
  { id: 'vote_average.desc', label: 'Yüksek Puan' },
];

const mediaOptions = [
  { id: 'all', label: 'Tümü' },
  { id: 'movie', label: 'Filmler' },
  { id: 'tv', label: 'Diziler' },
];

const genreOptions = [
  { id: 'all', label: 'Tüm kategoriler' },
  ...Object.entries(ALL_GENRE_MAP)
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr')),
];

const mergeMovies = (currentMovies, nextMovies) => {
  const seen = new Set(currentMovies.map(getMediaKey));
  return [
    ...currentMovies,
    ...nextMovies.filter(movie => {
      const key = getMediaKey(movie);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
};

const Movies = () => {
  const { addMovie, movies } = useMovies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedMediaType, setSelectedMediaType] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popularity.desc');
  const [catalogRequest, setCatalogRequest] = useState({
    query: '',
    genreId: 'all',
    mediaType: 'all',
    sortBy: 'popularity.desc',
    page: 1,
  });
  const [catalogMovies, setCatalogMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);

  const existingIds = useMemo(() => new Set(movies.map(getMediaKey)), [movies]);
  const filtersActive = searchTerm.trim() !== '' || selectedGenre !== 'all' || selectedMediaType !== 'all' || selectedSort !== 'popularity.desc';
  const hasMore = catalogRequest.page < totalPages;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCatalogRequest({
        query: searchTerm.trim(),
        genreId: selectedGenre,
        mediaType: selectedMediaType,
        sortBy: selectedSort,
        page: 1,
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchTerm, selectedGenre, selectedMediaType, selectedSort]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      getMovieCatalog(catalogRequest)
        .then(({ results, totalPages: nextTotalPages }) => {
          if (cancelled) return;

          setCatalogMovies(currentMovies => (
            catalogRequest.page === 1 ? results : mergeMovies(currentMovies, results)
          ));
          setTotalPages(nextTotalPages);
        })
        .catch(() => {
          if (!cancelled) setError('Filmler yüklenemedi.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [catalogRequest]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGenre('all');
    setSelectedMediaType('all');
    setSelectedSort('popularity.desc');
  };

  const loadMore = () => {
    setCatalogRequest(current => ({
      ...current,
      page: Math.min(current.page + 1, totalPages),
    }));
  };

  const handleAddMovie = (event, movie) => {
    event.stopPropagation();
    addMovie(movie);
  };

  const handleCardKeyDown = (event, movie) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedMovie(movie);
    }
  };

  return (
    <div className="page-container movies-page">
      <Navbar />
      <div className="page-content">
        <main className="container-fluid movies-page-shell">
          <section className="page-header movies-page-header">
            <p className="eyebrow">Film & Dizi</p>
            <h2>API Film & Dizi Kataloğu</h2>
            <p>TMDB kataloğundaki filmleri ve dizileri ara, filtrele ve listene ekle.</p>
          </section>

          <section className="movies-toolbar" aria-label="Film ve dizi arama ve filtreleme">
            <label className="movies-search-field">
              <span>Arama</span>
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="API'de film veya dizi adı ara"
              />
            </label>

            <label className="filter-field movies-genre-field">
              <span>Tür</span>
              <select value={selectedMediaType} onChange={event => setSelectedMediaType(event.target.value)}>
                {mediaOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="filter-field movies-genre-field">
              <span>Kategori</span>
              <select value={selectedGenre} onChange={event => setSelectedGenre(event.target.value)}>
                {genreOptions.map(genre => (
                  <option key={genre.id} value={genre.id}>{genre.label}</option>
                ))}
              </select>
            </label>

            <label className="filter-field movies-genre-field">
              <span>Sıralama</span>
              <select
                value={selectedSort}
                onChange={event => setSelectedSort(event.target.value)}
                disabled={searchTerm.trim() !== ''}
              >
                {sortOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            {filtersActive && (
              <button className="filter-reset" type="button" onClick={resetFilters}>
                Sıfırla
              </button>
            )}
          </section>

          <div className="movie-stats">
            <span className="stats-item">Gösterilen <strong>{catalogMovies.length}</strong></span>
            <span className="stats-item">Sayfa <strong>{catalogRequest.page}</strong></span>
            <span className="stats-item">Listende <strong>{movies.length}</strong></span>
          </div>

          {error && <p className="movies-error">{error}</p>}

          {catalogMovies.length === 0 && loading ? (
            <div className="loading-container">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Yükleniyor...</span>
              </div>
              <p className="mt-3">API kayıtları yükleniyor...</p>
            </div>
          ) : catalogMovies.length === 0 ? (
            <div className="filter-empty-state">
              <h4>Kayıt bulunamadı</h4>
              <p>Arama metnini veya filtreleri değiştirerek tekrar deneyin.</p>
              <button type="button" onClick={resetFilters}>Filtreleri sıfırla</button>
            </div>
          ) : (
            <>
              <div className="api-movie-grid">
                {catalogMovies.map(movie => (
                  <article
                    className="api-movie-card"
                    key={getMediaKey(movie)}
                    onClick={() => setSelectedMovie(movie)}
                    onKeyDown={event => handleCardKeyDown(event, movie)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${movie.title} detaylarını aç`}
                  >
                    <div className="api-movie-poster">
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} />
                      ) : (
                        <span>Poster Yok</span>
                      )}
                      {movie.rating > 0 && <strong>{movie.rating.toFixed(1)}</strong>}
                      <em>{getMediaTypeLabel(movie)}</em>
                    </div>

                    <div className="api-movie-copy">
                      <div className="api-movie-title-line">
                        <h3>{movie.title}</h3>
                        <span>{movie.year}</span>
                      </div>

                      {movie.genres.length > 0 && (
                        <div className="recommendation-genres">
                          {movie.genres.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}
                        </div>
                      )}

                      <p>{movie.overview || `Bu ${getMediaTypeLabel(movie).toLowerCase()} için açıklama bulunamadı.`}</p>

                      <button
                        type="button"
                        disabled={existingIds.has(getMediaKey(movie))}
                        onClick={event => handleAddMovie(event, movie)}
                      >
                        {existingIds.has(getMediaKey(movie)) ? 'Listede' : 'Listeye Ekle'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="movies-load-more">
                <button type="button" onClick={loadMore} disabled={!hasMore || loading}>
                  {loading ? 'Yükleniyor' : hasMore ? 'Daha Fazla Yükle' : 'Tüm sonuçlar yüklendi'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Movies;
