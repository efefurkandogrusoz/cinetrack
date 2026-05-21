import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Clapperboard,
  Heart,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Tv,
} from 'lucide-react';
import {
  ALL_GENRE_MAP,
  MOVIE_GENRE_MAP,
  TV_GENRE_MAP,
  fetchRecommendationCandidates,
  getMediaTrailer,
} from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import { useNotifications } from '../context/NotificationContext';
import { getMediaKey, getMediaType, getMediaTypeLabel, isTvShow } from '../utils/media';
import { NOTIFICATION_TYPES } from '../utils/notificationHelpers';
import {
  getInsightEmptyMessage,
  getSmartRecommendations,
  getUserTasteProfile,
  saveRecentInsightRecommendations,
} from '../utils/smartRecommendationHelpers';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/UserInsights.css';

const recommendationFilters = [
  { id: 'all', label: 'Tümü' },
  { id: 'movie', label: 'Filmler' },
  { id: 'tv', label: 'Diziler' },
];

const insightTabs = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'genres', label: 'Tür Eğilimleri' },
  { id: 'insights', label: 'Yorumlar' },
  { id: 'recommendations', label: 'Öneriler' },
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
      .filter(Boolean),
  )].slice(0, 3);
};

const getGenreInterest = (score, maxScore) => {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.75) return { label: 'Güçlü', level: 'high' };
  if (ratio >= 0.45) return { label: 'Orta', level: 'medium' };
  return { label: 'Düşük', level: 'low' };
};

