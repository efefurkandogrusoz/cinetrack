import { ALL_GENRE_MAP } from '../services/tmdb';
import { getMediaKey, getWatchStatus } from './media';

export const RECENT_INSIGHTS_RECOMMENDATIONS_KEY = 'recentRecommendations';
const RECENT_LIMIT = 15;

const SCORE = {
  FAVORITE_GENRE: 35,
  FREQUENT_GENRE: 25,
  HIGH_RATED_GENRE: 20,
  TMDB_HIGH: 15,
  WATCHLIST_GENRE: 10,
  FAVORITE_SIMILAR: 10,
  RECENT_PENALTY: 30,
};

export const RECOMMENDATION_CATEGORY_IDS = {
  PERSONAL: 'personal',
  FAVORITE_GENRE: 'favorite-genre',
  HIGH_RATED: 'high-rated',
  WATCHLIST: 'watchlist',
  SIMILAR: 'similar-taste',
};

export const RECOMMENDATION_CATEGORY_LABELS = {
  [RECOMMENDATION_CATEGORY_IDS.PERSONAL]: 'Sana Özel Öneriler',
  [RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE]: 'Favori Türüne Göre',
  [RECOMMENDATION_CATEGORY_IDS.HIGH_RATED]: 'Yüksek Puanlı İzlenmemişler',
  [RECOMMENDATION_CATEGORY_IDS.WATCHLIST]: 'İzlenecekler Listenden',
  [RECOMMENDATION_CATEGORY_IDS.SIMILAR]: 'Benzer Zevkte İçerikler',
};

const CATEGORY_ORDER = [
  RECOMMENDATION_CATEGORY_IDS.PERSONAL,
  RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE,
  RECOMMENDATION_CATEGORY_IDS.HIGH_RATED,
  RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
  RECOMMENDATION_CATEGORY_IDS.SIMILAR,
];

const isWatched = (movie) => (
  movie.watched
  || getWatchStatus(movie) === 'watched'
  || getWatchStatus(movie) === 'completed'
);

const isInProgress = (movie) => getWatchStatus(movie) === 'watching';

const isDisliked = (movie) => movie.reaction === 'disliked';

export const shouldExcludeFromRecommendations = (movie) => (
  isWatched(movie) || isInProgress(movie) || isDisliked(movie)
);

export const getContentUniqueKey = (item) => {
  if (!item) return '';
  if (item.key) return String(item.key);
  const id = item.id ?? item.docId;
  const type = item.mediaType || item.media_type || 'movie';
  if (id) return getMediaKey({ id, mediaType: type, media_type: type });
  const title = item.title || item.name || '';
  const year = item.year || '';
  return `${type}:${title}:${year}`.toLowerCase();
};

const getGenres = (item) => {
  const named = (item.genres || []).filter(Boolean);
  if (named.length > 0) return named;

  return (item.genre_ids || [])
    .map(id => ALL_GENRE_MAP[id])
    .filter(Boolean);
};

