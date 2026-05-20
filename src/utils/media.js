export const MEDIA_TYPES = {
  movie: 'movie',
  tv: 'tv',
};

export const mediaTypeLabels = {
  movie: 'Film',
  tv: 'Dizi',
};

export const watchStatusLabels = {
  watchlist: 'İzlemeyi planlıyorum',
  watching: 'Devam ediyorum',
  watched: 'İzlendi',
  completed: 'Tamamladım',
  dropped: 'Bıraktım',
};

export const getMediaType = (item) => item?.mediaType || item?.media_type || MEDIA_TYPES.movie;

export const getMediaKey = (item) => `${getMediaType(item)}:${item?.id}`;

export const isTvShow = (item) => getMediaType(item) === MEDIA_TYPES.tv;

export const getMediaTypeLabel = (item) => mediaTypeLabels[getMediaType(item)] || mediaTypeLabels.movie;

export const getWatchStatus = (item) => {
  if (item?.watchStatus) return item.watchStatus;
  if (isTvShow(item)) return item?.watched ? 'completed' : 'watchlist';
  return item?.watched ? 'watched' : 'watchlist';
};

export const getWatchStatusLabel = (itemOrStatus) => {
  const status = typeof itemOrStatus === 'string' ? itemOrStatus : getWatchStatus(itemOrStatus);
  return watchStatusLabels[status] || watchStatusLabels.watchlist;
};

const toPositiveInteger = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const clamp = (value, min, max = 0) => {
  const number = toPositiveInteger(value, min);
  const lowerBounded = Math.max(min, number);
  return max > 0 ? Math.min(lowerBounded, max) : lowerBounded;
};

export const getEpisodeCountForSeason = (item = {}, seasonValue = 1) => {
  const season = toPositiveInteger(seasonValue, 1);
  const counts = item.seasonEpisodeCounts || {};
  const directCount = toPositiveInteger(counts[season], 0);
  if (directCount > 0) return directCount;

  const totalSeasons = toPositiveInteger(item.totalSeasons, 0);
  const totalEpisodes = toPositiveInteger(item.totalEpisodes, 0);
  if (totalSeasons <= 1 && totalEpisodes > 0) return totalEpisodes;

  return 0;
};

const getKnownSeasonCount = (item = {}) => {
  const countKeys = Object.keys(item.seasonEpisodeCounts || {})
    .map(key => toPositiveInteger(key, 0))
    .filter(Boolean);

  return Math.max(toPositiveInteger(item.totalSeasons, 0), ...countKeys, 0);
};

export const getWatchedEpisodeCount = (item = {}) => {
  const currentSeason = toPositiveInteger(item.currentSeason, 1);
  const currentEpisode = toPositiveInteger(item.currentEpisode, 1);
  const totalEpisodes = toPositiveInteger(item.totalEpisodes, 0);
  const status = getWatchStatus(item);
  const explicitWatched = toPositiveInteger(item.watchedEpisodes ?? item.totalWatchedEpisodes, 0);

  if (status === 'completed' && totalEpisodes > 0) return totalEpisodes;
  if (status === 'watchlist' && explicitWatched <= 0) return 0;

  const counts = item.seasonEpisodeCounts || {};
  const hasSeasonCounts = Object.values(counts).some(count => toPositiveInteger(count, 0) > 0);

  if (hasSeasonCounts) {
    let watchedEpisodes = 0;
    for (let season = 1; season < currentSeason; season += 1) {
      watchedEpisodes += toPositiveInteger(counts[season], 0);
    }

    const currentSeasonLimit = getEpisodeCountForSeason(item, currentSeason);
    watchedEpisodes += currentSeasonLimit > 0
      ? Math.min(currentEpisode, currentSeasonLimit)
      : currentEpisode;

    return totalEpisodes > 0 ? Math.min(watchedEpisodes, totalEpisodes) : watchedEpisodes;
  }

  if (explicitWatched > 0) return totalEpisodes > 0 ? Math.min(explicitWatched, totalEpisodes) : explicitWatched;

  if (totalEpisodes > 0 && item.totalSeasons > 0) {
    const averageEpisodesPerSeason = Math.ceil(totalEpisodes / Number(item.totalSeasons));
    return Math.min(((currentSeason - 1) * averageEpisodesPerSeason) + currentEpisode, totalEpisodes);
  }

  return currentEpisode;
};

export const getTvProgress = (item = {}) => {
  const watchedEpisodes = getWatchedEpisodeCount(item);
  const totalEpisodes = toPositiveInteger(item.totalEpisodes, 0);
  const progressPercent = totalEpisodes > 0
    ? Math.min(100, Math.round((watchedEpisodes / totalEpisodes) * 100))
    : Math.min(100, toPositiveInteger(item.progressPercent, 0));

  return {
    watchedEpisodes,
    progressPercent,
  };
};

