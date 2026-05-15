import React, { useEffect, useMemo, useState } from 'react';
import { discoverMoviesByGenres, GENRE_MAP } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import '../styles/components/UserInsights.css';

const UserInsights = () => {
  const { addMovie, movies } = useMovies();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const analysis = useMemo(() => {
    const liked = movies.filter(movie => movie.reaction === 'liked');
    const disliked = movies.filter(movie => movie.reaction === 'disliked');
    const likedScores = new Map();
    const dislikedScores = new Map();

    liked.forEach(movie => {
      (movie.genre_ids || []).forEach(id => {
        likedScores.set(id, (likedScores.get(id) || 0) + 1);
      });
    });

    disliked.forEach(movie => {
      (movie.genre_ids || []).forEach(id => {
        dislikedScores.set(id, (dislikedScores.get(id) || 0) + 1);
      });
    });

    const rankedGenres = Array.from(likedScores.entries())
      .map(([id, count]) => ({
        id,
        count,
        penalty: dislikedScores.get(id) || 0,
        score: count - (dislikedScores.get(id) || 0) * 0.5,
        name: GENRE_MAP[id],
      }))
      .filter(genre => genre.name && genre.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      likedCount: liked.length,
      dislikedCount: disliked.length,
      topGenres: rankedGenres,
    };
  }, [movies]);

  useEffect(() => {
    const genreIds = analysis.topGenres.map(genre => genre.id);
    if (genreIds.length === 0) {
      const resetTimer = window.setTimeout(() => setRecommendations([]), 0);
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      discoverMoviesByGenres(genreIds, movies.map(movie => movie.id))
        .then(results => {
          if (!cancelled) setRecommendations(results);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [analysis.topGenres, movies]);

  if (movies.length === 0) return null;

  return (
    <section className="insights-section">
      <div className="insights-summary">
        <div>
          <p className="eyebrow">Zevk Analizi</p>
          <h3>Sana göre film profili</h3>
          <p>
            İzlediğin filmlerde Beğendim/Beğenmedim seçildikçe favori türlerin ve öneriler
            otomatik güncellenir.
          </p>
        </div>

        <div className="insight-metrics">
          <span><strong>{analysis.likedCount}</strong> beğeni</span>
          <span><strong>{analysis.dislikedCount}</strong> beğenmeme</span>
        </div>
      </div>

      {analysis.topGenres.length > 0 ? (
        <div className="genre-row">
          {analysis.topGenres.map(genre => (
            <span className="genre-chip" key={genre.id}>
              {genre.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="insight-empty">Analiz için izlediğin filmlerden birkaç tanesine Beğendim seç.</p>
      )}

      {(loading || recommendations.length > 0) && (
        <div className="recommendation-block">
          <div className="recommendation-head">
            <h4>Önerilen Filmler</h4>
            {loading && <span>Yükleniyor</span>}
          </div>
          <div className="recommendation-row">
            {recommendations.map(movie => (
              <article className="recommendation-card" key={movie.id}>
                {movie.poster && <img src={movie.poster} alt={movie.title} />}
                <div>
                  <h5>{movie.title}</h5>
                  <p>{movie.year} {movie.genres?.[0] ? `- ${movie.genres[0]}` : ''}</p>
                  <button type="button" onClick={() => addMovie(movie)}>
                    Listeye Ekle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserInsights;
