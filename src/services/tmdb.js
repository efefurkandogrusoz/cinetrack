// TMDB API Service
// Configure your TMDB API key in environment variables
// VITE_TMDB_API_KEY=your_api_key_here

const API_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const LOGO_BASE_URL = 'https://image.tmdb.org/t/p/w92';
const WATCH_PROVIDER_LOGO_BASE_URL = 'https://image.tmdb.org/t/p/original';
const PROFILE_BASE_URL = 'https://image.tmdb.org/t/p/w185';
const PROFILE_LARGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
export const LANGUAGE = 'tr-TR';
export const FALLBACK_LANGUAGE = 'en-US';
export const NO_OVERVIEW_MESSAGE = 'Bu içerik için açıklama bulunamadı.';

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
  ...params,
  language,
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

const getNoOverviewMessage = () => NO_OVERVIEW_MESSAGE;

const getTranslationOverview = (item, languageCode = 'tr', countryCode = 'TR') => {
  const translations = item?.translations?.translations || [];
  const exactTranslation = translations.find(translation => (
    translation.iso_639_1 === languageCode && translation.iso_3166_1 === countryCode
  ));
  const languageTranslation = translations.find(translation => translation.iso_639_1 === languageCode);
  const translationData = exactTranslation?.data || languageTranslation?.data || {};

  return hasText(translationData.overview) ? translationData.overview.trim() : '';
};

