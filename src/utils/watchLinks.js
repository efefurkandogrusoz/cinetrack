const legalPlatformLinks = [
  {
    id: 'netflix',
    name: 'Netflix',
    cta: 'Netflix\'te Ara',
    watchCta: 'Netflix\'te İzle',
    aliases: ['netflix'],
    homeUrl: 'https://www.netflix.com/tr/',
    buildUrl: query => `https://www.netflix.com/search?q=${query}`,
  },
  {
    id: 'prime-video',
    name: 'Prime Video',
    cta: 'Prime Video\'da Ara',
    watchCta: 'Prime Video\'da İzle',
    aliases: ['amazon', 'prime video', 'amazon prime video', 'amazon video'],
    homeUrl: 'https://www.primevideo.com/',
    buildUrl: query => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`,
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    cta: 'Disney+\'ta Ara',
    watchCta: 'Disney+\'ta İzle',
    aliases: ['disney', 'disney+', 'disney plus'],
    homeUrl: 'https://www.disneyplus.com/tr-tr',
    buildUrl: query => `https://www.disneyplus.com/search?q=${query}`,
  },
  {
    id: 'mubi',
    name: 'MUBI',
    cta: 'MUBI\'de Ara',
    watchCta: 'MUBI\'de İzle',
    aliases: ['mubi'],
    homeUrl: 'https://mubi.com/tr',
    buildUrl: query => `https://mubi.com/tr/search?q=${query}`,
  },
  {
    id: 'blutv',
    name: 'BluTV',
    cta: 'BluTV\'de Ara',
    watchCta: 'BluTV\'de İzle',
    aliases: ['blutv', 'blu tv'],
    homeUrl: 'https://www.blutv.com/',
    buildUrl: query => `https://www.blutv.com/ara?q=${query}`,
  },
  {
    id: 'exxen',
    name: 'Exxen',
    cta: 'Exxen\'de Ara',
    watchCta: 'Exxen\'de İzle',
    aliases: ['exxen'],
    homeUrl: 'https://www.exxen.com/tr',
    buildUrl: query => `https://www.exxen.com/tr/search?q=${query}`,
  },
  {
    id: 'gain',
    name: 'Gain',
    cta: 'Gain\'de Ara',
    watchCta: 'Gain\'de İzle',
    aliases: ['gain'],
    homeUrl: 'https://www.gain.tv/',
    buildUrl: query => `https://www.gain.tv/arama?query=${query}`,
  },
  {
    id: 'apple-tv',
    name: 'Apple TV',
    cta: 'Apple TV\'de Ara',
    watchCta: 'Apple TV\'de İzle',
    aliases: ['apple tv', 'apple tv+', 'itunes'],
    homeUrl: 'https://tv.apple.com/tr',
    buildUrl: query => `https://tv.apple.com/search?term=${query}`,
  },
  {
    id: 'google-play',
    name: 'Google Play Movies',
    cta: 'Google Play\'de Ara',
    watchCta: 'Google Play\'de İzle',
    aliases: ['google play', 'google play movies'],
    homeUrl: 'https://play.google.com/store/movies',
    buildUrl: query => `https://play.google.com/store/search?q=${query}&c=movies`,
  },
  {
    id: 'youtube',
    name: 'YouTube Movies',
    cta: 'YouTube\'da Ara',
    watchCta: 'YouTube\'da İzle',
    aliases: ['youtube', 'youtube movies'],
    homeUrl: 'https://www.youtube.com/feed/storefront',
    buildUrl: query => `https://www.youtube.com/results?search_query=${query}`,
  },
  {
    id: 'tod',
    name: 'TOD',
    cta: 'TOD\'da Ara',
    watchCta: 'TOD\'da İzle',
    aliases: ['tod', 'bein connect', 'beIN CONNECT'],
    homeUrl: 'https://www.todtv.com.tr/',
    buildUrl: query => `https://www.todtv.com.tr/arama?text=${query}`,
  },
  {
    id: 'tv-plus',
    name: 'TV+',
    cta: 'TV+\'ta Ara',
    watchCta: 'TV+\'ta İzle',
    aliases: ['tv+', 'turkcell tv+', 'turkcell tv plus', 'tv plus'],
    homeUrl: 'https://tvplus.com.tr/',
    buildUrl: query => `https://tvplus.com.tr/arama?query=${query}`,
  },
  {
    id: 'puhutv',
    name: 'Puhutv',
    cta: 'Puhutv\'de Ara',
    watchCta: 'Puhutv\'de İzle',
    aliases: ['puhu', 'puhutv', 'puhu tv'],
    homeUrl: 'https://puhutv.com/',
    buildUrl: query => `https://puhutv.com/arama?q=${query}`,
  },
  {
    id: 'max',
    name: 'Max',
    cta: 'Max\'te Ara',
    watchCta: 'Max\'te İzle',
    aliases: ['max', 'hbo max'],
    homeUrl: 'https://www.max.com/tr/tr',
    buildUrl: query => `https://www.max.com/tr/tr/search?q=${query}`,
  },
  {
    id: 'paramount-plus',
    name: 'Paramount+',
    cta: 'Paramount+\'ta Ara',
    watchCta: 'Paramount+\'ta İzle',
    aliases: ['paramount', 'paramount+'],
    homeUrl: 'https://www.paramountplus.com/',
    buildUrl: query => `https://www.paramountplus.com/search/?q=${query}`,
  },
];