const getUserRating = (movie) => {
  const value = Number(movie.userRating ?? movie.personalRating ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const buildGenreWeights = (movies) => {
  const weights = new Map();

  movies.forEach((movie) => {
    const weight = (movie.favorite || movie.isFavorite)
      ? 3
      : isWatched(movie)
        ? 1.5
        : getWatchStatus(movie) === 'watching'
          ? 2
          : movie.reaction === 'liked'
            ? 2.2
            : 1;

    getGenres(movie).forEach((genre) => {
      weights.set(genre, (weights.get(genre) || 0) + weight);
    });
  });

  return weights;
};

const buildHighRatedGenres = (movies) => {
  const scores = new Map();

  movies.forEach((movie) => {
    const rating = Math.max(getUserRating(movie), Number(movie.rating ?? movie.voteAverage ?? 0));
    if (rating < 7) return;

    const weight = movie.reaction === 'liked' ? 2 : 1;
    getGenres(movie).forEach((genre) => {
      scores.set(genre, (scores.get(genre) || 0) + weight);
    });
  });

  return new Set(
    [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([genre]) => genre),
  );
};

const getGenreMatches = (item, tasteProfile) => {
  const itemGenres = getGenres(item);

  return {
    favorite: itemGenres.find(genre => genre === tasteProfile.favoriteGenre) || null,
    frequent: itemGenres.find(genre => tasteProfile.frequentGenres.has(genre)) || null,
    highRated: itemGenres.find(genre => tasteProfile.highRatedGenres.has(genre)) || null,
    watchlist: itemGenres.find(genre => tasteProfile.watchlistGenres.has(genre)) || null,
    similar: itemGenres.find(genre => tasteProfile.favoriteGenreSet.has(genre)) || null,
    primary: itemGenres[0] || null,
    all: itemGenres,
  };
};

export const getRecentInsightRecommendations = () => {
  try {
    const raw = localStorage.getItem(RECENT_INSIGHTS_RECOMMENDATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecentInsightRecommendations = (items = []) => {
  const entries = items.slice(0, RECENT_LIMIT).map(item => ({
    id: String(item.id),
    key: getContentUniqueKey(item),
    title: item.title || item.name || 'İsimsiz',
    date: new Date().toISOString().slice(0, 10),
  }));

  const existing = getRecentInsightRecommendations();
  const mergedKeys = new Set(entries.map(entry => entry.key));

  const merged = [
    ...entries,
    ...existing.filter(item => !mergedKeys.has(item.key)),
  ].slice(0, RECENT_LIMIT);

  localStorage.setItem(RECENT_INSIGHTS_RECOMMENDATIONS_KEY, JSON.stringify(merged));
};

export const getUserTasteProfile = (movies = [], analysis = null) => {
  const genreWeights = buildGenreWeights(movies);
  const favorites = movies.filter(movie => movie.favorite || movie.isFavorite);
  const watchlist = movies.filter(movie => getWatchStatus(movie) === 'watchlist' && !isWatched(movie));
  const liked = movies.filter(movie => movie.reaction === 'liked');

  const topGenres = analysis?.topGenres?.length
    ? analysis.topGenres
    : [...genreWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, score]) => ({ name, score }));

  const favoriteGenre = topGenres[0]?.name || null;
  const frequentGenres = new Set(
    [...genreWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name),
  );

  const watchlistGenres = new Set(watchlist.flatMap(movie => getGenres(movie)));
  const favoriteGenreSet = new Set(favorites.flatMap(movie => getGenres(movie)));

  const excludedKeys = new Set(
    movies.filter(shouldExcludeFromRecommendations).map(getContentUniqueKey),
  );

  movies.forEach(movie => excludedKeys.add(getContentUniqueKey(movie)));

  return {
    topGenres,
    favoriteGenre,
    frequentGenres,
    highRatedGenres: buildHighRatedGenres(movies),
    genreWeights,
    watchlistGenres,
    favoriteGenreSet,
    watchlistItems: watchlist,
    favoriteCount: favorites.length,
    watchlistCount: watchlist.length,
    likedCount: liked.length,
    excludedKeys,
    hasFavoriteSignal: favorites.length > 0 || (analysis?.hasFavoriteSignal ?? false),
    confidence: analysis?.confidence ?? 0,
    movieRecommendationGenreIds: analysis?.movieRecommendationGenreIds ?? [],
    tvRecommendationGenreIds: analysis?.tvRecommendationGenreIds ?? [],
  };
};

export const filterInvalidRecommendations = (candidates = [], tasteProfile) => (
  candidates.filter(item => !tasteProfile.excludedKeys.has(getContentUniqueKey(item)))
);

export const calculateRecommendationScore = (item, tasteProfile, options = {}) => {
  const recentKeys = options.recentKeys ?? new Set();
  const refreshSeed = options.refreshSeed ?? 0;
  const categoryBoost = options.categoryBoost ?? null;
  const key = getContentUniqueKey(item);

  if (tasteProfile.excludedKeys.has(key)) {
    return { score: -1, flags: {}, matches: getGenreMatches(item, tasteProfile) };
  }

  let score = 8 + (Math.random() * 4) + ((refreshSeed % 5) * 0.3);
  const flags = {
    favoriteGenre: false,
    frequentGenre: false,
    highRatedGenre: false,
    watchlistGenre: false,
    favoriteSimilar: false,
    tmdbHigh: false,
    recent: false,
  };

  const matches = getGenreMatches(item, tasteProfile);

  if (matches.favorite) {
    score += SCORE.FAVORITE_GENRE;
    flags.favoriteGenre = true;
  }

  if (matches.frequent) {
    score += SCORE.FREQUENT_GENRE;
    flags.frequentGenre = true;
  }

  if (matches.highRated) {
    score += SCORE.HIGH_RATED_GENRE;
    flags.highRatedGenre = true;
  }

  if (matches.watchlist) {
    score += SCORE.WATCHLIST_GENRE;
    flags.watchlistGenre = true;
  }

  if (matches.similar) {
    score += SCORE.FAVORITE_SIMILAR;
    flags.favoriteSimilar = true;
  }

  matches.all.forEach((genre) => {
    score += Math.min(10, (tasteProfile.genreWeights.get(genre) || 0) * 1.2);
  });

  const tmdbRating = Number(item.rating ?? item.voteAverage ?? 0);
  if (tmdbRating >= 7.5) {
    score += SCORE.TMDB_HIGH;
    flags.tmdbHigh = true;
  } else if (tmdbRating >= 7) {
    score += 8;
  }

  if (recentKeys.has(key)) {
    score -= SCORE.RECENT_PENALTY;
    flags.recent = true;
  }

  if (categoryBoost === RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE && matches.favorite) {
    score += 20;
  }

  if (categoryBoost === RECOMMENDATION_CATEGORY_IDS.HIGH_RATED && tmdbRating >= 7.5) {
    score += 18;
  }

  if (categoryBoost === RECOMMENDATION_CATEGORY_IDS.SIMILAR && matches.similar) {
    score += 16;
  }

  if (categoryBoost === RECOMMENDATION_CATEGORY_IDS.WATCHLIST && matches.watchlist) {
    score += 14;
  }

  return { score, flags, matches };
};

export const getRecommendationReason = (item, tasteProfile, meta = {}) => {
  const { category, matches = getGenreMatches(item, tasteProfile), flags = {} } = meta;
  const tmdbRating = Number(item.rating ?? item.voteAverage ?? 0);

  if (category === RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE && matches.favorite) {
    return `${matches.favorite} türünü sevdiğin için önerildi.`;
  }

  if (category === RECOMMENDATION_CATEGORY_IDS.HIGH_RATED) {
    return tmdbRating >= 7.5
      ? `TMDB ${tmdbRating.toFixed(1)} puanlı, henüz izlemediğin bir içerik.`
      : 'Yüksek puanlı ve henüz izlemediğin bir içerik.';
  }

  if (category === RECOMMENDATION_CATEGORY_IDS.WATCHLIST) {
    return 'İzlenecekler listendeki tür alışkanlıklarına uygun.';
  }

  if (category === RECOMMENDATION_CATEGORY_IDS.SIMILAR) {
    return matches.similar
      ? `${matches.similar} türünde favorilerine benzer bir yapım.`
      : 'Favorilerine benzer bir içerik.';
  }

  if (flags.favoriteSimilar && matches.similar) {
    return `${matches.similar} türünde favorilerine benzer bir yapım.`;
  }

  if (matches.frequent && matches.frequent !== tasteProfile.favoriteGenre) {
    return `${matches.frequent} türüne olan ilgin için önerildi.`;
  }

  if (matches.primary && tasteProfile.favoriteGenre && matches.primary === tasteProfile.favoriteGenre) {
    return `${matches.primary} türünü sık izlediğin için önerildi.`;
  }

  if (flags.tmdbHigh) {
    return 'Yüksek puanlı ve izleme alışkanlıklarına uygun.';
  }

  if (matches.primary) {
    return `${matches.primary} türü zevk profiline uyuyor.`;
  }

  return 'İzleme alışkanlıklarına uygun bir öneri.';
};

const pickWeightedFromPool = (pool, count) => {
  if (pool.length <= count) return [...pool];

  const selected = [];
  const remaining = [...pool];

  while (selected.length < count && remaining.length > 0) {
    const total = remaining.reduce((sum, entry) => sum + Math.max(entry.score, 1), 0);
    let roll = Math.random() * total;
    let picked = false;

    for (let index = 0; index < remaining.length; index += 1) {
      roll -= Math.max(remaining[index].score, 1);
      if (roll <= 0) {
        selected.push(remaining[index]);
        remaining.splice(index, 1);
        picked = true;
        break;
      }
    }

    if (!picked) {
      selected.push(remaining[0]);
      remaining.splice(0, 1);
    }
  }

  return selected;
};

const buildScoredEntry = (item, tasteProfile, options) => {
  const { score, flags, matches } = calculateRecommendationScore(item, tasteProfile, options);

  return {
    item,
    score,
    flags,
    matches,
    reason: '',
    category: RECOMMENDATION_CATEGORY_IDS.PERSONAL,
  };
};

const selectForCategory = ({
  pool,
  usedKeys,
  tasteProfile,
  categoryId,
  maxCount,
  minCount = 2,
  predicate = () => true,
  categoryBoost = null,
  refreshSeed = 0,
  recentKeys = new Set(),
}) => {
  const available = pool
    .filter(entry => !usedKeys.has(getContentUniqueKey(entry.item)))
    .filter(predicate)
    .map(entry => buildScoredEntry(entry.item, tasteProfile, {
      recentKeys,
      refreshSeed,
      categoryBoost: categoryBoost || categoryId,
    }))
    .filter(entry => entry.score >= 0 && !entry.flags.recent)
    .sort((a, b) => b.score - a.score);

  if (available.length < minCount) return [];

  const picked = pickWeightedFromPool(available, maxCount).map(entry => ({
    ...entry,
    category: categoryId,
    reason: getRecommendationReason(entry.item, tasteProfile, {
      category: categoryId,
      matches: entry.matches,
      flags: entry.flags,
    }),
  }));

  picked.forEach(entry => usedKeys.add(getContentUniqueKey(entry.item)));

  return picked;
};

export const removeDuplicateRecommendations = (groups = []) => {
  const usedKeys = new Set();

  return groups
    .map(group => ({
      ...group,
      items: group.items.filter((entry) => {
        const key = getContentUniqueKey(entry.item);
        if (usedKeys.has(key)) return false;
        usedKeys.add(key);
        return true;
      }),
    }))
    .filter(group => group.items.length > 0);
};

export const splitRecommendationsIntoUniqueCategories = (
  candidates = [],
  tasteProfile,
  options = {},
) => {
  const maxPerCategory = options.maxPerCategory ?? 4;
  const minPerCategory = options.minPerCategory ?? 2;
  const refreshSeed = options.refreshSeed ?? 0;
  const recentEntries = options.recentRecommendations ?? getRecentInsightRecommendations();
  const recentKeys = new Set(recentEntries.map(item => item.key || item.id).filter(Boolean));

  const validCandidates = filterInvalidRecommendations(candidates, tasteProfile);
  const usedKeys = new Set();
  const groups = [];

  const basePool = validCandidates.map(item => buildScoredEntry(item, tasteProfile, {
    recentKeys,
    refreshSeed,
  })).filter(entry => entry.score >= 0);

  const personal = selectForCategory({
    pool: basePool,
    usedKeys,
    tasteProfile,
    categoryId: RECOMMENDATION_CATEGORY_IDS.PERSONAL,
    maxCount: maxPerCategory,
    minCount: 1,
    predicate: () => true,
    refreshSeed,
    recentKeys,
  });

  if (personal.length > 0) {
    groups.push({
      id: RECOMMENDATION_CATEGORY_IDS.PERSONAL,
      title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.PERSONAL],
      items: personal,
    });
  }

  if (tasteProfile.favoriteGenre) {
    const favoriteGenreItems = selectForCategory({
      pool: basePool,
      usedKeys,
      tasteProfile,
      categoryId: RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE,
      maxCount: maxPerCategory,
      minCount: minPerCategory,
      predicate: entry => Boolean(getGenreMatches(entry.item, tasteProfile).favorite),
      categoryBoost: RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE,
      refreshSeed,
      recentKeys,
    });

    if (favoriteGenreItems.length > 0) {
      groups.push({
        id: RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE,
        title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.FAVORITE_GENRE],
        items: favoriteGenreItems,
      });
    }
  }

  const highRated = selectForCategory({
    pool: basePool,
    usedKeys,
    tasteProfile,
    categoryId: RECOMMENDATION_CATEGORY_IDS.HIGH_RATED,
    maxCount: maxPerCategory,
    minCount: minPerCategory,
    predicate: entry => Number(entry.item.rating ?? entry.item.voteAverage ?? 0) >= 7.5,
    categoryBoost: RECOMMENDATION_CATEGORY_IDS.HIGH_RATED,
    refreshSeed,
    recentKeys,
  });

  if (highRated.length > 0) {
    groups.push({
      id: RECOMMENDATION_CATEGORY_IDS.HIGH_RATED,
      title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.HIGH_RATED],
      items: highRated,
    });
  }

  const watchlistLibrary = (tasteProfile.watchlistItems || [])
    .filter(item => !usedKeys.has(getContentUniqueKey(item)))
    .slice(0, maxPerCategory)
    .map(item => ({
      item,
      score: 50,
      flags: { watchlistGenre: true },
      matches: getGenreMatches(item, tasteProfile),
      category: RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
      reason: 'İzlenecekler listende bekleyen bir seçim.',
    }));

  if (watchlistLibrary.length >= minPerCategory) {
    watchlistLibrary.forEach(entry => usedKeys.add(getContentUniqueKey(entry.item)));
    groups.push({
      id: RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
      title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.WATCHLIST],
      items: watchlistLibrary,
    });
  } else {
    const watchlistGenreItems = selectForCategory({
      pool: basePool,
      usedKeys,
      tasteProfile,
      categoryId: RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
      maxCount: maxPerCategory,
      minCount: minPerCategory,
      predicate: entry => Boolean(getGenreMatches(entry.item, tasteProfile).watchlist),
      categoryBoost: RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
      refreshSeed,
      recentKeys,
    });

    if (watchlistGenreItems.length > 0) {
      groups.push({
        id: RECOMMENDATION_CATEGORY_IDS.WATCHLIST,
        title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.WATCHLIST],
        items: watchlistGenreItems,
      });
    }
  }

  const similar = selectForCategory({
    pool: basePool,
    usedKeys,
    tasteProfile,
    categoryId: RECOMMENDATION_CATEGORY_IDS.SIMILAR,
    maxCount: maxPerCategory,
    minCount: minPerCategory,
    predicate: entry => Boolean(getGenreMatches(entry.item, tasteProfile).similar),
    categoryBoost: RECOMMENDATION_CATEGORY_IDS.SIMILAR,
    refreshSeed,
    recentKeys,
  });

  if (similar.length > 0) {
    groups.push({
      id: RECOMMENDATION_CATEGORY_IDS.SIMILAR,
      title: RECOMMENDATION_CATEGORY_LABELS[RECOMMENDATION_CATEGORY_IDS.SIMILAR],
      items: similar,
    });
  }

  return removeDuplicateRecommendations(groups).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id),
  );
};

