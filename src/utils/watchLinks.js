const legalPlatformLinks = [
  {
    id: 'netflix',
    name: 'Netflix',
    cta: 'Netflix\'te Ara',
    watchCta: 'Netflix\'te İzle',
    aliases: ['netflix'],
    buildUrl: query => `https://www.netflix.com/search?q=${query}`,
  },
  {
    id: 'prime-video',
    name: 'Prime Video',
    cta: 'Prime Video\'da Ara',
    watchCta: 'Prime Video\'da İzle',
    aliases: ['amazon', 'prime video', 'amazon prime video'],
    buildUrl: query => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`,
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    cta: 'Disney+\'ta Ara',
    watchCta: 'Disney+\'ta İzle',
    aliases: ['disney', 'disney+'],
    buildUrl: query => `https://www.disneyplus.com/search?q=${query}`,
  },
  {
    id: 'blutv',
    name: 'BluTV',
    cta: 'BluTV\'de Ara',
    watchCta: 'BluTV\'de İzle',
    aliases: ['blutv', 'blu tv'],
    buildUrl: query => `https://www.blutv.com/ara?q=${query}`,
  },
  {
    id: 'exxen',
    name: 'Exxen',
    cta: 'Exxen\'de Ara',
    watchCta: 'Exxen\'de İzle',
    aliases: ['exxen'],
    buildUrl: query => `https://www.exxen.com/tr/search?q=${query}`,
  },
  {
    id: 'gain',
    name: 'Gain',
    cta: 'Gain\'de Ara',
    watchCta: 'Gain\'de İzle',
    aliases: ['gain'],
    buildUrl: query => `https://www.gain.tv/arama?query=${query}`,
  },
  {
    id: 'apple-tv',
    name: 'Apple TV',
    cta: 'Apple TV\'de Ara',
    watchCta: 'Apple TV\'de İzle',
    aliases: ['apple tv', 'apple tv+', 'itunes'],
    buildUrl: query => `https://tv.apple.com/search?term=${query}`,
  },
  {
    id: 'google-play',
    name: 'Google Play Movies',
    cta: 'Google Play\'de Ara',
    watchCta: 'Google Play\'de İzle',
    aliases: ['google play', 'google play movies'],
    buildUrl: query => `https://play.google.com/store/search?q=${query}&c=movies`,
  },
  {
    id: 'youtube',
    name: 'YouTube Movies',
    cta: 'YouTube\'da Ara',
    watchCta: 'YouTube\'da İzle',
    aliases: ['youtube', 'youtube movies'],
    buildUrl: query => `https://www.youtube.com/results?search_query=${query}+trailer`,
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

export const getGoogleWatchSearchLink = (title = '') => (
  `https://www.google.com/search?q=${encodeURIComponent(`${title} nerede izlenir`)}`
);

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
        url: platform.buildUrl(query),
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