const getBestOverview = (item, fallbackItem = null, mediaType = 'movie') => {
  const turkishOverview = getTranslationOverview(item) || getTranslationOverview(fallbackItem);

  if (turkishOverview) {
    return {
      overview: turkishOverview,
      overviewLanguage: 'tr',
    };
  }

  if (hasText(item?.overview)) {
    return {
      overview: item.overview.trim(),
      overviewLanguage: item.original_language === 'tr' ? 'tr' : LANGUAGE,
    };
  }

  if (hasText(fallbackItem?.overview)) {
    return {
      overview: fallbackItem.overview.trim(),
      overviewLanguage: 'en',
    };
  }

  return {
    overview: getNoOverviewMessage(mediaType),
    overviewLanguage: 'none',
  };
};

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
  const { overview, overviewLanguage } = getBestOverview(item, fallbackItem, mediaType);

  return {
    ...fallbackItem,
    ...item,
    overview,
    overviewLanguage,
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

const normalizeVideoText = (value = '') => (
  String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
);

const getTrailerLanguageInfo = (video = {}) => {
  const text = normalizeVideoText(`${video.name || ''} ${video.type || ''}`);
  const isTurkishLanguage = video.iso_639_1 === 'tr';

  if (text.includes('turkce dublaj') || text.includes('dublaj')) {
    return { rank: 4, label: 'Türkçe Dublaj' };
  }

  if (
    text.includes('turkce altyazili') ||
    text.includes('turkce altyazi') ||
    text.includes('altyazili') ||
    text.includes('altyazi')
  ) {
    return { rank: 3, label: 'Türkçe Altyazı' };
  }

  if (text.includes('turkce fragman') || text.includes('turkce') || isTurkishLanguage) {
    return { rank: 2, label: 'Türkçe' };
  }

  return { rank: 1, label: 'Orijinal' };
};

const isRelevantTrailerVideo = (video = {}) => {
  const text = normalizeVideoText(`${video.name || ''} ${video.type || ''}`);
  return (
    ['Trailer', 'Teaser', 'Clip'].includes(video.type) ||
    text.includes('fragman') ||
    text.includes('trailer') ||
    text.includes('teaser') ||
    text.includes('preview') ||
    text.includes('sneak peek') ||
    text.includes('promo') ||
    text.includes('resmi') ||
    text.includes('official')
  );
};

const scoreTrailerVideo = (video = {}, sourcePriority = 0) => {
  const text = normalizeVideoText(`${video.name || ''} ${video.type || ''}`);
  const languageInfo = getTrailerLanguageInfo(video);
  const typeScore = {
    Trailer: 48,
    Teaser: 34,
    Clip: 20,
  }[video.type] || 0;
  const officialScore = video.official || text.includes('resmi') || text.includes('official') ? 24 : 0;
  const previewScore = text.includes('preview') || text.includes('sneak peek') || text.includes('promo') ? 12 : 0;
  const dateScore = video.published_at ? Math.min(new Date(video.published_at).getTime() / 100000000000, 10) : 0;

  return (sourcePriority * 1000) + (languageInfo.rank * 100) + typeScore + officialScore + previewScore + dateScore;
};

const formatTrailerVideo = (video = {}, metadata = {}) => {
  if (!video?.key) return null;

  const languageInfo = getTrailerLanguageInfo(video);

  return {
    id: video.id || video.key,
    key: video.key,
    name: video.name || 'Fragman',
    type: video.type || 'Video',
    site: video.site || 'YouTube',
    official: Boolean(video.official),
    publishedAt: video.published_at || '',
    badgeLabel: languageInfo.label,
    thumbnail: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
    ...metadata,
  };
};

const selectBestTrailerVideo = (localizedVideos = [], fallbackVideos = [], metadata = {}) => {
  const candidates = [
    ...localizedVideos.map(video => ({ ...video, sourcePriority: 2 })),
    ...fallbackVideos.map(video => ({ ...video, sourcePriority: 1 })),
  ].filter(video => video?.site === 'YouTube' && video.key);

  if (candidates.length === 0) return null;

  const relevantCandidates = candidates.filter(isRelevantTrailerVideo);
  const pool = relevantCandidates.length > 0 ? relevantCandidates : candidates;
  const selected = [...pool].sort((a, b) => scoreTrailerVideo(b, b.sourcePriority) - scoreTrailerVideo(a, a.sourcePriority))[0];

  return formatTrailerVideo(selected, metadata);
};

const getTrailerKey = (localizedVideos = [], fallbackVideos = []) => (
  selectBestTrailerVideo(localizedVideos, fallbackVideos)?.key || null
);

const getLocalizedVideos = async (path) => {
  const [localizedResult, fallbackResult] = await Promise.allSettled([
    fetchTmdb(path, withLanguage({}, LANGUAGE)),
    fetchTmdb(path, withLanguage({}, FALLBACK_LANGUAGE)),
  ]);

  return {
    localizedVideos: localizedResult.status === 'fulfilled'
      ? localizedResult.value?.results || []
      : [],
    fallbackVideos: fallbackResult.status === 'fulfilled'
      ? fallbackResult.value?.results || []
      : [],
  };
};

const getBestTrailerForPath = async (path, metadata = {}) => {
  const { localizedVideos, fallbackVideos } = await getLocalizedVideos(path);
  return selectBestTrailerVideo(localizedVideos, fallbackVideos, metadata);
};

const getLocalizedTrailerKey = async (mediaId, mediaType) => {
  const { localizedVideos, fallbackVideos } = await getLocalizedVideos(`/${mediaType}/${mediaId}/videos`);

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
  const originalTitle = mediaType === 'tv'
    ? item.original_name || item.name || title
    : item.original_title || item.title || title;
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
    originalTitle,
    originalName: originalTitle,
    original_title: mediaType === 'movie' ? originalTitle : undefined,
    original_name: mediaType === 'tv' ? originalTitle : undefined,
    originalLanguage: item.original_language || '',
    original_language: item.original_language || '',
    originCountry: item.origin_country || [],
    origin_country: item.origin_country || [],
    productionCountries: item.production_countries || [],
    poster_path: item.poster_path,
    posterPath: item.poster_path || null,
    backdrop_path: item.backdrop_path,
    backdropPath: item.backdrop_path || null,
    release_date: releaseDate || '',
    releaseDate: releaseDate || '',
    first_air_date: mediaType === 'tv' ? releaseDate || '' : '',
    firstAirDate: mediaType === 'tv' ? releaseDate || '' : '',
    overview,
    overviewLanguage: item.overviewLanguage || '',
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

const uniqueBy = (items = [], getKey) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatWatchProviders = (providerData = {}) => {
  const countryProviders = providerData?.results?.TR || providerData?.results?.US || null;
  if (!countryProviders) return [];

  const providerGroups = [
    ['flatrate', 'Abonelik'],
    ['free', 'Ücretsiz'],
    ['ads', 'Reklamlı'],
    ['rent', 'Kiralama'],
    ['buy', 'Satın Alma'],
  ];

  return uniqueBy(
    providerGroups.flatMap(([groupKey, availability]) => (
      (countryProviders[groupKey] || []).map(provider => ({
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        availability,
        logo: provider.logo_path ? `${LOGO_BASE_URL}${provider.logo_path}` : null,
      }))
    )),
    provider => provider.providerId || provider.providerName,
  );
};

const watchProviderCategories = [
  { key: 'flatrate', label: 'Abonelikle İzle' },
  { key: 'rent', label: 'Kirala' },
  { key: 'buy', label: 'Satın Al' },
  { key: 'free', label: 'Ücretsiz / Reklamlı' },
  { key: 'ads', label: 'Reklamlı İzle' },
];

const formatWatchProviderLogo = (logoPath) => {
  if (!logoPath) return null;
  return String(logoPath).startsWith('http')
    ? logoPath
    : `${WATCH_PROVIDER_LOGO_BASE_URL}${logoPath}`;
};

const formatWatchProviderSections = (countryProviders = null, region = 'TR') => {
  const watchLink = countryProviders?.link || '';

  return {
    region,
    regionLabel: region === 'TR' ? 'Türkiye' : region,
    link: watchLink,
    sections: watchProviderCategories
      .map(category => ({
        ...category,
        providers: uniqueBy(
          (countryProviders?.[category.key] || []).map(provider => ({
            providerId: provider.provider_id,
            providerName: provider.provider_name || 'Platform',
            type: category.key,
            typeLabel: category.label,
            logoPath: provider.logo_path || null,
            logo: formatWatchProviderLogo(provider.logo_path),
          })),
          provider => provider.providerId || provider.providerName,
        ),
      }))
      .filter(section => section.providers.length > 0),
  };
};

const formatCrewSummary = (credits = {}, mediaType = 'movie', createdBy = []) => {
  const crew = credits?.crew || [];
  const directors = crew
    .filter(member => member.job === 'Director')
    .map(member => member.name)
    .filter(Boolean);
  const producers = [
    ...createdBy.map(member => member.name).filter(Boolean),
    ...crew
      .filter(member => ['Producer', 'Executive Producer', 'Creator'].includes(member.job))
      .map(member => member.name)
      .filter(Boolean),
  ];

  return {
    directors: uniqueBy(directors, name => name).slice(0, 4),
    producers: uniqueBy(producers, name => name).slice(0, 4),
    creditLabel: mediaType === 'tv' ? 'Yapımcı / Yaratıcı' : 'Yönetmen',
  };
};

const formatRelatedMedia = (localizedData = {}, fallbackData = {}, cleanedType = 'movie') => {
  const recommendations = localizedData?.recommendations?.results || [];
  const similar = localizedData?.similar?.results || [];
  const fallbackRecommendations = fallbackData?.recommendations?.results || [];
  const fallbackSimilar = fallbackData?.similar?.results || [];

  return uniqueBy(
    formatMediaList([
      ...mergeLocalizedResults(recommendations, fallbackRecommendations, cleanedType),
      ...mergeLocalizedResults(similar, fallbackSimilar, cleanedType),
    ], cleanedType, { requirePoster: false }),
    item => `${item.mediaType}:${item.id}`,
  ).slice(0, 10);
};

const formatPersonImages = (profiles = []) => (
  profiles
    .filter(profile => profile.file_path)
    .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
    .slice(0, 12)
    .map(profile => ({
      id: profile.file_path,
      thumb: `${PROFILE_BASE_URL}${profile.file_path}`,
      url: `${PROFILE_LARGE_BASE_URL}${profile.file_path}`,
      width: profile.width || null,
      height: profile.height || null,
      voteAverage: profile.vote_average || 0,
    }))
);

const formatPersonCredits = (credits = {}) => {
  const castCredits = credits.cast || [];

  return uniqueBy(
    castCredits
      .filter(item => item?.id && (item.media_type === 'movie' || item.media_type === 'tv'))
      .map(item => ({
        ...formatMedia(item, item.media_type === 'tv' ? 'tv' : 'movie'),
        character: item.character || '',
        order: Number(item.order) || 999,
        popularity: Number(item.popularity) || 0,
      }))
      .sort((a, b) => {
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
        if (Math.abs(popularityDiff) > 0.01) return popularityDiff;
        return String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
      }),
    item => `${item.mediaType}:${item.id}`,
  ).slice(0, 24);
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

export const getMediaDetails = async (mediaId, mediaType = 'movie') => {
  try {
    const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';
    const { data, fallbackData } = await fetchLocalizedTmdb(`/${cleanedType}/${mediaId}`, {
      append_to_response: 'translations',
    });
    const localizedData = mergeLocalizedMediaItem(data, fallbackData, cleanedType);
    return localizedData ? formatMedia(localizedData, cleanedType) : null;
  } catch (error) {
    console.error('Error fetching media details:', error);
    return null;
  }
};

export const getMovieDetails = (movieId) => getMediaDetails(movieId, 'movie');
export const getTvShowDetails = (showId) => getMediaDetails(showId, 'tv');

export const getMediaWatchProviders = async (mediaId, mediaType = 'movie', region = 'TR') => {
  if (!mediaId) return formatWatchProviderSections(null, region);

  const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';
  const data = await fetchTmdb(`/${cleanedType}/${mediaId}/watch/providers`);
  const countryProviders = data?.results?.[region] || null;

  return formatWatchProviderSections(countryProviders, region);
};

export const getMediaFullDetails = async (mediaId, mediaType = 'movie') => {
  try {
    const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';
    const [{ data, fallbackData }, trailerKey] = await Promise.all([
      fetchLocalizedTmdb(`/${cleanedType}/${mediaId}`, {
        append_to_response: 'credits,watch/providers,recommendations,similar,translations',
      }),
      getLocalizedTrailerKey(mediaId, cleanedType),
    ]);

    if (!data) return null;

    const localizedData = mergeLocalizedMediaItem(data, fallbackData, cleanedType);
    const crewSummary = formatCrewSummary(
      localizedData.credits,
      cleanedType,
      localizedData.created_by || [],
    );

    return {
      ...formatMedia(localizedData, cleanedType),
      runtime: cleanedType === 'movie' ? localizedData.runtime || null : null,
      episodeRuntime: cleanedType === 'tv' ? localizedData.episode_run_time?.[0] || null : null,
      trailerKey,
      watchProviders: formatWatchProviders(localizedData['watch/providers']),
      similarContent: formatRelatedMedia(localizedData, fallbackData, cleanedType),
      ...crewSummary,
      cast: (localizedData.credits?.cast || []).slice(0, 12).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path || null,
        profilePath: actor.profile_path || null,
        profileUrl: actor.profile_path ? `${PROFILE_BASE_URL}${actor.profile_path}` : null,
      })),
    };
  } catch (error) {
    console.error('Error fetching full media details:', error);
    return null;
  }
};

