import { useState } from 'react';
import { useMovies } from '../context/MovieContext';
import { getMediaKey, getMediaTypeLabel } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/RecentMovieRows.css';

const RecentMovieRows = () => {
  const { loading, movies, recentFavoriteMovies, recentWatchedMovies } = useMovies();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const isInitialLoading = loading && movies.length === 0;

  return (
    <section className="recent-section" aria-label="Son film hareketleri">
      <RecentMovieRow
        title="Son İzlediklerin"
        description="En son izlediğin film ve diziler burada görünür."
        movies={isInitialLoading ? [] : recentWatchedMovies}
        emptyMessage={
          isInitialLoading
            ? 'İzlenen kayıtlar yükleniyor...'
            : 'Henüz izlediğin film veya dizi yok. Keşfetmeye başlayarak izlediklerini burada görebilirsin.'
        }
        onSelect={setSelectedMovie}
      />

      {recentFavoriteMovies.length > 0 && (
        <RecentMovieRow
          title="Son Favorilerin"
          description="En son favorilerine eklediğin film ve diziler burada görünür."
          movies={recentFavoriteMovies}
          onSelect={setSelectedMovie}
        />
      )}

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </section>
  );
};

const RecentMovieRow = ({ title, description, movies, emptyMessage = '', onSelect }) => (
  <div className="recent-row">
    <div className="recent-row-head">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {movies.length > 0 && <span>{movies.length} kayıt</span>}
    </div>

    {movies.length > 0 ? (
      <div className="recent-movie-grid">
        {movies.map(movie => (
          <RecentMovieCard key={movie.docId || getMediaKey(movie)} movie={movie} onSelect={onSelect} />
        ))}
      </div>
    ) : (
      <div className="recent-empty-state" role="status">
        <p>{emptyMessage}</p>
      </div>
    )}
  </div>
);

const RecentMovieCard = ({ movie, onSelect }) => {
  const rating = Number(movie.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '-';
  const genre = movie.genres?.find(Boolean);
  const year = movie.year && movie.year !== 'N/A' ? movie.year : 'Yıl yok';

  return (
    <button
      className="recent-movie-card"
      type="button"
      onClick={() => onSelect(movie)}
      aria-label={`${movie.title} detaylarını aç`}
    >
      <span className="recent-poster-wrap">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} />
        ) : (
          <span className="recent-poster-placeholder">Poster Yok</span>
        )}
        <span className="recent-rating">TMDB {ratingLabel}</span>
        <span className="recent-media-type">{getMediaTypeLabel(movie)}</span>
      </span>

      <span className="recent-movie-copy">
        <strong title={movie.title}>{movie.title}</strong>
        <span className="recent-movie-meta">
          <span>{year}</span>
          {genre && <span>{genre}</span>}
        </span>
      </span>
    </button>
  );
};

export default RecentMovieRows;