export const normalizeTvTracking = (item = {}, updates = {}) => {
  const source = { ...item, ...updates, mediaType: MEDIA_TYPES.tv };
  const totalSeasons = getKnownSeasonCount(source);
  const currentSeason = clamp(source.currentSeason, 1, totalSeasons);
  const episodeLimit = getEpisodeCountForSeason(source, currentSeason);
  const currentEpisode = clamp(source.currentEpisode, 1, episodeLimit);
  const watchStatus = source.watchStatus || (source.watched ? 'completed' : 'watchlist');
  const progress = getTvProgress({
    ...source,
    currentSeason,
    currentEpisode,
    watchStatus,
  });

  return {
    watchStatus,
    currentSeason,
    currentEpisode,
    watchedEpisodes: progress.watchedEpisodes,
    totalWatchedEpisodes: progress.watchedEpisodes,
    progressPercent: progress.progressPercent,
  };
};

export const getNextEpisodeProgress = (item = {}) => {
  const tracking = normalizeTvTracking(item);
  if (tracking.watchStatus === 'completed') return tracking;

  const base = { ...item, ...tracking, mediaType: MEDIA_TYPES.tv };
  const totalSeasons = getKnownSeasonCount(base);
  const seasonEpisodeCount = getEpisodeCountForSeason(base, tracking.currentSeason);
  let nextSeason = tracking.currentSeason;
  let nextEpisode = tracking.currentEpisode + 1;
  let nextStatus = 'watching';

  if (seasonEpisodeCount > 0 && nextEpisode > seasonEpisodeCount) {
    if (totalSeasons > 0 && tracking.currentSeason >= totalSeasons) {
      nextEpisode = seasonEpisodeCount;
      nextStatus = 'completed';
    } else {
      nextSeason += 1;
      nextEpisode = 1;
    }
  }

  const nextTracking = normalizeTvTracking(base, {
    currentSeason: nextSeason,
    currentEpisode: nextEpisode,
    watchStatus: nextStatus,
  });

  if (base.totalEpisodes > 0 && nextTracking.watchedEpisodes >= Number(base.totalEpisodes)) {
    return normalizeTvTracking(base, {
      currentSeason: nextTracking.currentSeason,
      currentEpisode: nextTracking.currentEpisode,
      watchStatus: 'completed',
    });
  }

  return nextTracking;
};

export const normalizeMediaItem = (item = {}) => {
  const mediaType = item.mediaType || item.media_type || MEDIA_TYPES.movie;
  const favorite = Boolean(item.favorite ?? item.isFavorite);
  const watchStatus = item.watchStatus || (
    mediaType === MEDIA_TYPES.tv
      ? (item.watched ? 'completed' : 'watchlist')
      : (item.watched ? 'watched' : 'watchlist')
  );
  const watched = mediaType === MEDIA_TYPES.tv
    ? watchStatus === 'completed' || Boolean(item.watched)
    : watchStatus === 'watched' || Boolean(item.watched);

  const tvTracking = mediaType === MEDIA_TYPES.tv
    ? normalizeTvTracking({ ...item, mediaType, watchStatus })
    : {};

  return {
    ...item,
    mediaType,
    media_type: mediaType,
    title: item.title || item.name || 'İsimsiz',
    posterPath: item.posterPath || item.poster_path || null,
    backdropPath: item.backdropPath || item.backdrop_path || null,
    releaseDate: item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date || '',
    rating: item.rating ?? item.voteAverage ?? item.vote_average ?? 0,
    voteAverage: item.voteAverage ?? item.rating ?? item.vote_average ?? 0,
    favorite,
    isFavorite: favorite,
    watched,
    watchStatus,
    currentSeason: mediaType === MEDIA_TYPES.tv ? tvTracking.currentSeason : Number(item.currentSeason) || 1,
    currentEpisode: mediaType === MEDIA_TYPES.tv ? tvTracking.currentEpisode : Number(item.currentEpisode) || 0,
    watchedEpisodes: mediaType === MEDIA_TYPES.tv ? tvTracking.watchedEpisodes : Number(item.watchedEpisodes) || 0,
    totalWatchedEpisodes: mediaType === MEDIA_TYPES.tv ? tvTracking.totalWatchedEpisodes : Number(item.totalWatchedEpisodes) || 0,
    progressPercent: mediaType === MEDIA_TYPES.tv ? tvTracking.progressPercent : Number(item.progressPercent) || 0,
    totalSeasons: Number(item.totalSeasons) || 0,
    totalEpisodes: Number(item.totalEpisodes) || 0,
    seasonEpisodeCounts: item.seasonEpisodeCounts || {},
  };
};
