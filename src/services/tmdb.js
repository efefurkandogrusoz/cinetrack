// TMDB API Service
// Configure your TMDB API key in environment variables
// VITE_TMDB_API_KEY=your_api_key_here

const API_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
export const LANGUAGE = 'tr-TR';
export const FALLBACK_LANGUAGE = 'en-US';

export const MOVIE_GENRE_MAP = {
  12: 'Macera',
  14: 'Fantastik',
  16: 'Animasyon',
  18: 'Dram',
  27: 'Korku',
  28: 'Aksiyon',
  35: 'Komedi',
  36: 'Tarih',
  37: 'Western',
  53: 'Gerilim',
  80: 'Suç',
  99: 'Belgesel',
  878: 'Bilim Kurgu',
  9648: 'Gizem',
  10402: 'Müzik',
  10749: 'Romantik',
  10751: 'Aile',
  10752: 'Savaş',
  10770: 'TV Filmi',
};

export const TV_GENRE_MAP = {
  16: 'Animasyon',
  18: 'Dram',
  35: 'Komedi',
  37: 'Western',
  80: 'Suç',
  99: 'Belgesel',
  9648: 'Gizem',
  10751: 'Aile',
  10759: 'Aksiyon & Macera',
  10762: 'Çocuk',
  10763: 'Haber',
  10764: 'Reality',
  10765: 'Bilim Kurgu & Fantastik',
  10766: 'Pembe Dizi',
  10767: 'Talk Show',
  10768: 'Savaş & Politik',
};

export const GENRE_MAP = MOVIE_GENRE_MAP;

export const ALL_GENRE_MAP = {
  ...MOVIE_GENRE_MAP,
  ...TV_GENRE_MAP,
};

const getApiKey = () => {
  const key = import.meta.env.VITE_TMDB_API_KEY;
  if (!key) {
    console.warn('TMDB API key not found. Please set VITE_TMDB_API_KEY in .env');
  }
  return key;
};

const fetchTmdb = async (path, params = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    ...params,
  });

  const response = await fetch(`${API_BASE_URL}${path}?${searchParams.toString()}`);
  if (!response.ok) throw new Error(`TMDB request failed: ${path}`);
  return response.json();
};

const withLanguage = (params = {}, language = LANGUAGE) => ({
  language,
  ...params,
});

const fetchLocalizedTmdb = async (path, params = {}) => {
  const [localizedResult, fallbackResult] = await Promise.allSettled([
    fetchTmdb(path, withLanguage(params, LANGUAGE)),
    fetchTmdb(path, withLanguage(params, FALLBACK_LANGUAGE)),
  ]);

  const localizedData = localizedResult.status === 'fulfilled' ? localizedResult.value : null;
  const fallbackData = fallbackResult.status === 'fulfilled' ? fallbackResult.value : null;

  if (!localizedData && !fallbackData && localizedResult.status === 'rejected') {
    throw localizedResult.reason;
  }

  return {
    data: localizedData || fallbackData,
    fallbackData: localizedData ? fallbackData : null,
  };
};

const getGenreMap = (mediaType) => (mediaType === 'tv' ? TV_GENRE_MAP : MOVIE_GENRE_MAP);

const getFormattedMediaKey = (mediaType, id) => `${mediaType}:${id}`;

const isExcludedMedia = (media, excludedValues = []) => {
  const excluded = new Set(Array.from(excludedValues, value => String(value)));
  const mediaType = media.mediaType || media.media_type || 'movie';

  return excluded.has(String(media.id)) || excluded.has(getFormattedMediaKey(mediaType, media.id));
};

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const getNoOverviewMessage = (mediaType) => (
  mediaType === 'tv'
    ? 'Bu dizi için açıklama bulunamadı.'
    : 'Bu film için açıklama bulunamadı.'
);

const getYear = (dateValue) => {
  if (!dateValue) return 'N/A';
  const year = new Date(dateValue).getFullYear();
  return Number.isFinite(year) ? year : 'N/A';
};