export const getMovieFullDetails = (movieId) => getMediaFullDetails(movieId, 'movie');
export const getTvShowFullDetails = (showId) => getMediaFullDetails(showId, 'tv');

export const getPersonDetails = async (personId) => {
  try {
    if (!personId) return null;

    const { data, fallbackData } = await fetchLocalizedTmdb(`/person/${personId}`, {
      append_to_response: 'images,combined_credits',
    });

    if (!data) return null;

    const biography = hasText(data.biography)
      ? data.biography.trim()
      : hasText(fallbackData?.biography)
        ? fallbackData.biography.trim()
        : '';
    const creditsSource = data.combined_credits?.cast?.length
      ? data.combined_credits
      : fallbackData?.combined_credits || {};
    const imageSource = data.images?.profiles?.length
      ? data.images.profiles
      : fallbackData?.images?.profiles || [];

    return {
      id: data.id,
      name: data.name || fallbackData?.name || 'Bilgi yok',
      biography,
      birthday: data.birthday || fallbackData?.birthday || '',
      deathday: data.deathday || fallbackData?.deathday || '',
      placeOfBirth: data.place_of_birth || fallbackData?.place_of_birth || '',
      knownForDepartment: data.known_for_department || fallbackData?.known_for_department || '',
      popularity: data.popularity || fallbackData?.popularity || 0,
      profilePath: data.profile_path || fallbackData?.profile_path || null,
      profileUrl: data.profile_path || fallbackData?.profile_path
        ? `${PROFILE_LARGE_BASE_URL}${data.profile_path || fallbackData.profile_path}`
        : null,
      profileThumb: data.profile_path || fallbackData?.profile_path
        ? `${PROFILE_BASE_URL}${data.profile_path || fallbackData.profile_path}`
        : null,
      images: formatPersonImages(imageSource),
      credits: formatPersonCredits(creditsSource),
    };
  } catch (error) {
    console.error('Error fetching person details:', error);
    return null;
  }
};

