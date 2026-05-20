import { useEffect, useMemo, useState } from 'react';
import {
  ALL_GENRE_MAP,
  MOVIE_GENRE_MAP,
  TV_GENRE_MAP,
  discoverMoviesByGenres,
  discoverTvShowsByGenres,
} from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import { getMediaKey, getMediaType, getMediaTypeLabel, isTvShow } from '../utils/media';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/UserInsights.css';

const recommendationFilters = [
  { id: 'all', label: 'Tümü' },
  { id: 'movie', label: 'Filmler' },
  { id: 'tv', label: 'Diziler' },
];

const movieGenreAliases = {
  'Aksiyon & Macera': 'Aksiyon',
  'Bilim Kurgu & Fantastik': 'Bilim Kurgu',
  'Savaş & Politik': 'Savaş',
  'Pembe Dizi': 'Dram',
  Çocuk: 'Aile',
  Reality: 'Belgesel',
  Haber: 'Belgesel',
  'Talk Show': 'Belgesel',
};

const tvGenreAliases = {
  Aksiyon: 'Aksiyon & Macera',
  Macera: 'Aksiyon & Macera',
  Fantastik: 'Bilim Kurgu & Fantastik',
  'Bilim Kurgu': 'Bilim Kurgu & Fantastik',
  Savaş: 'Savaş & Politik',
  Romantik: 'Dram',
  Gerilim: 'Gizem',
  Müzik: 'Reality',
  Tarih: 'Belgesel',
  'TV Filmi': 'Dram',
};

const findGenreIdByName = (genreMap, name) => {
  const match = Object.entries(genreMap).find(([, genreName]) => genreName === name);
  return match ? Number(match[0]) : null;
};

const resolveGenreIdsForMedia = (genres, mediaType) => {
  const targetMap = mediaType === 'tv' ? TV_GENRE_MAP : MOVIE_GENRE_MAP;
  const aliases = mediaType === 'tv' ? tvGenreAliases : movieGenreAliases;

  return [...new Set(
    genres
      .map(genre => {
        if (genre.id && targetMap[genre.id]) return Number(genre.id);

        const directId = findGenreIdByName(targetMap, genre.name);
        if (directId) return directId;

        const alias = aliases[genre.name];
        return alias ? findGenreIdByName(targetMap, alias) : null;
      })
      .filter(Boolean)
  )].slice(0, 3);
};

const getItemDate = (item) => (
  isTvShow(item)
    ? item.firstAirDate || item.first_air_date || item.releaseDate || item.release_date
    : item.releaseDate || item.release_date
);