const getMediaTypeFromItem = (item, fallbackMediaType = 'movie') => (
  item?.media_type === 'tv' || fallbackMediaType === 'tv' ? 'tv' : 'movie'
);

const getFallbackLookupKey = (item, fallbackMediaType = 'movie') => (
  `${getMediaTypeFromItem(item, fallbackMediaType)}:${item.id}`
);

const mergeLocalizedMediaItem = (item, fallbackItem = null, fallbackMediaType = 'movie') => {
  if (!item && !fallbackItem) return null;

  const baseItem = item || fallbackItem;
  const mediaType = getMediaTypeFromItem(baseItem, fallbackMediaType);
  const overview = hasText(item?.overview)
    ? item.overview.trim()
    : hasText(fallbackItem?.overview)
      ? fallbackItem.overview.trim()
      : getNoOverviewMessage(mediaType);

  return {
    ...fallbackItem,
    ...item,
    overview,
  };
};

const mergeLocalizedResults = (items = [], fallbackItems = [], fallbackMediaType = 'movie') => {
  const fallbackMap = new Map(
    fallbackItems
      .filter(item => item?.id)
      .map(item => [getFallbackLookupKey(item, item.media_type || fallbackMediaType), item])
  );

  return items.map(item => mergeLocalizedMediaItem(
    item,
    fallbackMap.get(getFallbackLookupKey(item, item.media_type || fallbackMediaType)),
    item.media_type || fallbackMediaType,
  )).filter(Boolean);
};

const getTrailerKey = (localizedVideos = [], fallbackVideos = []) => {
  const trYoutubeVideos = localizedVideos.filter(video => video.site === 'YouTube');
  const enYoutubeVideos = fallbackVideos.filter(video => video.site === 'YouTube');
  const allYoutubeVideos = [...trYoutubeVideos, ...enYoutubeVideos];

  const trailer =
    trYoutubeVideos.find(video => video.type === 'Trailer' && video.official) ||
    trYoutubeVideos.find(video => video.type === 'Teaser') ||
    enYoutubeVideos.find(video => video.type === 'Trailer' && video.official) ||
    enYoutubeVideos.find(video => video.type === 'Teaser') ||
    allYoutubeVideos[0];

  return trailer?.key || null;
};

const getLocalizedTrailerKey = async (mediaId, mediaType) => {
  const [localizedResult, fallbackResult] = await Promise.allSettled([
    fetchTmdb(`/${mediaType}/${mediaId}/videos`, withLanguage({}, LANGUAGE)),
    fetchTmdb(`/${mediaType}/${mediaId}/videos`, withLanguage({}, FALLBACK_LANGUAGE)),
  ]);

  const localizedVideos = localizedResult.status === 'fulfilled'
    ? localizedResult.value?.results || []
    : [];
  const fallbackVideos = fallbackResult.status === 'fulfilled'
    ? fallbackResult.value?.results || []
    : [];

  return getTrailerKey(localizedVideos, fallbackVideos);
};

const formatSeasonCounts = (seasons = []) => (
  seasons
    .filter(season => season.season_number > 0)
    .reduce((counts, season) => ({
      ...counts,
      [season.season_number]: season.episode_count || 0,
    }), {})
);

