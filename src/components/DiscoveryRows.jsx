import React, { useEffect, useRef, useState } from 'react';
import { getDailyTrendingMovies, getWeeklyTrendingMovies } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/DiscoveryRows.css';

const DiscoveryRows = () => {
  const { addMovie, movies } = useMovies();
  const [dailyMovies, setDailyMovies] = useState([]);
  const [weeklyMovies, setWeeklyMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const existingIds = new Set(movies.map(movie => movie.id));

  useEffect(() => {
    let cancelled = false;

    Promise.all([getDailyTrendingMovies(), getWeeklyTrendingMovies()]).then(([daily, weekly]) => {
      if (!cancelled) {
        setDailyMovies(daily);
        setWeeklyMovies(weekly);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="discovery-section">
      <DiscoveryRow
        title="Haftanın Filmleri"
        subtitle="Bu hafta TMDB'de en çok ilgi gören filmler"
        movies={weeklyMovies}
        existingIds={existingIds}
        onAdd={addMovie}
        onSelect={setSelectedMovie}
      />
      <DiscoveryRow
        title="Günün Filmleri"
        subtitle="Bugün TMDB'de trend olan filmler ve hızlı ekleme kartları"
        movies={dailyMovies}
        existingIds={existingIds}
        onAdd={addMovie}
        onSelect={setSelectedMovie}
      />
      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </section>
  );
};

const DiscoveryRow = ({ title, subtitle, movies, existingIds, onAdd, onSelect }) => {
  const stripRef = useRef(null);

  if (movies.length === 0) return null;

  const scrollStrip = (direction) => {
    const strip = stripRef.current;
    if (!strip) return;

    const scrollAmount = Math.max(strip.clientWidth * 0.85, 280);
    strip.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="discovery-row">
      <div className="discovery-row-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="discovery-controls" aria-label={`${title} kaydirma kontrolleri`}>
          <button type="button" onClick={() => scrollStrip('left')} aria-label="Sola kaydır">
            <span className="chevron left" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => scrollStrip('right')} aria-label="Sağa kaydır">
            <span className="chevron right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="discovery-strip" ref={stripRef}>
        {movies.map(movie => (
          <article
            className="discovery-card"
            key={movie.id}
            onClick={() => onSelect(movie)}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter') onSelect(movie);
            }}
          >
            <img src={movie.poster} alt={movie.title} />
            <div className="discovery-card-info">
              <h4>{movie.title}</h4>
              <p>{movie.year} {movie.genres?.[0] ? `- ${movie.genres[0]}` : ''}</p>
              <button
                type="button"
                disabled={existingIds.has(movie.id)}
                onClick={event => {
                  event.stopPropagation();
                  onAdd(movie);
                }}
              >
                {existingIds.has(movie.id) ? 'Listede' : 'Listeye Ekle'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default DiscoveryRows;
