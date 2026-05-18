import React, { useEffect, useMemo, useState } from 'react';
import { ALL_GENRE_MAP, discoverMoviesByGenres, GENRE_MAP } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/UserInsights.css';

const UserInsights = () => {
  const { addMovie, movies } = useMovies();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const analysis = useMemo(() => {
    const watched = movies.filter(movie => movie.watched);
    const watchlist = movies.filter(movie => !movie.watched);
    const favorites = movies.filter(movie => movie.favorite);
    const liked = movies.filter(movie => movie.reaction === 'liked');
    const disliked = movies.filter(movie => movie.reaction === 'disliked');
    const reacted = liked.length + disliked.length;
    const watchedReacted = watched.filter(movie => movie.reaction === 'liked' || movie.reaction === 'disliked').length;
    const genreScores = new Map();

    const average = (items, getter) => {
      const values = items.map(getter).filter(value => Number.isFinite(value) && value > 0);
      if (values.length === 0) return 0;
      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    const genreEntries = (movie) => {
      const ids = movie.genre_ids || [];
      if (ids.length > 0) {
        return ids
          .map(id => ({ id, key: String(id), name: GENRE_MAP[id] || ALL_GENRE_MAP[id] }))
          .filter(genre => genre.name);
      }

      return (movie.genres || [])
        .filter(Boolean)
        .map(name => ({ id: null, key: `name:${name}`, name }));
    };

    movies.forEach(movie => {
      const reactionWeight = movie.reaction === 'liked' ? 3 : movie.reaction === 'disliked' ? -2.4 : 0;
      const favoriteWeight = movie.favorite ? 1.4 : 0;
      const watchedWeight = movie.watched ? 0.8 : 0.25;
      const ratingWeight = movie.rating >= 7 ? 0.45 : movie.rating > 0 && movie.rating < 5.5 ? -0.2 : 0;
      const weight = reactionWeight + favoriteWeight + watchedWeight + ratingWeight;

      genreEntries(movie).forEach(genre => {
        const current = genreScores.get(genre.key) || {
          ...genre,
          liked: 0,
          disliked: 0,
          favorite: 0,
          watched: 0,
          total: 0,
          score: 0,
        };

        current.total += 1;
        current.score += weight;
        if (movie.reaction === 'liked') current.liked += 1;
        if (movie.reaction === 'disliked') current.disliked += 1;
        if (movie.favorite) current.favorite += 1;
        if (movie.watched) current.watched += 1;
        genreScores.set(genre.key, current);
      });
    });

    const rankedGenres = Array.from(genreScores.values())
      .filter(genre => genre.name && genre.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const avoidedGenres = Array.from(genreScores.values())
      .filter(genre => genre.disliked > 0 && genre.score <= 1)
      .sort((a, b) => b.disliked - a.disliked || a.score - b.score)
      .slice(0, 2);

    const topGenre = rankedGenres[0] || null;
    const averageRating = average(movies, movie => Number(movie.rating));
    const likedAverageRating = average(liked, movie => Number(movie.rating));
    const averageRuntime = Math.round(average(watched, movie => Number(movie.runtime)));
    const reactionCoverage = watched.length > 0 ? Math.min(100, Math.round((watchedReacted / watched.length) * 100)) : 0;
    const favoriteRate = movies.length > 0 ? Math.round((favorites.length / movies.length) * 100) : 0;
    const watchedRate = movies.length > 0 ? Math.round((watched.length / movies.length) * 100) : 0;
    const confidence = Math.min(
      100,
      Math.round(watched.length * 7 + reacted * 11 + favorites.length * 4 + Math.min(movies.length, 18) * 1.5),
    );

    const runtimeProfile =
      averageRuntime === 0
        ? 'Süre verisi az'
        : averageRuntime < 105
          ? 'Kısa ve tempolu filmler'
          : averageRuntime <= 140
            ? 'Orta uzunlukta hikayeler'
            : 'Uzun soluklu filmler';

    const genreNames = rankedGenres.map(genre => genre.name);
    const hasAny = (...names) => genreNames.some(name => names.includes(name));
    const profileTitle =
      confidence < 35
        ? 'Profil oluşuyor'
        : hasAny('Bilim Kurgu', 'Fantastik', 'Macera', 'Aksiyon')
          ? 'Büyük ölçekli hikaye takipçisi'
          : hasAny('Dram', 'Suç', 'Gerilim', 'Gizem')
            ? 'Yoğun hikaye ve atmosfer seven'
            : hasAny('Komedi', 'Romantik', 'Aile', 'Animasyon')
              ? 'Rahat ve sıcak tonları seven'
              : hasAny('Belgesel', 'Tarih', 'Savaş')
                ? 'Merak ve gerçeklik odaklı'
                : 'Dengeli sinema seçkisi';

    const notes = [];
    if (topGenre) {
      notes.push(`${topGenre.name} türü listende en güçlü olumlu sinyali veriyor.`);
    }
    if (avoidedGenres[0]) {
      notes.push(`${avoidedGenres[0].name} tarafında daha seçici davranıyorsun.`);
    }
    if (reactionCoverage < 45 && watched.length >= 3) {
      notes.push('Daha isabetli analiz için izlediğin filmlere beğeni tepkisi eklemek iyi olur.');
    } else if (reactionCoverage >= 70) {
      notes.push('Tepki verilerin güçlü olduğu için öneriler daha güvenilir.');
    }
    if (favoriteRate >= 35) {
      notes.push('Favori oranı yüksek, tekrar dönmek istediğin filmleri belirgin ayırıyorsun.');
    }
    if (averageRating >= 7) {
      notes.push('Genelde yüksek puanlı filmleri listeye alma eğilimin var.');
    }

    return {
      totalCount: movies.length,
      watchedCount: watched.length,
      watchlistCount: watchlist.length,
      favoriteCount: favorites.length,
      likedCount: liked.length,
      dislikedCount: disliked.length,
      topGenres: rankedGenres,
      avoidedGenres,
      recommendationGenreIds: rankedGenres.filter(genre => genre.id).map(genre => genre.id).slice(0, 3),
      averageRating,
      likedAverageRating,
      averageRuntime,
      reactionCoverage,
      favoriteRate,
      watchedRate,
      confidence,
      confidenceLabel: confidence >= 70 ? 'Yüksek güven' : confidence >= 38 ? 'Orta güven' : 'Veri birikiyor',
      profileTitle,
      runtimeProfile,
      notes: notes.slice(0, 4),
    };
  }, [movies]);

  useEffect(() => {
    const genreIds = analysis.recommendationGenreIds;
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
  }, [analysis.recommendationGenreIds, movies]);

  if (movies.length === 0) return null;

  const formatRating = (value) => (value > 0 ? value.toFixed(1) : '-');
  const strongestScore = analysis.topGenres[0]?.score || 1;
  const existingIds = new Set(movies.map(movie => movie.id));

  const openRecommendation = (movie) => {
    setSelectedMovie(movie);
  };

  const handleRecommendationKeyDown = (event, movie) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRecommendation(movie);
    }
  };

  return (
    <section className="insights-section">
      <div className="insights-summary">
        <div>
          <p className="eyebrow">Zevk Analizi</p>
          <h3>{analysis.profileTitle}</h3>
          <p>
            Analiz; izleme durumunu, favorilerini, beğeni tepkilerini, tür tekrarlarını ve film puanlarını birlikte
            okuyarak güncellenir.
          </p>
        </div>

        <div className="insight-metrics">
          <span><strong>{analysis.confidence}%</strong> {analysis.confidenceLabel}</span>
          <span><strong>{analysis.watchedRate}%</strong> izleme oranı</span>
          <span><strong>{analysis.reactionCoverage}%</strong> tepki kapsamı</span>
        </div>
      </div>

      <div className="taste-grid">
        <article className="taste-card primary">
          <span>Özet</span>
          <strong>{analysis.totalCount} filmden profil</strong>
          <p>{analysis.watchedCount} izlendi, {analysis.watchlistCount} izlenecek, {analysis.favoriteCount} favori.</p>
        </article>
        <article className="taste-card">
          <span>Beğeni dengesi</span>
          <strong>{analysis.likedCount} / {analysis.dislikedCount}</strong>
          <p>Beğendiğin ve beğenmediğin filmler tür puanlarını doğrudan etkiler.</p>
        </article>
        <article className="taste-card">
          <span>Ortalama puan</span>
          <strong>{formatRating(analysis.averageRating)}</strong>
          <p>Beğendiğin filmlerde ortalama {formatRating(analysis.likedAverageRating)}.</p>
        </article>
        <article className="taste-card">
          <span>Süre eğilimi</span>
          <strong>{analysis.averageRuntime ? `${analysis.averageRuntime} dk` : '-'}</strong>
          <p>{analysis.runtimeProfile}</p>
        </article>
      </div>

      {analysis.topGenres.length > 0 ? (
        <div className="genre-analysis">
          <div className="insight-subhead">
            <h4>Tür eğilimi</h4>
            <span>Olumlu sinyale göre</span>
          </div>
          <div className="genre-score-list">
            {analysis.topGenres.map(genre => (
              <div className="genre-score-item" key={genre.key}>
                <div>
                  <strong>{genre.name}</strong>
                  <span>{genre.liked} beğeni, {genre.favorite} favori, {genre.disliked} olumsuz</span>
                </div>
                <div className="genre-score-track" aria-hidden="true">
                  <span style={{ width: `${Math.max(18, Math.round((genre.score / strongestScore) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
          {analysis.avoidedGenres.length > 0 && (
            <div className="genre-caution">
              <span>Daha seçici olduğun türler</span>
              <strong>{analysis.avoidedGenres.map(genre => genre.name).join(', ')}</strong>
            </div>
          )}
        </div>
      ) : (
        <p className="insight-empty">Analiz için izlediğin filmlerden birkaç tanesine Beğendim veya Beğenmedim seç.</p>
      )}

      {analysis.notes.length > 0 && (
        <div className="insight-notes">
          {analysis.notes.map(note => <p key={note}>{note}</p>)}
        </div>
      )}

      {(loading || recommendations.length > 0) && (
        <div className="recommendation-block">
          <div className="recommendation-head">
            <h4>Önerilen Filmler</h4>
            {loading && <span>Yükleniyor</span>}
          </div>
          <div className="recommendation-row">
            {recommendations.map(movie => (
              <article
                className="recommendation-card"
                key={movie.id}
                onClick={() => openRecommendation(movie)}
                onKeyDown={event => handleRecommendationKeyDown(event, movie)}
                role="button"
                tabIndex={0}
                aria-label={`${movie.title} detaylarını aç`}
              >
                <div className="recommendation-poster">
                  {movie.poster && <img src={movie.poster} alt={movie.title} />}
                  {movie.rating > 0 && <span>{movie.rating.toFixed(1)}</span>}
                </div>

                <div className="recommendation-copy">
                  <div className="recommendation-title-line">
                    <h5>{movie.title}</h5>
                    <span>{movie.year}</span>
                  </div>

                  {movie.genres?.length > 0 && (
                    <div className="recommendation-genres">
                      {movie.genres.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}
                    </div>
                  )}

                  <p>{movie.overview || 'Bu film için açıklama bulunamadı.'}</p>

                  <button
                    type="button"
                    disabled={existingIds.has(movie.id)}
                    onClick={event => {
                      event.stopPropagation();
                      addMovie(movie);
                    }}
                  >
                    {existingIds.has(movie.id) ? 'Listede' : 'Listeye Ekle'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </section>
  );
};

export default UserInsights;