const formatMedia = (item, fallbackMediaType = 'movie') => {
  const mediaType = getMediaTypeFromItem(item, fallbackMediaType);
  const title = mediaType === 'tv'
    ? item.name || item.original_name || item.title
    : item.title || item.original_title || item.name;
  const releaseDate = mediaType === 'tv' ? item.first_air_date : item.release_date;
  const genreMap = getGenreMap(mediaType);
  const genreIds = item.genre_ids || item.genres?.map(genre => genre.id) || [];
  const seasons = item.seasons || [];
  const seasonEpisodeCounts = formatSeasonCounts(seasons);
  const overview = hasText(item.overview) ? item.overview.trim() : getNoOverviewMessage(mediaType);

  return {
    id: item.id,
    mediaType,
    media_type: mediaType,
    title,
    name: title,
    poster_path: item.poster_path,
    posterPath: item.poster_path || null,
    backdrop_path: item.backdrop_path,
    backdropPath: item.backdrop_path || null,
    release_date: releaseDate || '',
    releaseDate: releaseDate || '',
    first_air_date: mediaType === 'tv' ? releaseDate || '' : '',
    firstAirDate: mediaType === 'tv' ? releaseDate || '' : '',
    overview,
    rating: item.vote_average || 0,
    voteAverage: item.vote_average || 0,
    poster: item.poster_path ? `${POSTER_BASE_URL}${item.poster_path}` : null,
    backdrop: item.backdrop_path ? `${BACKDROP_BASE_URL}${item.backdrop_path}` : null,
    year: getYear(releaseDate),
    genre_ids: genreIds,
    genres: genreIds.map(id => genreMap[id] || ALL_GENRE_MAP[id]).filter(Boolean),
    totalSeasons: item.number_of_seasons || seasons.filter(season => season.season_number > 0).length || 0,
    totalEpisodes: item.number_of_episodes || Object.values(seasonEpisodeCounts).reduce((total, count) => total + count, 0),
    status: item.status || null,
    seasonEpisodeCounts,
  };
};

const formatMediaList = (items = [], fallbackMediaType = 'movie', options = {}) => {
  const { requirePoster = true } = options;

  return (
  items
    .filter(item => {
      const mediaType = item.media_type || fallbackMediaType;
      const title = mediaType === 'tv' ? item.name || item.original_name : item.title || item.original_title;
      return (!requirePoster || item.poster_path) && item.id && title && (mediaType === 'movie' || mediaType === 'tv');
    })
    .map(item => formatMedia(item, item.media_type || fallbackMediaType))
    .slice(0, 20)
  );
};