const normalizePlatformName = (value = '') => value
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const findPlatformConfig = (providerName = '') => {
  const normalizedProviderName = normalizePlatformName(providerName);

  return legalPlatformLinks.find(platform => (
    platform.aliases.some(alias => normalizedProviderName.includes(normalizePlatformName(alias)))
  ));
};

const isValidExternalUrl = (value = '') => /^https?:\/\//i.test(String(value).trim());

const getDirectProviderLink = (providerName = '', watchLinks = {}) => {
  if (!watchLinks || typeof watchLinks !== 'object') return '';

  const platform = findPlatformConfig(providerName);
  const normalizedProviderName = normalizePlatformName(providerName);
  const matchValues = new Set([
    normalizedProviderName,
    normalizePlatformName(platform?.id),
    normalizePlatformName(platform?.name),
    ...(platform?.aliases || []).map(alias => normalizePlatformName(alias)),
  ].filter(Boolean));

  const matchedEntry = Object.entries(watchLinks).find(([key, value]) => (
    isValidExternalUrl(value) && matchValues.has(normalizePlatformName(key))
  ));

  return matchedEntry?.[1] || '';
};

export const getGoogleWatchSearchLink = (title = '') => (
  `https://www.google.com/search?q=${encodeURIComponent(`${title} nerede izlenir`)}`
);

export const buildProviderWatchLink = ({
  providerName = '',
  mediaTitle = '',
  watchLinks = {},
} = {}) => {
  const directLink = getDirectProviderLink(providerName, watchLinks);
  if (directLink) return directLink;

  const platform = findPlatformConfig(providerName);
  const query = encodeURIComponent(mediaTitle || providerName || '');

  if (platform?.buildUrl && query) return platform.buildUrl(query);
  if (platform?.homeUrl) return platform.homeUrl;

  return getGoogleWatchSearchLink(`${mediaTitle} ${providerName}`.trim());
};

export const getWatchLinks = (title = '', providers = []) => {
  const query = encodeURIComponent(title || '');
  const providerLinks = providers
    .map((provider) => {
      const providerName = provider.providerName || provider.name || provider.provider_name || '';
      const platform = findPlatformConfig(providerName);

      if (!platform) {
        return {
          id: `provider-${provider.providerId || provider.provider_id || providerName}`,
          name: providerName || 'Platform',
          cta: `${providerName || 'Platform'} için Google'da Ara`,
          logo: provider.logo || provider.logoPath || null,
          url: getGoogleWatchSearchLink(`${title} ${providerName}`),
        };
      }

      return {
        id: platform.id,
        name: providerName || platform.name,
        cta: platform.watchCta,
        logo: provider.logo || provider.logoPath || null,
        url: buildProviderWatchLink({
          providerName,
          mediaTitle: title,
        }) || platform.buildUrl(query),
      };
    })
    .filter(link => link.name && link.url);

  const seenPlatformIds = new Set(providerLinks.map(link => link.id));
  const searchLinks = legalPlatformLinks
    .filter(platform => !seenPlatformIds.has(platform.id))
    .map(platform => ({
      id: platform.id,
      name: platform.name,
      cta: platform.cta,
      logo: null,
      url: platform.buildUrl(query),
    }));

  return {
    hasProviderInfo: providerLinks.length > 0,
    providerLinks,
    searchLinks,
    googleSearchLink: getGoogleWatchSearchLink(title),
  };
};

export default getWatchLinks;