const UserInsights = () => {
  const { addMovie, movies, toggleFavorite } = useMovies();
  const { addNotification } = useNotifications();
  const [recommendationGroups, setRecommendationGroups] = useState([]);
  const [flatRecommendations, setFlatRecommendations] = useState([]);
  const [recommendationFilter, setRecommendationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState(null);
  const [recommendationEmptyReason, setRecommendationEmptyReason] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [trailerItem, setTrailerItem] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

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

  const insightCards = useMemo(() => {
    const cards = [];

    if (analysis.topGenres[0]) {
      cards.push({
        id: 'top-genre',
        icon: Heart,
        title: 'En sevdiğin tür',
        text: `${analysis.topGenres[0].name} türü en güçlü sinyalini veriyor.`,
      });
    }

    cards.push({
      id: 'watch-style',
      icon: Clapperboard,
      title: 'İzleme tarzın',
      text: analysis.profileTitle,
    });

    cards.push({
      id: 'rating-habit',
      icon: Star,
      title: 'Puan verme alışkanlığın',
      text: analysis.averageRating > 0
        ? `Ortalama ${analysis.averageRating.toFixed(1)} puan; beğendiklerinde ${analysis.likedAverageRating > 0 ? analysis.likedAverageRating.toFixed(1) : '-'}.`
        : 'Henüz yeterli puan verisi yok.',
    });

    cards.push({
      id: 'recommendation-type',
      icon: Sparkles,
      title: 'Sana uygun öneri tipi',
      text: analysis.topGenres.length > 0
        ? `${analysis.topGenres.slice(0, 2).map(genre => genre.name).join(' ve ')} odaklı öneriler.`
        : 'Daha fazla favori ekledikçe öneriler kişiselleşir.',
    });

    analysis.notes.forEach((note, index) => {
      cards.push({
        id: `note-${index}`,
        icon: TrendingUp,
        title: 'Analiz notu',
        text: note,
      });
    });

    return cards.slice(0, 6);
  }, [analysis]);

  const tasteProfile = useMemo(
    () => getUserTasteProfile(movies, analysis),
    [movies, analysis],
  );

  const loadRecommendations = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setRecommendationError(null);
    setRecommendationEmptyReason(null);

    try {
      const excludedMediaKeys = movies.map(getMediaKey);
      const candidates = await fetchRecommendationCandidates({
        movieGenreIds: tasteProfile.movieRecommendationGenreIds,
        tvGenreIds: tasteProfile.tvRecommendationGenreIds,
        excludedKeys: excludedMediaKeys,
        limit: 30,
        page: isRefresh ? 2 : 1,
        alternateSort: isRefresh,
      });

      const { groups, flat, emptyReason } = getSmartRecommendations(candidates, tasteProfile, {
        refreshSeed: isRefresh ? Date.now() : 0,
        maxPerCategory: 4,
        minPerCategory: 2,
      });

      setRecommendationGroups(groups);
      setFlatRecommendations(flat.map(entry => ({
        ...entry.item,
        recommendationReason: entry.reason,
        recommendationScore: entry.score,
      })));

      if (emptyReason) {
        setRecommendationEmptyReason(emptyReason);
        setRecommendationGroups([]);
        setFlatRecommendations([]);
      } else if (flat.length === 0) {
        setRecommendationError('Şu an yeni öneri bulunamadı.');
      } else if (isRefresh) {
        saveRecentInsightRecommendations(flat.map(entry => entry.item));
        addNotification(
          NOTIFICATION_TYPES.RECOMMENDATION,
          'Yeni önerilerin hazır',
          flat.length > 0
            ? 'Zevk profiline göre güncellenmiş öneriler oluşturuldu.'
            : 'Şu an farklı öneri bulunamadı.',
          { toastVariant: flat.length > 0 ? 'success' : 'info' },
        );
      }
    } catch {
      setRecommendationGroups([]);
      setFlatRecommendations([]);
      setRecommendationError('API’den öneri sonucu alınamadı. Biraz sonra yeniden deneyebilirsin.');
    } finally {
      setLoading(false);
    }
  }, [addNotification, movies, tasteProfile]);

  useEffect(() => {
    if (activeTab !== 'recommendations') return undefined;

    const timer = window.setTimeout(() => {
      loadRecommendations(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    analysis.movieRecommendationGenreIds,
    analysis.tvRecommendationGenreIds,
    loadRecommendations,
    movies.length,
  ]);

  const handleRefreshRecommendations = () => {
    loadRecommendations(true);
  };

  const formatRating = (value) => (value > 0 ? value.toFixed(1) : '-');
  const strongestScore = analysis.topGenres[0]?.score || 1;

  const visibleRecommendations = useMemo(() => {
    const items = flatRecommendations;
    if (recommendationFilter === 'all') return items;
    return items.filter(item => getMediaType(item) === recommendationFilter);
  }, [flatRecommendations, recommendationFilter]);

  const filteredGroups = useMemo(() => {
    if (recommendationFilter === 'all') return recommendationGroups;

    return recommendationGroups
      .map(group => ({
        ...group,
        items: group.items.filter(entry => getMediaType(entry.item) === recommendationFilter),
      }))
      .filter(group => group.items.length > 0);
  }, [recommendationGroups, recommendationFilter]);

  const recommendationHint = !analysis.hasFavoriteSignal
    ? 'Daha isabetli öneriler için birkaç film veya dizi favorile.'
    : 'Favorilerin, puanların, tepkilerin ve tür eğilimlerin skor bazlı değerlendirildi.';

  const openRecommendation = (movie) => {
    setSelectedMovie(movie);
  };

  const addRecommendation = async (item, favorite = false) => {
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
        watchStatus: 'watchlist',
        favorite,
        isFavorite: favorite,
      };

    await addMovie(payload);

    if (!favorite) {
      addNotification(
        NOTIFICATION_TYPES.WATCHLIST,
        'Listeye Eklendi',
        'Önerilen içerik izlenecekler listesine eklendi.',
        { toastVariant: 'success' },
      );
    }
  };

  const openTrailer = async (item) => {
    setTrailerItem(item);
    setTrailerKey(item.trailerKey || null);

    if (item.trailerKey) return;

    setLoadingTrailer(true);
    try {
      const key = await getMediaTrailer(item.id, item.mediaType);
      setTrailerKey(key);
    } finally {
      setLoadingTrailer(false);
    }
  };

  const scrollToDiscover = () => {
    document.querySelector('.discovery-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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

  const summaryStats = [
    {
      id: 'profile',
      label: 'Kayıtlı profil',
      value: String(analysis.totalCount),
      hint: `${analysis.movieCount} film · ${analysis.tvCount} dizi`,
    },
    {
      id: 'watched',
      label: 'İzleme oranı',
      value: `${analysis.watchedRate}%`,
      hint: `${analysis.watchedCount} tamamlandı`,
    },
    {
      id: 'rating',
      label: 'Ortalama puan',
      value: formatRating(analysis.averageRating),
      hint: analysis.likedAverageRating > 0 ? `Beğenilen: ${formatRating(analysis.likedAverageRating)}` : 'Puan verisi az',
    },
    {
      id: 'strength',
      label: 'Baskın özellik',
      value: analysis.topGenres[0]?.name || '—',
      hint: analysis.profileTitle,
    },
    {
      id: 'confidence',
      label: 'Analiz güveni',
      value: `${analysis.confidence}%`,
      hint: analysis.confidenceLabel,
    },
  ];

  const renderRecommendationCard = (movie) => {
    const mediaKey = getMediaKey(movie);
    const existing = existingByKey.get(mediaKey);
    const alreadyFavorite = Boolean(existing?.favorite || existing?.isFavorite);
    const reason = movie.recommendationReason || 'Zevk profiline uygun bir öneri.';
    const year = movie.year && movie.year !== 'N/A' ? movie.year : null;

    return (
      <article
        className="recommendation-card-smart"
        key={mediaKey}
        onClick={() => openRecommendation(movie)}
        onKeyDown={event => handleRecommendationKeyDown(event, movie)}
        role="button"
        tabIndex={0}
        aria-label={`${movie.title} detaylarını aç`}
      >
        <div className="recommendation-card-poster">
          {movie.poster ? (
            <img src={movie.poster} alt="" />
          ) : (
            <span className="poster-placeholder">{getMediaTypeLabel(movie)}</span>
          )}
          {movie.rating > 0 && <em>★ {Number(movie.rating).toFixed(1)}</em>}
          <span className="recommendation-type-badge">{getMediaTypeLabel(movie)}</span>
        </div>
        <div className="recommendation-card-body">
          <strong>{movie.title}</strong>
          <span className="recommendation-card-meta">
            {movie.genres?.[0] || 'Tür yok'}
            {year ? ` · ${year}` : ''}
          </span>
          <small className="recommendation-reason">{reason}</small>
          <div className="recommendation-card-actions">
            <button
              type="button"
              className="action-primary"
              onClick={(event) => {
                event.stopPropagation();
                openRecommendation(movie);
              }}
            >
              Detayları Gör
            </button>
            <div className="recommendation-card-actions-grid">
              <button
                type="button"
                disabled={Boolean(existing)}
                onClick={(event) => {
                  event.stopPropagation();
                  addRecommendation(movie);
                }}
              >
                <Plus size={12} aria-hidden="true" />
                {existing ? 'Listede' : 'Listeye Ekle'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  openTrailer(movie);
                }}
              >
                <Play size={12} aria-hidden="true" />
                Fragman
              </button>
              <button
                type="button"
                className="ghost"
                disabled={alreadyFavorite}
                onClick={(event) => {
                  event.stopPropagation();
                  handleFavoriteRecommendation(movie);
                }}
              >
                {alreadyFavorite ? 'Favoride' : 'Favoriye Ekle'}
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderRecommendations = () => (
    <div className="insights-panel recommendations-panel">
      <div className="insights-panel-head">
        <div>
          <h4>Sana Özel Öneriler</h4>
          <p>{recommendationHint}</p>
        </div>
        <div className="recommendation-head-actions">
          {loading && <span className="insights-loading">Yükleniyor</span>}
          <button
            type="button"
            className="insights-refresh-btn"
            onClick={handleRefreshRecommendations}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Önerileri Yenile
          </button>
        </div>
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

      {loading ? (
        <p className="insights-empty">Öneriler hazırlanıyor…</p>
      ) : visibleRecommendations.length > 0 ? (
        <div className="recommendation-categories">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <section className="recommendation-category" key={group.id}>
                {filteredGroups.length > 1 && <h5>{group.title}</h5>}
                <div className="recommendation-scroll">
                  {group.items.map(entry => renderRecommendationCard({
                    ...entry.item,
                    recommendationReason: entry.reason,
                  }))}
                </div>
              </section>
            ))
          ) : (
            <section className="recommendation-category">
              <div className="recommendation-scroll">
                {visibleRecommendations.map(movie => renderRecommendationCard(movie))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="insights-empty-state">
          <p>
            {recommendationError
              || getInsightEmptyMessage(recommendationEmptyReason)
              || 'Şu an yeni öneri bulunamadı.'}
          </p>
          <div className="insights-empty-actions">
            <button type="button" className="insights-refresh-btn" onClick={handleRefreshRecommendations}>
              Önerileri Yenile
            </button>
            <button type="button" className="insights-more-btn" onClick={scrollToDiscover}>
              Keşfet
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section className="insights-section insights-compact" aria-labelledby="insights-title">
      <header className="insights-header">
        <div>
          <p className="eyebrow">Zevk Analizi</p>
          <h3 id="insights-title">Zevk Analizin</h3>
          <p className="insights-lead">
            İzleme alışkanlıkların, favori türlerin ve sana özel önerilerin burada.
          </p>
        </div>
        <span className="insights-profile-badge">{analysis.profileTitle}</span>
      </header>

      <div className="insights-summary-row">
        {summaryStats.map(stat => (
          <article className="insights-stat" key={stat.id}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.hint}</small>
          </article>
        ))}
      </div>

      <div className="insights-tabs" role="tablist" aria-label="Zevk analizi sekmeleri">
        {insightTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="insights-tab-panels">
        {activeTab === 'overview' && (
          <div className="insights-panel overview-panel" role="tabpanel">
            <div className="overview-grid">
              <article className="overview-highlight">
                <BarChart3 size={18} aria-hidden="true" />
                <div>
                  <span>İzleme alışkanlığı</span>
                  <strong>{analysis.watchedRate}% tamamlanma</strong>
                  <p>{analysis.watchedCount} izlendi · {analysis.watchlistCount} bekliyor</p>
                </div>
              </article>
              <article className="overview-highlight">
                <Heart size={18} aria-hidden="true" />
                <div>
                  <span>Favori dağılımı</span>
                  <strong>{analysis.favoriteCount} favori</strong>
                  <p>{analysis.favoriteMovieCount} film · {analysis.favoriteTvCount} dizi</p>
                </div>
              </article>
              <article className="overview-highlight">
                <Tv size={18} aria-hidden="true" />
                <div>
                  <span>Tepki kapsamı</span>
                  <strong>{analysis.reactionCoverage}%</strong>
                  <p>{analysis.likedCount} beğeni · {analysis.dislikedCount} beğenmeme</p>
                </div>
              </article>
              <article className="overview-highlight">
                <TrendingUp size={18} aria-hidden="true" />
                <div>
                  <span>Süre eğilimi</span>
                  <strong>{analysis.averageRuntime ? `${analysis.averageRuntime} dk` : '—'}</strong>
                  <p>{analysis.runtimeProfile}</p>
                </div>
              </article>
            </div>
          </div>
        )}

        {activeTab === 'genres' && (
          <div className="insights-panel genres-panel" role="tabpanel">
            {analysis.topGenres.length > 0 ? (
              <>
                <div className="genre-compact-list">
                  {analysis.topGenres.map(genre => {
                    const width = Math.max(12, Math.round((genre.score / strongestScore) * 100));
                    const interest = getGenreInterest(genre.score, strongestScore);

                    return (
                      <div className="genre-compact-item" key={genre.key}>
                        <div className="genre-compact-head">
                          <strong>{genre.name}</strong>
                          <span className={`genre-interest genre-interest--${interest.level}`}>
                            {interest.label} ilgi
                          </span>
                        </div>
                        <div className="genre-compact-track" aria-hidden="true">
                          <span style={{ width: `${width}%` }} />
                        </div>
                        <p>{genre.liked} beğeni · {genre.favorite} favori · {genre.movie + genre.tv} kayıt</p>
                      </div>
                    );
                  })}
                </div>
                {analysis.avoidedGenres.length > 0 && (
                  <p className="genre-caution-compact">
                    Daha seçici: {analysis.avoidedGenres.map(genre => genre.name).join(', ')}
                  </p>
                )}
              </>
            ) : (
              <p className="insights-empty">Zevkini analiz edebilmemiz için birkaç film veya dizi favorile.</p>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="insights-panel notes-panel" role="tabpanel">
            {insightCards.length > 0 ? (
              <div className="insight-card-grid">
                {insightCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <article className="insight-mini-card" key={card.id}>
                      <Icon size={16} aria-hidden="true" />
                      <div>
                        <strong>{card.title}</strong>
                        <p>{card.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="insights-empty">Analiz için biraz daha veri biriktir.</p>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && renderRecommendations()}
      </div>

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}

      {trailerItem && (
        <div className="feature-trailer-layer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="feature-trailer-backdrop"
            onClick={() => {
              setTrailerItem(null);
              setTrailerKey(null);
            }}
            aria-label="Kapat"
          />
          <div className="feature-trailer-box">
            {trailerKey ? (
              <iframe
                title={`${trailerItem.title} fragman`}
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
              />
            ) : (
              <p>{loadingTrailer ? 'Fragman yükleniyor…' : 'Fragman bulunamadı.'}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default UserInsights;
