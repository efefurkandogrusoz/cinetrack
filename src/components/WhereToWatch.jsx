import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, MonitorPlay, Tv } from 'lucide-react';
import { getMediaWatchProviders } from '../services/tmdb';
import { buildProviderWatchLink } from '../utils/watchLinks';

const emptyWatchData = {
  region: 'TR',
  regionLabel: 'Türkiye',
  link: '',
  sections: [],
};

const WhereToWatch = ({ mediaId, mediaType, mediaTitle = '', watchLinks = {} }) => {
  const [watchData, setWatchData] = useState(emptyWatchData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!mediaId) {
        setWatchData(emptyWatchData);
        setError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      getMediaWatchProviders(mediaId, mediaType, 'TR')
        .then(data => {
          if (cancelled) return;
          setWatchData(data || emptyWatchData);
        })
        .catch((requestError) => {
          console.warn('Watch provider information could not be fetched:', requestError);
          if (!cancelled) {
            setError(true);
            setWatchData(emptyWatchData);
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
  }, [mediaId, mediaType]);

  const hasProviders = useMemo(
    () => watchData.sections.some(section => section.providers.length > 0),
    [watchData.sections],
  );

  const renderProviderLogo = (provider) => {
    if (provider.logo) {
      return (
        <img
          src={provider.logo}
          alt={`${provider.providerName} logosu`}
          loading="lazy"
        />
      );
    }

    return <Tv size={24} aria-hidden="true" />;
  };

  const getProviderLink = (provider) => (
    buildProviderWatchLink({
      providerName: provider.providerName,
      mediaTitle,
      watchLinks,
    })
  );

  return (
    <section className="movie-modal-panel detail-section where-to-watch-section" aria-labelledby="where-to-watch-title">
      <div className="detail-panel-head where-to-watch-head">
        <h3 id="where-to-watch-title">
          <MonitorPlay size={18} aria-hidden="true" />
          Nerede İzlenir?
        </h3>
        <span>{watchData.regionLabel || 'Türkiye'}</span>
      </div>

      {loading ? (
        <div className="where-to-watch-loading" role="status" aria-live="polite">
          <div className="where-to-watch-skeleton-grid" aria-hidden="true">
            {[0, 1, 2].map(item => (
              <span className="where-skeleton-card" key={item}>
                <i />
                <b />
                <em />
                <strong />
              </span>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="where-to-watch-empty is-error" role="alert">
          <MonitorPlay size={30} aria-hidden="true" />
          <strong>İzleme bilgileri şu anda alınamadı.</strong>
          <small>Platform bilgileri mevcut sağlayıcı verilerine göre gösterilir.</small>
        </div>
      ) : hasProviders ? (
        <>
          <div className="where-to-watch-groups">
            {watchData.sections.map(section => (
              <div className="where-provider-group" key={section.key}>
                <div className="where-provider-group-head">
                  <h4>{section.label}</h4>
                </div>
                <div className="where-provider-grid">
                  {section.providers.map(provider => {
                    const providerLink = getProviderLink(provider);

                    return (
                      <article
                        className="where-provider-card"
                        key={`${section.key}-${provider.providerId || provider.providerName}`}
                      >
                        <span className="where-provider-logo" aria-hidden={!provider.logo}>
                          {renderProviderLogo(provider)}
                        </span>
                        <span className="where-provider-copy">
                          <strong>{provider.providerName}</strong>
                          <small>{provider.typeLabel}</small>
                        </span>
                        {providerLink ? (
                          <a
                            className="where-provider-action"
                            href={providerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${provider.providerName} üzerinde ${mediaTitle || 'içeriği'} aç`}
                          >
                            İzle
                            <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        ) : (
                          <button className="where-provider-action" type="button" disabled>
                            Link yok
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="where-to-watch-source">Platform bilgileri mevcut sağlayıcı verilerine göre gösterilir.</p>
        </>
      ) : (
        <div className="where-to-watch-empty">
          <MonitorPlay size={30} aria-hidden="true" />
          <strong>Bu içerik için Türkiye'de yasal izleme platformu bulunamadı.</strong>
          <small>Platform bilgileri mevcut sağlayıcı verilerine göre gösterilir.</small>
        </div>
      )}
    </section>
  );
};

export default WhereToWatch;