export const getSmartRecommendations = (candidates = [], tasteProfile, options = {}) => {
  const refreshSeed = options.refreshSeed ?? 0;
  const recentRecommendations = options.recentRecommendations ?? getRecentInsightRecommendations();

  if (candidates.length === 0) {
    return {
      groups: [],
      flat: [],
      emptyReason: 'no_api_results',
    };
  }

  const groups = splitRecommendationsIntoUniqueCategories(candidates, tasteProfile, {
    maxPerCategory: options.maxPerCategory ?? 4,
    minPerCategory: options.minPerCategory ?? 2,
    refreshSeed,
    recentRecommendations,
  });

  const flat = groups.flatMap(group => group.items);

  if (flat.length === 0) {
    const emptyReason = !tasteProfile.hasFavoriteSignal && tasteProfile.confidence < 30
      ? 'need_favorites'
      : 'no_candidates';

    return { groups: [], flat: [], emptyReason };
  }

  return { groups, flat, emptyReason: null };
};

export const getInsightEmptyMessage = (emptyReason) => {
  if (emptyReason === 'need_favorites') {
    return 'Sana daha iyi öneriler sunabilmemiz için birkaç film veya dizi favorilerine ekle.';
  }

  if (emptyReason === 'no_candidates') {
    return 'Tüm uygun içerikleri izlemişsin gibi görünüyor.';
  }

  if (emptyReason === 'no_api_results') {
    return 'Şu an farklı öneri bulunamadı.';
  }

  return 'İzlediklerini işaretledikçe önerilerin daha doğru hale gelecek.';
};
