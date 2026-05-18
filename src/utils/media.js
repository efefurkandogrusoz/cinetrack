export const MEDIA_TYPES = {
  movie: 'movie',
  tv: 'tv',
};

export const mediaTypeLabels = {
  movie: 'Film',
  tv: 'Dizi',
};

export const watchStatusLabels = {
  watchlist: 'İzlenecek',
  watching: 'İzleniyor',
  watched: 'İzlendi',
  completed: 'Tamamlandı',
  dropped: 'Bırakıldı',
};

export const getMediaType = (item) => item?.mediaType || MEDIA_TYPES.movie;

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

export const normalizeMediaItem = (item = {}) => {
  const mediaType = item.mediaType || MEDIA_TYPES.movie;
  const favorite = Boolean(item.favorite ?? item.isFavorite);
  const watchStatus = item.watchStatus || (
    mediaType === MEDIA_TYPES.tv
      ? (item.watched ? 'completed' : 'watchlist')
      : (item.watched ? 'watched' : 'watchlist')
  );
  const watched = mediaType === MEDIA_TYPES.tv
    ? watchStatus === 'completed' || Boolean(item.watched)
    : watchStatus === 'watched' || Boolean(item.watched);

  return {
    ...item,
    mediaType,
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
    currentSeason: Number(item.currentSeason) || 1,
    currentEpisode: Number(item.currentEpisode) || 0,
    totalWatchedEpisodes: Number(item.totalWatchedEpisodes) || 0,
    totalSeasons: Number(item.totalSeasons) || 0,
    totalEpisodes: Number(item.totalEpisodes) || 0,
    seasonEpisodeCounts: item.seasonEpisodeCounts || {},
  };
};
