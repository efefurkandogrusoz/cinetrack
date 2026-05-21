import { useEffect, useState } from 'react';
import { Save, Search, X } from 'lucide-react';
import {
  saveHomepageConfig,
  subscribeHomepageConfig,
} from '../../services/adminService';
import { searchMedia } from '../../services/tmdb';

const homepageSlots = [
  { key: 'dailyMovie', label: 'Günün filmi' },
  { key: 'weeklyMovie', label: 'Haftanın filmi' },
  { key: 'editorChoice', label: 'Editörün seçimi' },
  { key: 'featuredShow', label: 'Öne çıkan dizi' },
  { key: 'popularSuggestion', label: 'Popüler öneri' },
];

const getPosterUrl = (movie) => {
  if (movie?.poster) return movie.poster;
  const posterPath = movie?.posterPath || movie?.poster_path;
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : '';
};

const serializeMedia = (movie) => {
  const mediaType = movie.mediaType || movie.media_type || 'movie';
  const movieId = String(movie.id || movie.movieId || movie.mediaId);

  return {
    movieId,
    mediaId: movieId,
    title: movie.title || movie.name || 'İsimsiz',
    mediaType,
    poster: movie.poster || null,
    posterPath: movie.posterPath || movie.poster_path || null,
    poster_path: movie.poster_path || movie.posterPath || null,
    backdrop: movie.backdrop || null,
    backdropPath: movie.backdropPath || movie.backdrop_path || null,
    year: movie.year || 'N/A',
  };
};

const AdminHomeSettings = () => {
  const [config, setConfig] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(homepageSlots[0].key);
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeHomepageConfig(
      (nextConfig) => {
        setConfig(nextConfig);
        setLoading(false);
      },
      (loadError) => {
        console.error('Homepage config could not be loaded:', loadError);
        setError('Ana sayfa ayarları yüklenemedi.');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const search = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError('');
    try {
      setSearchResults(await searchMedia(query, mediaType));
    } catch (searchError) {
      console.error('Homepage media search failed:', searchError);
      setError('Film araması yapılamadı.');
    } finally {
      setSearching(false);
    }
  };

  const setSlotMovie = async (slotKey, movie) => {
    setSavingSlot(slotKey);
    setError('');
    try {
      await saveHomepageConfig({
        [slotKey]: serializeMedia(movie),
      });
    } catch (saveError) {
      console.error('Homepage config could not be saved:', saveError);
      setError('Ana sayfa alanı kaydedilemedi.');
    } finally {
      setSavingSlot('');
    }
  };

  const clearSlot = async (slotKey) => {
    setSavingSlot(slotKey);
    setError('');
    try {
      await saveHomepageConfig({ [slotKey]: null });
    } catch (clearError) {
      console.error('Homepage slot could not be cleared:', clearError);
      setError('Alan temizlenemedi.');
    } finally {
      setSavingSlot('');
    }
  };

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <div>
          <p className="eyebrow">Ana Sayfa</p>
          <h2>Öne çıkan alanlar</h2>
        </div>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <div className="admin-grid-two">
        <section className="admin-panel-card">
          <h3>Alanlar</h3>
          {loading ? (
            <p className="admin-empty">Ayarlar yükleniyor...</p>
          ) : (
            <div className="admin-home-slot-list">
              {homepageSlots.map(slot => {
                const movie = config[slot.key];

                return (
                  <article className={selectedSlot === slot.key ? 'admin-home-slot active' : 'admin-home-slot'} key={slot.key}>
                    <button type="button" onClick={() => setSelectedSlot(slot.key)}>
                      <span className="admin-media-poster small">
                        {getPosterUrl(movie) ? <img src={getPosterUrl(movie)} alt={movie.title} /> : 'Boş'}
                      </span>
                      <span>
                        <strong>{slot.label}</strong>
                        <small>{movie?.title || 'Henüz seçilmedi'}</small>
                      </span>
                    </button>
                    {movie && (
                      <button type="button" onClick={() => clearSlot(slot.key)} disabled={savingSlot === slot.key}>
                        <X size={15} aria-hidden="true" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="admin-panel-card">
          <h3>Film seç</h3>
          <form className="admin-search-row stacked" onSubmit={search}>
            <select value={selectedSlot} onChange={event => setSelectedSlot(event.target.value)}>
              {homepageSlots.map(slot => (
                <option key={slot.key} value={slot.key}>{slot.label}</option>
              ))}
            </select>
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

          {searchResults.length > 0 && (
            <div className="admin-media-grid compact">
              {searchResults.map(movie => (
                <article className="admin-media-card" key={`${movie.mediaType}:${movie.id}`}>
                  <span className="admin-media-poster">
                    {getPosterUrl(movie) ? <img src={getPosterUrl(movie)} alt={movie.title} /> : 'Poster yok'}
                  </span>
                  <strong>{movie.title}</strong>
                  <small>{movie.mediaType === 'tv' ? 'Dizi' : 'Film'} · {movie.year}</small>
                  <button type="button" onClick={() => setSlotMovie(selectedSlot, movie)} disabled={savingSlot === selectedSlot}>
                    <Save size={15} aria-hidden="true" />
                    Bu alana ata
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminHomeSettings;
