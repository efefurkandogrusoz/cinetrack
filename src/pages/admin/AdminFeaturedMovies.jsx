import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  deleteFeaturedMovie,
  saveFeaturedMovie,
  subscribeFeaturedMovies,
  updateFeaturedMovie,
} from '../../services/adminService';
import { searchMedia } from '../../services/tmdb';

const getPosterUrl = (movie) => {
  if (movie.poster) return movie.poster;
  const posterPath = movie.posterPath || movie.poster_path;
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : '';
};

const AdminFeaturedMovies = () => {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeFeaturedMovies(
      (nextMovies) => {
        setFeaturedMovies(nextMovies);
        setLoading(false);
      },
      () => {
        setError('Popüler filmler yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const existingKeys = useMemo(() => new Set(
    featuredMovies.map(movie => `${movie.mediaType || 'movie'}:${movie.movieId || movie.mediaId}`),
  ), [featuredMovies]);

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    try {
      setSearchResults(await searchMedia(query, mediaType));
    } catch {
      setError('Film araması yapılamadı.');
    } finally {
      setSearching(false);
    }
  };

  const addFeaturedMovie = async (movie) => {
    const key = `${movie.mediaType || movie.media_type || 'movie'}:${movie.id}`;
    if (existingKeys.has(key)) return;

    setBusyId(key);
    setError('');
    try {
      await saveFeaturedMovie(movie, {
        order: featuredMovies.length + 1,
        isActive: true,
      });
    } catch {
      setError('Film öne çıkanlara eklenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const updateFeatured = async (featuredId, updates) => {
    setBusyId(featuredId);
    setError('');
    try {
      await updateFeaturedMovie(featuredId, updates);
    } catch {
      setError('Öne çıkan film güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const removeFeatured = async (featuredId) => {
    if (!window.confirm('Bu filmi öne çıkanlardan kaldırmak istediğine emin misin?')) return;

    setBusyId(featuredId);
    setError('');
    try {
      await deleteFeaturedMovie(featuredId);
    } catch {
      setError('Film kaldırılamadı.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Ana Sayfa</p>
          <h2>Popüler Filmler</h2>
        </div>
        <span className="admin-count-pill">{featuredMovies.length}</span>
      </div>

      <form className="admin-search-row" onSubmit={search}>
        <label className="admin-search-field">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Film veya dizi ara"
            onChange={event => setQuery(event.target.value)}
          />
        </label>
        <select value={mediaType} onChange={event => setMediaType(event.target.value)}>
          <option value="all">Film + Dizi</option>
          <option value="movie">Film</option>
          <option value="tv">Dizi</option>
        </select>
        <button type="submit" disabled={searching}>
          {searching ? 'Aranıyor...' : 'Ara'}
        </button>
      </form>

      {error && <p className="admin-alert">{error}</p>}

      {searchResults.length > 0 && (
        <section className="admin-panel-card">
          <h3>Arama sonuçları</h3>
          <div className="admin-media-grid">
            {searchResults.map(movie => {
              const key = `${movie.mediaType || movie.media_type || 'movie'}:${movie.id}`;
              const exists = existingKeys.has(key);

              return (
                <article className="admin-media-card" key={key}>
                  <span className="admin-media-poster">
                    {getPosterUrl(movie) ? <img src={getPosterUrl(movie)} alt={movie.title} /> : 'Poster yok'}
                  </span>
                  <strong>{movie.title}</strong>
                  <small>{movie.mediaType === 'tv' ? 'Dizi' : 'Film'} · {movie.year}</small>
                  <button type="button" onClick={() => addFeaturedMovie(movie)} disabled={exists || busyId === key}>
                    <Plus size={15} aria-hidden="true" />
                    {exists ? 'Ekli' : 'Ekle'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="admin-panel-card">
        <h3>Öne çıkan liste</h3>
        {loading ? (
          <p className="admin-empty">Liste yükleniyor...</p>
        ) : featuredMovies.length === 0 ? (
          <p className="admin-empty">Henüz öne çıkan film eklenmedi.</p>
        ) : (
          <div className="admin-featured-list">
            {featuredMovies.map(movie => (
              <article className="admin-featured-row" key={movie.id}>
                <span className="admin-media-poster small">
                  {getPosterUrl(movie) ? <img src={getPosterUrl(movie)} alt={movie.title} /> : 'Poster yok'}
                </span>
                <div>
                  <strong>{movie.title}</strong>
                  <small>{movie.mediaType === 'tv' ? 'Dizi' : 'Film'} · {movie.year || 'N/A'}</small>
                </div>
                <label>
                  Sıra
                  <input
                    type="number"
                    min="1"
                    defaultValue={Number(movie.order) || 1}
                    onBlur={event => updateFeatured(movie.id, { order: Number(event.target.value) || 1 })}
                  />
                </label>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={movie.isActive !== false}
                    onChange={event => updateFeatured(movie.id, { isActive: event.target.checked })}
                  />
                  Aktif
                </label>
                <button type="button" onClick={() => removeFeatured(movie.id)} disabled={busyId === movie.id}>
                  <Trash2 size={15} aria-hidden="true" />
                  Kaldır
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminFeaturedMovies;