const sortMixedMedia = (items, sortBy) => {
  if (sortBy === 'vote_average.desc') {
    return items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  if (sortBy === 'primary_release_date.desc') {
    return items.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
  }

  return items;
};

export const searchMedia = async (query, mediaType = 'movie') => {
  if (!query.trim()) return [];

  try {
    const cleanedMediaType = mediaType === 'all' ? 'multi' : mediaType;
    const { data, fallbackData } = await fetchLocalizedTmdb(`/search/${cleanedMediaType}`, {
      query: query.trim(),
      include_adult: 'false',
    });

    if (!data) return [];

    const primaryResults = mediaType === 'all'
      ? (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      : data.results || [];
    const fallbackResults = mediaType === 'all'
      ? (fallbackData?.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      : fallbackData?.results || [];

    return formatMediaList(
      mergeLocalizedResults(primaryResults, fallbackResults, mediaType === 'tv' ? 'tv' : 'movie'),
      mediaType === 'tv' ? 'tv' : 'movie',
    );
  } catch (error) {
    console.error('Error searching media:', error);
    return [];
  }
};

export const searchMovies = (query) => searchMedia(query, 'movie');
export const searchTvShows = (query) => searchMedia(query, 'tv');

export const getMovieDetails = async (movieId) => {
  try {
    const { data, fallbackData } = await fetchLocalizedTmdb(`/movie/${movieId}`);
    const localizedData = mergeLocalizedMediaItem(data, fallbackData, 'movie');
    return localizedData ? formatMedia(localizedData, 'movie') : null;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const getMediaFullDetails = async (mediaId, mediaType = 'movie') => {
  try {
    const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';
    const [{ data, fallbackData }, trailerKey] = await Promise.all([
      fetchLocalizedTmdb(`/${cleanedType}/${mediaId}`, {
        append_to_response: 'credits',
      }),
      getLocalizedTrailerKey(mediaId, cleanedType),
    ]);

    if (!data) return null;

    const localizedData = mergeLocalizedMediaItem(data, fallbackData, cleanedType);

    return {
      ...formatMedia(localizedData, cleanedType),
      runtime: cleanedType === 'movie' ? localizedData.runtime || null : null,
      trailerKey,
      cast: (localizedData.credits?.cast || []).slice(0, 8).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
      })),
    };
  } catch (error) {
    console.error('Error fetching full media details:', error);
    return null;
  }
};

export const getMovieFullDetails = (movieId) => getMediaFullDetails(movieId, 'movie');
export const getTvShowFullDetails = (showId) => getMediaFullDetails(showId, 'tv');

export const discoverMoviesByGenres = async (genreIds = [], excludedMovieIds = []) => {
  const cleanedGenreIds = genreIds.filter(Boolean).slice(0, 3);
  if (cleanedGenreIds.length === 0) return [];

  try {
    const { data, fallbackData } = await fetchLocalizedTmdb('/discover/movie', {
      include_adult: 'false',
      sort_by: 'vote_average.desc',
      'vote_count.gte': '300',
      with_genres: cleanedGenreIds.join(','),
    });

    const excluded = new Set(excludedMovieIds);

    return formatMediaList(
      mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'movie'),
      'movie',
      { requirePoster: false },
    )
      .filter(movie => !isExcludedMedia(movie, excluded))
      .slice(0, 8);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const discoverTvShowsByGenres = async (genreIds = [], excludedShowIds = []) => {
  const cleanedGenreIds = genreIds.filter(Boolean).slice(0, 3);
  const hasGenreSignal = cleanedGenreIds.length > 0;

  try {
    const endpoint = hasGenreSignal ? '/discover/tv' : '/tv/popular';
    const params = {
      include_adult: 'false',
    };

    if (hasGenreSignal) {
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = '150';
      params.with_genres = cleanedGenreIds.join(',');
    }

    const { data, fallbackData } = await fetchLocalizedTmdb(endpoint, params);
    const excluded = new Set(excludedShowIds);

    return formatMediaList(
      mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'tv'),
      'tv',
      { requirePoster: false },
    )
      .filter(show => !isExcludedMedia(show, excluded))
      .slice(0, 8);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

const getCatalogForType = async ({
  query = '',
  genreId = 'all',
  sortBy = 'popularity.desc',
  page = 1,
  mediaType = 'movie',
} = {}) => {
  const cleanedQuery = query.trim();
  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const endpoint = cleanedQuery ? `search/${type}` : `discover/${type}`;
  const params = {
    include_adult: 'false',
    page: String(page),
  };

  if (cleanedQuery) {
    params.query = cleanedQuery;
  } else {
    params.sort_by = type === 'tv' && sortBy === 'primary_release_date.desc'
      ? 'first_air_date.desc'
      : sortBy;
    params['vote_count.gte'] = sortBy === 'vote_average.desc' ? '250' : '0';

    if (genreId !== 'all') {
      params.with_genres = String(genreId);
    }
  }

  const { data, fallbackData } = await fetchLocalizedTmdb(`/${endpoint}`, params);

  return {
    results: formatMediaList(mergeLocalizedResults(data?.results || [], fallbackData?.results || [], type), type),
    page: data?.page || page,
    totalPages: Math.min(data?.total_pages || 1, 500),
  };
};

export const getMovieCatalog = async ({
  query = '',
  genreId = 'all',
  sortBy = 'popularity.desc',
  page = 1,
  mediaType = 'movie',
} = {}) => {
  try {
    if (mediaType === 'all') {
      if (query.trim()) {
        const { data, fallbackData } = await fetchLocalizedTmdb('/search/multi', {
          query: query.trim(),
          include_adult: 'false',
          page: String(page),
        });
        const primaryResults = (data?.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
        const fallbackResults = (fallbackData?.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        return {
          results: sortMixedMedia(formatMediaList(mergeLocalizedResults(primaryResults, fallbackResults, 'movie'), 'movie'), sortBy),
          page: data?.page || page,
          totalPages: Math.min(data?.total_pages || 1, 500),
        };
      }

      const [movies, shows] = await Promise.all([
        getCatalogForType({ query, genreId, sortBy, page, mediaType: 'movie' }),
        getCatalogForType({ query, genreId, sortBy, page, mediaType: 'tv' }),
      ]);
      const merged = sortMixedMedia([...movies.results, ...shows.results], sortBy).slice(0, 20);

      return {
        results: merged,
        page,
        totalPages: Math.max(movies.totalPages, shows.totalPages),
      };
    }

    return await getCatalogForType({ query, genreId, sortBy, page, mediaType });
  } catch (error) {
    console.error('Error fetching media catalog:', error);
    return { results: [], page: 1, totalPages: 1 };
  }
};

export const getPopularMovies = async () => {
  try {
    const { data, fallbackData } = await fetchLocalizedTmdb('/movie/popular', { include_adult: 'false' });
    return formatMediaList(mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'movie'), 'movie').slice(0, 10);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
};

export const getPopularTvShows = async () => {
  try {
    const { data, fallbackData } = await fetchLocalizedTmdb('/tv/popular', { include_adult: 'false' });
    return formatMediaList(mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'tv'), 'tv').slice(0, 10);
  } catch (error) {
    console.error('Error fetching popular tv shows:', error);
    return [];
  }
};

export const getTopRatedMovies = async () => {
  try {
    const { data, fallbackData } = await fetchLocalizedTmdb('/movie/top_rated', { include_adult: 'false' });
    return formatMediaList(mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'movie'), 'movie').slice(0, 10);
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return [];
  }
};

const getTrendingMedia = async (mediaType, timeWindow) => {
  try {
    const { data, fallbackData } = await fetchLocalizedTmdb(`/trending/${mediaType}/${timeWindow}`);
    return formatMediaList(mergeLocalizedResults(data?.results || [], fallbackData?.results || [], mediaType), mediaType).slice(0, 10);
  } catch (error) {
    console.error(`Error fetching ${timeWindow} trending ${mediaType}:`, error);
    return [];
  }
};

export const getDailyTrendingMovies = () => getTrendingMedia('movie', 'day');
export const getWeeklyTrendingMovies = () => getTrendingMedia('movie', 'week');
export const getDailyTrendingTvShows = () => getTrendingMedia('tv', 'day');
export const getWeeklyTrendingTvShows = () => getTrendingMedia('tv', 'week');

export const getMediaTrailer = async (mediaId, mediaType = 'movie') => {
  try {
    if (!mediaId) return null;

    const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';
    return getLocalizedTrailerKey(mediaId, cleanedType);
  } catch (error) {
    console.error('Error fetching trailer:', error);
    return null;
  }
};

export const getMovieTrailer = (movieId) => getMediaTrailer(movieId, 'movie');
export const getTvShowTrailer = (showId) => getMediaTrailer(showId, 'tv');

export default {
  searchMedia,
  searchMovies,
  searchTvShows,
  getMovieDetails,
  getMovieFullDetails,
  getTvShowFullDetails,
  getMediaFullDetails,
  discoverMoviesByGenres,
  discoverTvShowsByGenres,
  getMovieCatalog,
  getPopularMovies,
  getPopularTvShows,
  getTopRatedMovies,
  getDailyTrendingMovies,
  getWeeklyTrendingMovies,
  getDailyTrendingTvShows,
  getWeeklyTrendingTvShows,
  getMovieTrailer,
  getTvShowTrailer,
  getMediaTrailer,
  GENRE_MAP,
  MOVIE_GENRE_MAP,
  TV_GENRE_MAP,
  ALL_GENRE_MAP,
  LANGUAGE,
  FALLBACK_LANGUAGE,
};
