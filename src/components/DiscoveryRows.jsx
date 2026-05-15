import React, { useEffect, useState } from 'react';
import { getPopularMovies, getTopRatedMovies } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import '../styles/components/DiscoveryRows.css';

const DiscoveryRows = () => {
  const { addMovie, movies } = useMovies();
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const existingIds = new Set(movies.map(movie => movie.id));

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPopularMovies(), getTopRatedMovies()]).then(([popular, topRated]) => {
      if (!cancelled) {
        setPopularMovies(popular);
        setTopRatedMovies(topRated);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="discovery-section">
      <DiscoveryRow
        title="Begenebilecegin Filmler"
        subtitle="Yuksek puanli, izleme listene yakisacak secimler"
        movies={topRatedMovies}
        existingIds={existingIds}
        onAdd={addMovie}
      />
      <DiscoveryRow
        title="Onerilen Filmler"
        subtitle="TMDB'de one cikan populer filmler"
        movies={popularMovies}
        existingIds={existingIds}
        onAdd={addMovie}
      />
    </section>
  );
};

const DiscoveryRow = ({ title, subtitle, movies, existingIds, onAdd }) => {
  if (movies.length === 0) return null;

  return (
    <div className="discovery-row">
      <div className="discovery-row-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="discovery-strip">
        {movies.map(movie => (
          <article className="discovery-card" key={movie.id}>
            <img src={movie.poster} alt={movie.title} />
            <div className="discovery-card-info">
              <h4>{movie.title}</h4>
              <p>{movie.year} {movie.genres?.[0] ? `- ${movie.genres[0]}` : ''}</p>
              <button type="button" disabled={existingIds.has(movie.id)} onClick={() => onAdd(movie)}>
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
