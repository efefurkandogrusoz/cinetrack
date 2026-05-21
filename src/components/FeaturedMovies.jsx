import { useEffect, useMemo, useState } from 'react';
import MovieDetailsModal from './MovieDetailsModal';
import { loadPublicHomepageData } from '../services/adminService';

const homepageSlots = [
  { key: 'dailyMovie', label: 'Günün filmi' },
  { key: 'weeklyMovie', label: 'Haftanın filmi' },
  { key: 'editorChoice', label: 'Editörün seçimi' },
  { key: 'featuredShow', label: 'Öne çıkan dizi' },
  { key: 'popularSuggestion', label: 'Popüler öneri' },
];

const getImageUrl = (path, size = 'w500') => {
  if (!path) return '';
  if (String(path).startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

const normalizeHomepageMovie = (movie, label = '') => {
  if (!movie) return null;
  const mediaType = movie.mediaType || movie.media_type || 'movie';
  const posterPath = movie.posterPath || movie.poster_path;
  const backdropPath = movie.backdropPath || movie.backdrop_path;

  return {
    ...movie,
    id: movie.mediaId || movie.movieId || movie.id,
    mediaType,
    media_type: mediaType,
    title: movie.title || movie.name || 'İsimsiz',
    name: movie.title || movie.name || 'İsimsiz',
    poster: movie.poster || getImageUrl(posterPath),
    posterPath: posterPath || null,
    poster_path: posterPath || null,
    backdrop: movie.backdrop || getImageUrl(backdropPath, 'w1280'),
    backdropPath: backdropPath || null,
    backdrop_path: backdropPath || null,
    year: movie.year || 'N/A',
    homepageLabel: label,
  };
};

const FeaturedCard = ({ movie, large = false, onOpen }) => (
  <button className={large ? 'featured-card large' : 'featured-card'} type="button" onClick={() => onOpen(movie)}>
    <span className="featured-poster">
      {movie.poster ? <img src={movie.poster} alt={movie.title} /> : 'Poster yok'}
    </span>
    <span className="featured-copy">
      {movie.homepageLabel && <small>{movie.homepageLabel}</small>}
      <strong>{movie.title}</strong>
      <em>{movie.mediaType === 'tv' ? 'Dizi' : 'Film'} · {movie.year}</em>
    </span>
  </button>
);

const FeaturedMovies = () => {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [homepageConfig, setHomepageConfig] = useState({});
  const [selectedMovie, setSelectedMovie] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicHomepageData()
      .then((data) => {
        if (cancelled) return;
        setFeaturedMovies(data.featuredMovies || []);
        setHomepageConfig(data.homepageConfig || {});
      })
      .catch((error) => {
        console.warn('Homepage featured data could not be loaded:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const picks = useMemo(() => homepageSlots
    .map(slot => normalizeHomepageMovie(homepageConfig[slot.key], slot.label))
    .filter(Boolean), [homepageConfig]);

  const featured = useMemo(() => featuredMovies
    .filter(movie => movie.isActive !== false)
    .map(movie => normalizeHomepageMovie(movie))
    .filter(Boolean), [featuredMovies]);

  if (picks.length === 0 && featured.length === 0) {
    return null;
  }

  return (
    <section className="featured-home-section" aria-labelledby="featured-home-title">
      <div className="featured-home-head">
        <div>
          <p className="eyebrow">Admin seçkisi</p>
          <h3 id="featured-home-title">Haftanın Öne Çıkanları</h3>
        </div>
      </div>

      {picks.length > 0 && (
        <div className="homepage-picks-grid">
          {picks.map(movie => (
            <FeaturedCard
              key={`${movie.homepageLabel}:${movie.mediaType}:${movie.id}`}
              movie={movie}
              large
              onOpen={setSelectedMovie}
            />
          ))}
        </div>
      )}

      {featured.length > 0 && (
        <div className="featured-home-rail">
          {featured.map(movie => (
            <FeaturedCard
              key={`${movie.mediaType}:${movie.id}`}
              movie={movie}
              onOpen={setSelectedMovie}
            />
          ))}
        </div>
      )}

      {selectedMovie && (
        <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </section>
  );
};

export default FeaturedMovies;