export const discoverMoviesByGenres = async (genreIds = [], excludedMovieIds = [], options = {}) => {
  const { limit = 8, page = 1, sortBy = 'vote_average.desc' } = options;
  const cleanedGenreIds = genreIds.filter(Boolean).slice(0, 3);
  const excluded = new Set(excludedMovieIds);

  try {
    const endpoint = cleanedGenreIds.length > 0 ? '/discover/movie' : '/movie/popular';
    const params = { include_adult: 'false', page: String(page) };

    if (cleanedGenreIds.length > 0) {
      params.sort_by = sortBy;
      params['vote_count.gte'] = '300';
      params.with_genres = cleanedGenreIds.join(',');
    }

    const { data, fallbackData } = await fetchLocalizedTmdb(endpoint, params);

    return formatMediaList(
      mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'movie'),
      'movie',
      { requirePoster: false },
    )
      .filter(movie => !isExcludedMedia(movie, excluded))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const discoverTvShowsByGenres = async (genreIds = [], excludedShowIds = [], options = {}) => {
  const { limit = 8, page = 1, sortBy = 'vote_average.desc' } = options;
  const cleanedGenreIds = genreIds.filter(Boolean).slice(0, 3);
  const hasGenreSignal = cleanedGenreIds.length > 0;
  const excluded = new Set(excludedShowIds);

  try {
    const endpoint = hasGenreSignal ? '/discover/tv' : '/tv/popular';
    const params = {
      include_adult: 'false',
      page: String(page),
    };

    if (hasGenreSignal) {
      params.sort_by = sortBy;
      params['vote_count.gte'] = '150';
      params.with_genres = cleanedGenreIds.join(',');
    }

    const { data, fallbackData } = await fetchLocalizedTmdb(endpoint, params);

    return formatMediaList(
      mergeLocalizedResults(data?.results || [], fallbackData?.results || [], 'tv'),
      'tv',
      { requirePoster: false },
    )
      .filter(show => !isExcludedMedia(show, excluded))
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};

export const fetchRecommendationCandidates = async ({
  movieGenreIds = [],
  tvGenreIds = [],
  excludedKeys = [],
  limit = 20,
  page = 1,
  alternateSort = false,
} = {}) => {
  const sortBy = alternateSort ? 'popularity.desc' : 'vote_average.desc';
  const secondPage = alternateSort ? page + 1 : page;

  const [moviesPage1, moviesPage2, tvPage1, tvPage2] = await Promise.all([
    discoverMoviesByGenres(movieGenreIds, excludedKeys, { limit, page, sortBy }),
    alternateSort
      ? discoverMoviesByGenres(movieGenreIds, excludedKeys, { limit: Math.ceil(limit / 2), page: secondPage, sortBy })
      : Promise.resolve([]),
    discoverTvShowsByGenres(tvGenreIds, excludedKeys, { limit, page, sortBy }),
    alternateSort
      ? discoverTvShowsByGenres(tvGenreIds, excludedKeys, { limit: Math.ceil(limit / 2), page: secondPage, sortBy })
      : Promise.resolve([]),
  ]);

  const seen = new Set();
  const merged = [];

  [...moviesPage1, ...moviesPage2, ...tvPage1, ...tvPage2].forEach((item) => {
    const key = getFormattedMediaKey(item.mediaType || item.media_type || 'movie', item.id);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
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

export const getSmartTrailerVideo = async ({
  mediaId,
  mediaType = 'movie',
  seasonNumber = 1,
} = {}) => {
  try {
    if (!mediaId) return null;

    const cleanedType = mediaType === 'tv' ? 'tv' : 'movie';

    if (cleanedType === 'movie') {
      return await getBestTrailerForPath(`/movie/${mediaId}/videos`, {
        scope: 'movie',
        scopeLabel: 'Film fragmanı',
      });
    }

    const season = Math.max(1, Number(seasonNumber) || 1);

    const seasonTrailer = await getBestTrailerForPath(`/tv/${mediaId}/season/${season}/videos`, {
      scope: 'season',
      scopeLabel: `Sezon ${season} Fragmanı`,
    });

    if (seasonTrailer) return seasonTrailer;

    return await getBestTrailerForPath(`/tv/${mediaId}/videos`, {
      scope: 'show',
      scopeLabel: 'Dizi fragmanı',
    });
  } catch {
    return null;
  }
};

export const getMovieTrailer = (movieId) => getMediaTrailer(movieId, 'movie');
export const getTvShowTrailer = (showId) => getMediaTrailer(showId, 'tv');

export default {
  searchMedia,
  searchMovies,
  searchTvShows,
  getMediaDetails,
  getMovieDetails,
  getTvShowDetails,
  getMediaWatchProviders,
  getMovieFullDetails,
  getTvShowFullDetails,
  getMediaFullDetails,
  getPersonDetails,
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
  getSmartTrailerVideo,
  GENRE_MAP,
  MOVIE_GENRE_MAP,
  TV_GENRE_MAP,
  ALL_GENRE_MAP,
  LANGUAGE,
  FALLBACK_LANGUAGE,
};
