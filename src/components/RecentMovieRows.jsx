import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMovies } from '../context/MovieContext';
import { getMediaKey, getMediaTypeLabel } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/RecentMovieRows.css';

const RecentMovieRows = () => {
  const { loading, movies, recentFavoriteMovies, recentWatchedMovies } = useMovies();
  const navigate = useNavigate();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const isInitialLoading = loading && movies.length === 0;

  return (
    <section className="recent-section" aria-label="Son film hareketleri">
      <RecentMovieRow
        title="Son İzlediklerin"
        description="Son izlediğin yapımlar"
        movies={isInitialLoading ? [] : recentWatchedMovies}
        emptyMessage={
          isInitialLoading
            ? 'İzlenen kayıtlar yükleniyor...'
            : 'Henüz izlediğin içerik yok.'
        }
        viewAllLabel="Tümünü Gör"
        onViewAll={() => navigate('/watched')}
        onSelect={setSelectedMovie}
      />

      {recentFavoriteMovies.length > 0 && (
        <RecentMovieRow
          title="Son Favorilerin"
          description="Son favorilediğin yapımlar"
          movies={recentFavoriteMovies}
          viewAllLabel="Listeme Git"
          onViewAll={() => navigate('/', { state: { scrollToMyList: true } })}
          onSelect={setSelectedMovie}
        />
      )}

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </section>
  );
};

const RecentMovieRow = ({
  title,
  description,
  movies,
  emptyMessage = '',
  viewAllLabel,
  onViewAll,
  onSelect,
}) => {
  const stripRef = useRef(null);

  const scrollStrip = (direction) => {
    const strip = stripRef.current;
    if (!strip) return;

    const scrollAmount = Math.max(strip.clientWidth * 0.75, 200);
    strip.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="recent-row">
      <div className="recent-row-head">
        <div className="recent-row-titles">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="recent-row-actions">
          {movies.length > 0 && (
            <span className="recent-count">{movies.length}</span>
          )}
          {movies.length > 0 && viewAllLabel && onViewAll && (
            <button className="recent-view-all" type="button" onClick={onViewAll}>
              {viewAllLabel}
            </button>
          )}
          {movies.length > 0 && (
            <div className="recent-scroll-controls" aria-label={`${title} kaydırma`}>
              <button type="button" onClick={() => scrollStrip('left')} aria-label="Sola kaydır">
                <span className="recent-chevron left" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollStrip('right')} aria-label="Sağa kaydır">
                <span className="recent-chevron right" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {movies.length > 0 ? (
        <div className="recent-vitrine-strip" ref={stripRef}>
          {movies.map(movie => (
            <RecentMovieCard
              key={movie.docId || getMediaKey(movie)}
              movie={movie}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="recent-empty-state" role="status">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

const RecentMovieCard = ({ movie, onSelect }) => {
  const mediaLabel = getMediaTypeLabel(movie);
  const genre = movie.genres?.find(Boolean);
  const year = movie.year && movie.year !== 'N/A' ? movie.year : null;
  const metaLine = [year, genre || mediaLabel].filter(Boolean).join(' · ');

  return (
    <button
      className="recent-vitrine-card"
      type="button"
      onClick={() => onSelect(movie)}
      aria-label={`${movie.title} detaylarını aç`}
    >
      <span className="recent-vitrine-poster">
        {movie.poster ? (
          <img src={movie.poster} alt="" loading="lazy" />
        ) : (
          <span className="recent-vitrine-placeholder">{mediaLabel}</span>
        )}
        <span className="recent-vitrine-type">{mediaLabel}</span>
      </span>
      <span className="recent-vitrine-copy">
        <strong title={movie.title}>{movie.title}</strong>
        {metaLine && <span>{metaLine}</span>}
      </span>
    </button>
  );
};

export default RecentMovieRows;