const formatDate = (value) => {
  if (!value) return 'Tarih yok';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tarih yok';

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const UserInsights = () => {
  const { addMovie, movies, toggleFavorite } = useMovies();
  const [recommendations, setRecommendations] = useState({ movie: [], tv: [] });
  const [recommendationFilter, setRecommendationFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const existingByKey = useMemo(
    () => new Map(movies.map(movie => [getMediaKey(movie), movie])),
    [movies],
  );

  const analysis = useMemo(() => {
    const watched = movies.filter(movie => movie.watched || movie.watchStatus === 'completed' || movie.watchStatus === 'watched');
    const watchlist = movies.filter(movie => !movie.watched && movie.watchStatus !== 'completed' && movie.watchStatus !== 'watched');
    const favorites = movies.filter(movie => movie.favorite || movie.isFavorite);
    const liked = movies.filter(movie => movie.reaction === 'liked');
    const disliked = movies.filter(movie => movie.reaction === 'disliked');
    const reacted = liked.length + disliked.length;
    const watchedReacted = watched.filter(movie => movie.reaction === 'liked' || movie.reaction === 'disliked').length;
    const movieCount = movies.filter(movie => getMediaType(movie) === 'movie').length;
    const tvCount = movies.filter(movie => getMediaType(movie) === 'tv').length;
    const favoriteMovieCount = favorites.filter(movie => getMediaType(movie) === 'movie').length;
    const favoriteTvCount = favorites.filter(movie => getMediaType(movie) === 'tv').length;
    const genreScores = new Map();

    const average = (items, getter) => {
      const values = items.map(getter).filter(value => Number.isFinite(value) && value > 0);
      if (values.length === 0) return 0;
      return values.reduce((total, value) => total + value, 0) / values.length;
    };

    const genreEntries = (movie) => {
      const ids = movie.genre_ids || [];
      const namedGenres = (movie.genres || []).filter(Boolean);

      if (ids.length > 0) {
        return ids
          .map((id, index) => {
            const name = namedGenres[index] || ALL_GENRE_MAP[id];
            return name ? { id: Number(id), key: `name:${name}`, name } : null;
          })
          .filter(Boolean);
      }

      return namedGenres.map(name => ({ id: null, key: `name:${name}`, name }));
    };

    movies.forEach(movie => {
      const rating = Number(movie.rating ?? movie.voteAverage);
      const reactionWeight = movie.reaction === 'liked' ? 3 : movie.reaction === 'disliked' ? -2.4 : 0;
      const favoriteWeight = movie.favorite || movie.isFavorite ? 1.4 : 0;
      const watchedWeight = movie.watched || movie.watchStatus === 'completed' || movie.watchStatus === 'watched'
        ? 0.8
        : movie.watchStatus === 'watching'
          ? 0.65
          : 0.25;
      const ratingWeight = rating >= 7 ? 0.45 : rating > 0 && rating < 5.5 ? -0.2 : 0;
      const weight = reactionWeight + favoriteWeight + watchedWeight + ratingWeight;

      genreEntries(movie).forEach(genre => {
        const current = genreScores.get(genre.key) || {
          ...genre,
          liked: 0,
          disliked: 0,
          favorite: 0,
          watched: 0,
          movie: 0,
          tv: 0,
          total: 0,
          score: 0,
        };

        if (!current.id && genre.id) current.id = genre.id;
        current.total += 1;
        current.score += weight;
        if (movie.reaction === 'liked') current.liked += 1;
        if (movie.reaction === 'disliked') current.disliked += 1;
        if (movie.favorite || movie.isFavorite) current.favorite += 1;
        if (movie.watched || movie.watchStatus === 'completed' || movie.watchStatus === 'watched') current.watched += 1;
        if (isTvShow(movie)) current.tv += 1;
        else current.movie += 1;
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
    const averageRuntime = Math.round(average(watched.filter(movie => !isTvShow(movie)), movie => Number(movie.runtime)));
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
        : hasAny('Bilim Kurgu', 'Bilim Kurgu & Fantastik', 'Fantastik', 'Macera', 'Aksiyon', 'Aksiyon & Macera')
          ? 'Büyük ölçekli hikaye takipçisi'
          : hasAny('Dram', 'Suç', 'Gerilim', 'Gizem')
            ? 'Yoğun hikaye ve atmosfer seven'
            : hasAny('Komedi', 'Romantik', 'Aile', 'Animasyon')
              ? 'Rahat ve sıcak tonları seven'
              : hasAny('Belgesel', 'Tarih', 'Savaş', 'Savaş & Politik')
                ? 'Merak ve gerçeklik odaklı'
                : 'Dengeli izleme seçkisi';

    const notes = [];
    if (topGenre) {
      notes.push(`${topGenre.name} türü listende en güçlü olumlu sinyali veriyor.`);
    }
    if (avoidedGenres[0]) {
      notes.push(`${avoidedGenres[0].name} tarafında daha seçici davranıyorsun.`);
    }
    if (reactionCoverage < 45 && watched.length >= 3) {
      notes.push('Daha isabetli analiz için izlediğin yapımlara beğeni tepkisi eklemek iyi olur.');
    } else if (reactionCoverage >= 70) {
      notes.push('Tepki verilerin güçlü olduğu için öneriler daha güvenilir.');
    }
    if (favoriteRate >= 35) {
      notes.push('Favori oranı yüksek, tekrar dönmek istediğin yapımları belirgin ayırıyorsun.');
    }
    if (averageRating >= 7) {
      notes.push('Genelde yüksek puanlı yapımları listeye alma eğilimin var.');
    }

    return {
      totalCount: movies.length,
      movieCount,
      tvCount,
      watchedCount: watched.length,
      watchlistCount: watchlist.length,
      favoriteCount: favorites.length,
      favoriteMovieCount,
      favoriteTvCount,
      likedCount: liked.length,
      dislikedCount: disliked.length,
      topGenres: rankedGenres,
      avoidedGenres,
      movieRecommendationGenreIds: resolveGenreIdsForMedia(rankedGenres, 'movie'),
      tvRecommendationGenreIds: resolveGenreIdsForMedia(rankedGenres, 'tv'),
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
      hasFavoriteSignal: favorites.length > 0,
      notes: notes.slice(0, 4),
    };
  }, [movies]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setRecommendationError(null);

      const excludedMediaKeys = movies.map(getMediaKey);
      const movieRequest = analysis.movieRecommendationGenreIds.length > 0
        ? discoverMoviesByGenres(analysis.movieRecommendationGenreIds, excludedMediaKeys)
        : Promise.resolve([]);

      Promise.all([
        movieRequest,
        discoverTvShowsByGenres(analysis.tvRecommendationGenreIds, excludedMediaKeys),
      ])
        .then(([movieResults, tvResults]) => {
          if (cancelled) return;

          setRecommendations({
            movie: movieResults,
            tv: tvResults,
          });

          if (movieResults.length === 0 && tvResults.length === 0) {
            setRecommendationError('API’den öneri sonucu alınamadı. Biraz sonra yeniden deneyebilirsin.');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRecommendations({ movie: [], tv: [] });
            setRecommendationError('API’den öneri sonucu alınamadı. Biraz sonra yeniden deneyebilirsin.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [analysis.movieRecommendationGenreIds, analysis.tvRecommendationGenreIds, movies]);

  const formatRating = (value) => (value > 0 ? value.toFixed(1) : '-');
  const strongestScore = analysis.topGenres[0]?.score || 1;
  const visibleRecommendations = recommendationFilter === 'all'
    ? [...recommendations.movie, ...recommendations.tv]
    : recommendations[recommendationFilter] || [];
  const hasRecommendations = recommendations.movie.length > 0 || recommendations.tv.length > 0;
  const recommendationTitle = recommendationFilter === 'tv'
    ? 'Sana Uygun Dizi Önerileri'
    : recommendationFilter === 'movie'
      ? 'Sana Uygun Film Önerileri'
      : 'Sana Uygun Film ve Dizi Önerileri';
  const recommendationHint = !analysis.hasFavoriteSignal
    ? 'Zevkini analiz edebilmemiz için birkaç film veya dizi favorile. Şimdilik popüler dizilerden bazı öneriler gösteriyoruz.'
    : 'Favorilerin, izleme durumun, tepkilerin ve tür eğilimlerin birlikte değerlendirildi.';

  const openRecommendation = (movie) => {
    setSelectedMovie(movie);
  };

  const addRecommendation = (item, favorite = false) => {
    const payload = isTvShow(item)
      ? {
        ...item,
        mediaType: 'tv',
        media_type: 'tv',
        watchStatus: 'watchlist',
        currentSeason: 1,
        currentEpisode: 1,
        favorite,
        isFavorite: favorite,
      }
      : {
        ...item,
        mediaType: 'movie',
        media_type: 'movie',
        favorite,
        isFavorite: favorite,
      };

    addMovie(payload);
  };

  const handleFavoriteRecommendation = (item) => {
    const existing = existingByKey.get(getMediaKey(item));

    if (existing) {
      if (!(existing.favorite || existing.isFavorite)) {
        toggleFavorite(existing.docId || existing.id, existing.favorite || false);
      }
      return;
    }

    addRecommendation(item, true);
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
            Analiz; izleme durumunu, favorilerini, beğeni tepkilerini, tür tekrarlarını ve TMDB puanlarını film ve
            diziler için birlikte okuyarak güncellenir.
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
          <strong>{analysis.totalCount} kayıtlık profil</strong>
          <p>{analysis.movieCount} film, {analysis.tvCount} dizi; {analysis.favoriteCount} favori.</p>
        </article>
        <article className="taste-card">
          <span>Favori dağılımı</span>
          <strong>{analysis.favoriteMovieCount} / {analysis.favoriteTvCount}</strong>
          <p>Favori filmlerin ve dizilerin tür puanlarını doğrudan etkiler.</p>
        </article>
        <article className="taste-card">
          <span>Ortalama puan</span>
          <strong>{formatRating(analysis.averageRating)}</strong>
          <p>Beğendiğin yapımlarda ortalama {formatRating(analysis.likedAverageRating)}.</p>
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
                  <span>{genre.liked} beğeni, {genre.favorite} favori, {genre.movie} film, {genre.tv} dizi</span>
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
        <p className="insight-empty">Zevkini analiz edebilmemiz için birkaç film veya dizi favorile.</p>
      )}

      {analysis.notes.length > 0 && (
        <div className="insight-notes">
          {analysis.notes.map(note => <p key={note}>{note}</p>)}
        </div>
      )}

      <div className="recommendation-block">
        <div className="recommendation-head">
          <div>
            <h4>{recommendationTitle}</h4>
            <p>{recommendationHint}</p>
          </div>
          {loading && <span>Yükleniyor</span>}
        </div>

        <div className="recommendation-tabs" role="tablist" aria-label="Öneri türü">
          {recommendationFilters.map(filter => (
            <button
              key={filter.id}
              type="button"
              className={recommendationFilter === filter.id ? 'active' : ''}
              onClick={() => setRecommendationFilter(filter.id)}
              role="tab"
              aria-selected={recommendationFilter === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {visibleRecommendations.length > 0 ? (
          <div className="recommendation-row">
            {visibleRecommendations.map(movie => {
              const mediaKey = getMediaKey(movie);
              const existing = existingByKey.get(mediaKey);
              const alreadyFavorite = Boolean(existing?.favorite || existing?.isFavorite);

              return (
                <article
                  className="recommendation-card"
                  key={mediaKey}
                  onClick={() => openRecommendation(movie)}
                  onKeyDown={event => handleRecommendationKeyDown(event, movie)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${movie.title} detaylarını aç`}
                >
                  <div className="recommendation-poster">
                    {movie.poster ? (
                      <img src={movie.poster} alt={movie.title} />
                    ) : (
                      <span className="recommendation-poster-placeholder">{getMediaTypeLabel(movie)}</span>
                    )}
                    {movie.rating > 0 && <span className="recommendation-rating">{movie.rating.toFixed(1)}</span>}
                    <span className="recommendation-media-badge">{getMediaTypeLabel(movie)}</span>
                  </div>

                  <div className="recommendation-copy">
                    <div className="recommendation-title-line">
                      <h5>{movie.title}</h5>
                      <span>{formatDate(getItemDate(movie))}</span>
                    </div>

                    {movie.genres?.length > 0 && (
                      <div className="recommendation-genres">
                        {movie.genres.slice(0, 2).map(genre => <span key={genre}>{genre}</span>)}
                      </div>
                    )}

                    <p>{movie.overview || (isTvShow(movie) ? 'Bu dizi için açıklama bulunamadı.' : 'Bu film için açıklama bulunamadı.')}</p>

                    <div className="recommendation-actions">
                      <button
                        type="button"
                        disabled={Boolean(existing)}
                        onClick={event => {
                          event.stopPropagation();
                          addRecommendation(movie);
                        }}
                      >
                        {existing ? 'Listede' : 'Listeye Ekle'}
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        disabled={alreadyFavorite}
                        onClick={event => {
                          event.stopPropagation();
                          handleFavoriteRecommendation(movie);
                        }}
                      >
                        {alreadyFavorite ? 'Favoride' : 'Favoriye Ekle'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="recommendation-empty">
            {loading
              ? 'Öneriler hazırlanıyor.'
              : recommendationError || (hasRecommendations ? 'Bu filtre için öneri bulunamadı.' : 'Popüler dizilerden bazı öneriler yüklenemedi.')}
          </p>
        )}
      </div>

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </section>
  );
};

export default UserInsights;
