import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Clock3,
  ExternalLink,
  Film,
  Globe2,
  Heart,
  Languages,
  MessageSquare,
  Play,
  Search,
  Star,
  Tv,
  X,
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import ShareActions from './ShareActions';
import { getMediaFullDetails } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import {
  getMediaKey,
  getMediaType,
  getMediaTypeLabel,
  getEpisodeCountForSeason,
  getTvProgress,
  getNextEpisodeProgress,
  getWatchStatus,
  getWatchStatusLabel,
  isTvShow,
  normalizeTvTracking,
} from '../utils/media';
import { getWatchLinks } from '../utils/watchLinks';
import '../styles/components/MovieDetailsModal.css';

const tvStatusOptions = [
  { value: 'watching', label: 'Devam ediyorum' },
  { value: 'completed', label: 'Tamamladım' },
  { value: 'dropped', label: 'Bıraktım' },
  { value: 'watchlist', label: 'İzlemeyi planlıyorum' },
];

const languageLabels = {
  en: 'İngilizce',
  tr: 'Türkçe',
  ko: 'Korece',
  ja: 'Japonca',
  es: 'İspanyolca',
  fr: 'Fransızca',
  de: 'Almanca',
  it: 'İtalyanca',
};

let openDetailModalCount = 0;

const setDetailModalPageState = (isOpen) => {
  openDetailModalCount = Math.max(0, openDetailModalCount + (isOpen ? 1 : -1));
  document.documentElement.classList.toggle('movie-detail-modal-open', openDetailModalCount > 0);
  document.body.classList.toggle('movie-detail-modal-open', openDetailModalCount > 0);
};

const ratingValues = Array.from({ length: 10 }, (_, index) => index + 1);

const buildNumberOptions = (count) => (
  Array.from({ length: Math.max(1, Number(count) || 1) }, (_, index) => index + 1)
);

const formatProductionStatus = (status) => {
  if (!status) return null;
  if (status === 'Returning Series' || status === 'In Production') return 'Devam ediyor';
  if (status === 'Ended' || status === 'Canceled') return 'Bitti';
  return status;
};

const formatLanguage = (languageCode) => {
  if (!languageCode) return null;
  return languageLabels[languageCode] || languageCode.toLocaleUpperCase('tr-TR');
};

const formatCountries = (movie = {}) => {
  const productionCountries = (movie.productionCountries || [])
    .map(country => country.name || country.iso_3166_1 || country)
    .filter(Boolean);

  if (productionCountries.length > 0) return productionCountries.slice(0, 3).join(', ');

  const originCountries = movie.originCountry || movie.origin_country || [];
  return Array.isArray(originCountries) && originCountries.length > 0
    ? originCountries.slice(0, 3).join(', ')
    : null;
};

const getUserRating = (movie = {}) => {
  const value = Number(
    movie.userRating ??
    movie.personalRating ??
    movie.myRating ??
    movie.userScore ??
    0
  );

  return Number.isFinite(value) && value > 0 ? value : 0;
};

const formatRuntime = (movie, tvShow) => {
  if (tvShow) {
    const episodeRuntime = Number(movie.episodeRuntime || movie.runtime);
    return Number.isFinite(episodeRuntime) && episodeRuntime > 0
      ? `${episodeRuntime} dk / bölüm`
      : null;
  }

  const runtime = Number(movie.runtime);
  return Number.isFinite(runtime) && runtime > 0 ? `${runtime} dk` : null;
};

const uniqueText = (items = []) => (
  Array.from(new Set(items.filter(Boolean)))
);

const MovieDetailsModal = ({ movie, onClose }) => {
  const {
    addMovie,
    movies,
    setUserRating,
    setWatchStatus,
    toggleFavorite,
    toggleWatched,
    updateMediaProgress,
  } = useMovies();
  const [modalMedia, setModalMedia] = useState(movie);
  const mediaType = getMediaType(modalMedia);
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerFeedback, setTrailerFeedback] = useState('');
  const [trackingDraft, setTrackingDraft] = useState(null);
  const modalRef = useRef(null);
  const ratingRef = useRef(null);
  const watchSectionRef = useRef(null);
  const trailerSectionRef = useRef(null);
  const commentsRef = useRef(null);

  const listedMovie = useMemo(
    () => movies.find(item => getMediaKey(item) === getMediaKey(modalMedia)),
    [movies, modalMedia]
  );

  const activeMovie = listedMovie
    ? {
      ...details,
      ...listedMovie,
      overview: details?.overview || listedMovie.overview || '',
      genres: details?.genres?.length ? details.genres : listedMovie.genres || [],
      cast: details?.cast || listedMovie.cast || [],
      directors: details?.directors || listedMovie.directors || [],
      producers: details?.producers || listedMovie.producers || [],
      watchProviders: details?.watchProviders || listedMovie.watchProviders || [],
      similarContent: details?.similarContent || [],
      totalSeasons: listedMovie.totalSeasons || details?.totalSeasons || 0,
      totalEpisodes: listedMovie.totalEpisodes || details?.totalEpisodes || 0,
      seasonEpisodeCounts: Object.keys(listedMovie.seasonEpisodeCounts || {}).length > 0
        ? listedMovie.seasonEpisodeCounts
        : details?.seasonEpisodeCounts || {},
      status: listedMovie.status || details?.status || null,
    }
    : details || modalMedia;
  const docId = activeMovie?.docId || activeMovie?.id;
  const tvShow = isTvShow(activeMovie);
  const mediaLabel = getMediaTypeLabel(activeMovie);
  const watchStatus = getWatchStatus(activeMovie);
  const isFavorite = Boolean(listedMovie?.favorite || listedMovie?.isFavorite);
  const isWatched = Boolean(
    listedMovie?.watched ||
    watchStatus === 'watched' ||
    watchStatus === 'completed'
  );
  const tracking = tvShow
    ? normalizeTvTracking(activeMovie, trackingDraft || {})
    : {
      currentSeason: activeMovie?.currentSeason || 1,
      currentEpisode: activeMovie?.currentEpisode || 0,
      watchStatus,
    };
  const episodeLimit = tvShow ? getEpisodeCountForSeason({ ...activeMovie, ...tracking }, tracking.currentSeason) : 0;
  const seasonOptionCount = tvShow ? Math.max(Number(activeMovie.totalSeasons) || 0, tracking.currentSeason, 1) : 1;
  const episodeOptionCount = tvShow ? Math.max(episodeLimit, tracking.currentEpisode, 1) : 1;
  const trackingProgress = tvShow ? getTvProgress({ ...activeMovie, ...tracking }) : null;
  const trackingCompleted = tvShow && tracking.watchStatus === 'completed';
  const backdrop = activeMovie.backdrop || details?.backdrop || activeMovie.poster;
  const poster = activeMovie.poster || details?.poster || null;
  const trailerKey = activeMovie.trailerKey || details?.trailerKey || null;
  const productionStatus = formatProductionStatus(activeMovie.status);
  const runtimeLabel = formatRuntime(activeMovie, tvShow);
  const countryLabel = formatCountries(activeMovie);
  const languageLabel = formatLanguage(activeMovie.originalLanguage || activeMovie.original_language);
  const rating = Number(activeMovie.rating ?? activeMovie.voteAverage);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
  const userRating = getUserRating(activeMovie);
  const originalTitle = activeMovie.originalTitle || activeMovie.originalName || activeMovie.original_title || activeMovie.original_name;
  const showOriginalTitle = originalTitle && originalTitle !== activeMovie.title;
  const creditNames = tvShow
    ? uniqueText(activeMovie.producers || [])
    : uniqueText((activeMovie.directors?.length ? activeMovie.directors : activeMovie.producers) || []);
  const creditLabel = tvShow ? 'Yapımcı / Yaratıcı' : 'Yönetmen';
  const totalInfo = tvShow
    ? [
      activeMovie.totalSeasons ? `${activeMovie.totalSeasons} sezon` : null,
      activeMovie.totalEpisodes ? `${activeMovie.totalEpisodes} bölüm` : null,
      productionStatus,
    ].filter(Boolean)
    : [];
  const watchLinks = useMemo(
    () => getWatchLinks(activeMovie.title, activeMovie.watchProviders || []),
    [activeMovie.title, activeMovie.watchProviders],
  );
  const visibleWatchLinks = watchLinks.hasProviderInfo
    ? watchLinks.providerLinks
    : watchLinks.searchLinks.slice(0, 6);
  const similarContent = activeMovie.similarContent || [];

  useLayoutEffect(() => {
    setDetailModalPageState(true);

    return () => {
      setDetailModalPageState(false);
    };
  }, []);

  const updateTrackingDraft = (updates) => {
    setTrackingDraft(current => normalizeTvTracking(activeMovie, {
      ...(current || tracking),
      ...updates,
    }));
  };

  useEffect(() => {
    let cancelled = false;

    if (!modalMedia?.id) return undefined;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setDetailsError(null);
      getMediaFullDetails(modalMedia.id, mediaType)
        .then(fullDetails => {
          if (cancelled) return;

          if (fullDetails) {
            setDetails({ ...modalMedia, ...fullDetails });
          } else {
            setDetailsError('Detaylar şu anda yüklenemedi. Kayıtlı bilgiler gösteriliyor.');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDetailsError('Detaylar şu anda yüklenemedi. Kayıtlı bilgiler gösteriliyor.');
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
  }, [modalMedia, mediaType]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (trailerOpen) {
          setTrailerOpen(false);
          return;
        }

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, trailerOpen]);

  const addToList = async (overrides = {}) => {
    await addMovie({ ...activeMovie, mediaType, ...overrides });
  };

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const focusCommentForm = () => {
    scrollToSection(commentsRef);
    window.setTimeout(() => {
      commentsRef.current?.querySelector('textarea')?.focus();
    }, 300);
  };

  const saveTvTracking = async () => {
    const updates = {
      currentSeason: tracking.currentSeason,
      currentEpisode: tracking.currentEpisode,
      watchedEpisodes: tracking.watchedEpisodes,
      totalWatchedEpisodes: tracking.totalWatchedEpisodes,
      progressPercent: tracking.progressPercent,
      watchStatus: tracking.watchStatus,
    };

    if (listedMovie) {
      await updateMediaProgress(docId, updates);
      setTrackingDraft(null);
      return;
    }

    await addToList(updates);
    setTrackingDraft(null);
  };

  const setTvStatus = async (nextStatus) => {
    const nextTracking = normalizeTvTracking(activeMovie, {
      ...tracking,
      watchStatus: nextStatus,
      currentEpisode: nextStatus === 'watching'
        ? Math.max(1, Number(tracking.currentEpisode) || 1)
        : tracking.currentEpisode,
    });
    const updates = {
      ...nextTracking,
      watchStatus: nextStatus,
      watched: nextStatus === 'completed',
    };

    if (listedMovie) {
      await updateMediaProgress(docId, updates);
      setTrackingDraft(null);
      return;
    }

    await addToList(updates);
    setTrackingDraft(null);
  };

  const handleWatch = async () => {
    if (tvShow) {
      await setTvStatus(watchStatus === 'completed' ? 'watchlist' : 'completed');
      return;
    }

    if (listedMovie) {
      await toggleWatched(docId, listedMovie.watched);
      return;
    }

    await addToList({ watched: true, watchStatus: 'watched' });
  };

  const handleWatchlist = async () => {
    if (listedMovie) {
      await setWatchStatus(docId, 'watchlist');
      return;
    }

    await addToList({ watched: false, watchStatus: 'watchlist' });
  };

  const handleFavorite = async () => {
    if (listedMovie) {
      await toggleFavorite(docId, listedMovie.favorite || false);
      return;
    }

    await addToList({ favorite: true, isFavorite: true });
  };

  const handleUserRating = async (nextRating) => {
    const now = new Date();

    if (listedMovie) {
      await setUserRating(docId, nextRating);
      return;
    }

    await addToList({
      userRating: nextRating,
      personalRating: nextRating,
      ratingAt: now,
      ratedAt: now,
      watchStatus: watchStatus || 'watchlist',
    });
  };

  const handleNextEpisode = async () => {
    const nextTracking = getNextEpisodeProgress({ ...activeMovie, ...tracking });

    if (listedMovie) {
      await updateMediaProgress(docId, nextTracking);
      return;
    }

    await addToList({
      watchStatus: 'watching',
      ...nextTracking,
    });
  };

  const toggleTrailer = () => {
    if (!trailerKey) {
      setTrailerFeedback(loading ? 'Fragman bilgisi yükleniyor...' : 'Bu içerik için fragman bulunamadı.');
      return;
    }

    setTrailerFeedback('');

    if (trailerOpen) {
      setTrailerOpen(false);
      return;
    }

    setTrailerOpen(true);

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        trailerSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 60);
    });
  };

  const openSimilarContent = (relatedMedia) => {
    setModalMedia(relatedMedia);
    setDetails(relatedMedia);
    setDetailsError(null);
    setTrailerFeedback('');
    setTrailerOpen(false);
    setTrackingDraft(null);
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroStyle = backdrop
    ? {
      backgroundImage: `
        linear-gradient(90deg, rgba(9, 9, 10, 0.96) 0%, rgba(12, 12, 14, 0.9) 42%, rgba(12, 12, 14, 0.52) 100%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.18), #111 96%),
        url(${backdrop})
      `,
    }
    : undefined;

  const modal = (
    <div className="movie-modal-layer" role="dialog" aria-modal="true" aria-label={`${activeMovie.title} detayları`}>
      <button className="movie-modal-backdrop" type="button" onClick={onClose} aria-label="Detayları kapat" />
      <section className="movie-modal movie-detail-premium" ref={modalRef}>
        <button className="movie-modal-close" type="button" onClick={onClose} aria-label="Kapat">
          <X size={19} aria-hidden="true" />
        </button>

        <div className="movie-modal-hero detail-hero" style={heroStyle}>
          <div className="detail-hero-poster">
            {poster ? (
              <img src={poster} alt={activeMovie.title} />
            ) : (
              <span>
                <Film size={34} aria-hidden="true" />
                Poster Yok
              </span>
            )}
          </div>

          <div className="movie-modal-copy detail-hero-copy">
            <p className="eyebrow">{mediaLabel} Detayı</p>
            <h2>{activeMovie.title}</h2>
            {showOriginalTitle && <p className="detail-original-title">Orijinal ad: {originalTitle}</p>}

            <div className="movie-modal-meta detail-meta">
              <span><Clapperboard size={14} aria-hidden="true" /> {mediaLabel}</span>
              <span><CalendarDays size={14} aria-hidden="true" /> {activeMovie.year || 'Yıl yok'}</span>
              {runtimeLabel && <span><Clock3 size={14} aria-hidden="true" /> {runtimeLabel}</span>}
              {ratingLabel && <span><Star size={14} aria-hidden="true" /> TMDB {ratingLabel}</span>}
              <span><Star size={14} aria-hidden="true" /> Puanın {userRating > 0 ? userRating.toFixed(1) : 'Yok'}</span>
              {countryLabel && <span><Globe2 size={14} aria-hidden="true" /> {countryLabel}</span>}
              {languageLabel && <span><Languages size={14} aria-hidden="true" /> {languageLabel}</span>}
              {totalInfo.map(item => <span key={item}><Tv size={14} aria-hidden="true" /> {item}</span>)}
            </div>

            {activeMovie.genres?.length > 0 && (
              <div className="detail-genre-list">
                {activeMovie.genres.slice(0, 5).map(genre => <span key={genre}>{genre}</span>)}
              </div>
            )}

            <p className="detail-overview">
              {activeMovie.overview || `Bu ${mediaLabel.toLowerCase()} için açıklama bulunamadı.`}
            </p>

            {detailsError && <p className="movie-modal-warning" role="alert">{detailsError}</p>}

            <div className="detail-actions">
              <div className="detail-actions-primary">
                <button
                  className={`detail-btn detail-btn--hero ${isFavorite ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleFavorite}
                >
                  <Heart size={16} aria-hidden="true" />
                  {isFavorite ? 'Favoriden Çıkar' : 'Favoriye Ekle'}
                </button>
                <button
                  className={`detail-btn detail-btn--hero ${isWatched ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleWatch}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {isWatched ? 'İzlendi' : 'İzledim'}
                </button>
                <button
                  className={`detail-btn detail-btn--hero ${watchStatus === 'watchlist' ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleWatchlist}
                >
                  <Bookmark size={16} aria-hidden="true" />
                  Listeme Ekle
                </button>
                <button
                  className={`detail-btn detail-btn--hero ${trailerOpen ? 'is-active' : ''}`}
                  type="button"
                  onClick={toggleTrailer}
                >
                  <Play size={16} aria-hidden="true" />
                  {trailerOpen ? 'Fragmanı Kapat' : 'Fragmanı İzle'}
                </button>
              </div>
              <div className="detail-actions-secondary">
                <button className="detail-btn detail-btn--ghost" type="button" onClick={() => scrollToSection(ratingRef)}>
                  <Star size={15} aria-hidden="true" />
                  Puan Ver
                </button>
                <button className="detail-btn detail-btn--ghost" type="button" onClick={focusCommentForm}>
                  <MessageSquare size={15} aria-hidden="true" />
                  Yorum Yaz
                </button>
                <button className="detail-btn detail-btn--ghost" type="button" onClick={() => scrollToSection(watchSectionRef)}>
                  <Search size={15} aria-hidden="true" />
                  Nerede İzlenir?
                </button>
              </div>
            </div>
            {trailerFeedback && <p className="detail-inline-message">{trailerFeedback}</p>}

            <div className="detail-share-wrap">
              <ShareActions movie={activeMovie} />
            </div>
          </div>
        </div>

        <div className="movie-modal-body detail-body">
          <aside className="detail-side">
            <div className="detail-rating-panel movie-modal-panel detail-section" ref={ratingRef}>
              <div className="detail-panel-head">
                <h3>Kullanıcı Puanı</h3>
                <span>{userRating > 0 ? `${userRating}/10` : 'Henüz yok'}</span>
              </div>
              <div className="detail-rating-buttons" aria-label="Kullanıcı puanı seç">
                {ratingValues.map(value => (
                  <button
                    key={value}
                    className={userRating === value ? 'selected' : ''}
                    type="button"
                    aria-pressed={userRating === value}
                    onClick={() => handleUserRating(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="movie-modal-panel detail-section detail-info-panel">
              <h3>Bilgiler</h3>
              <dl>
                <div>
                  <dt>TMDB Puanı</dt>
                  <dd>{ratingLabel ? `${ratingLabel}/10` : 'Puan bilgisi yok'}</dd>
                </div>
                <div>
                  <dt>Kullanıcı Puanı</dt>
                  <dd>{userRating > 0 ? `${userRating}/10` : 'Henüz puan vermedin'}</dd>
                </div>
                <div>
                  <dt>Süre</dt>
                  <dd>{runtimeLabel || 'Süre bilgisi yok'}</dd>
                </div>
                <div>
                  <dt>Ülke / Dil</dt>
                  <dd>{[countryLabel, languageLabel].filter(Boolean).join(' / ') || 'Bilgi yok'}</dd>
                </div>
                {tvShow && (
                  <div>
                    <dt>Dizi Takibi</dt>
                    <dd>
                      S{tracking.currentSeason || 1} B{tracking.currentEpisode || 1}
                      {activeMovie.totalEpisodes > 0 ? ` · ${trackingProgress.watchedEpisodes}/${activeMovie.totalEpisodes} bölüm` : ''}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{creditLabel}</dt>
                  <dd>{creditNames.length > 0 ? creditNames.join(', ') : `${creditLabel} bilgisi bulunamadı`}</dd>
                </div>
              </dl>
            </div>
          </aside>

          <div className="detail-main">
            {tvShow && (
              <div className="movie-modal-panel detail-section tv-progress-panel">
                <div className="detail-panel-head">
                  <h3>İzleme Durumum</h3>
                  <span>{getWatchStatusLabel(tracking.watchStatus)}</span>
                </div>
                <div className="tv-status-pills" role="group" aria-label="İzleme durumu">
                  {tvStatusOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={tracking.watchStatus === option.value ? 'is-active' : ''}
                      onClick={() => setTvStatus(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="tv-progress-summary">
                  <span>Sezon: <strong>{tracking.currentSeason}</strong></span>
                  <span>Bölüm: <strong>{tracking.currentEpisode}</strong></span>
                  <span>Durum: <strong>{getWatchStatusLabel(tracking.watchStatus)}</strong></span>
                  {activeMovie.totalEpisodes > 0 && (
                    <span>İzlenen: <strong>{trackingProgress.watchedEpisodes}/{activeMovie.totalEpisodes}</strong></span>
                  )}
                </div>
                <div className="tv-progress-meter" aria-label={`%${trackingProgress.progressPercent} tamamlandı`}>
                  <i style={{ width: `${trackingProgress.progressPercent}%` }} />
                </div>
                <p className="tv-progress-percent">%{trackingProgress.progressPercent} tamamlandı</p>
                <div className="tv-progress-form">
                  <label>
                    <span>Sezon</span>
                    <select
                      value={tracking.currentSeason}
                      onChange={event => updateTrackingDraft({ currentSeason: Number(event.target.value) })}
                    >
                      {buildNumberOptions(seasonOptionCount).map(season => (
                        <option key={season} value={season}>Sezon {season}</option>
                      ))}
                    </select>
                  </label>
                  <div className="tv-episode-stepper">
                    <span className="tv-stepper-label">
                      Bölüm
                      <small>{episodeLimit > 0 ? `${episodeLimit} bölüm` : `${episodeOptionCount}+ bölüm`}</small>
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => updateTrackingDraft({ currentEpisode: tracking.currentEpisode - 1 })}
                        disabled={tracking.currentEpisode <= 1}
                        aria-label="Bölümü azalt"
                      >
                        -
                      </button>
                      <strong>{tracking.currentEpisode}</strong>
                      <button
                        type="button"
                        onClick={() => updateTrackingDraft({ currentEpisode: tracking.currentEpisode + 1 })}
                        disabled={episodeLimit > 0 && tracking.currentEpisode >= episodeLimit}
                        aria-label="Bölümü artır"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <label>
                    <span>Durum</span>
                    <select
                      value={tracking.watchStatus}
                      onChange={event => updateTrackingDraft({ watchStatus: event.target.value })}
                    >
                      {tvStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="tv-progress-actions">
                    <button type="button" onClick={saveTvTracking}>Kaydet</button>
                    <button type="button" onClick={handleNextEpisode} disabled={trackingCompleted}>
                      {trackingCompleted ? 'Tamamlandı' : 'Sonraki Bölüm'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="movie-modal-panel detail-section cast-panel">
              <div className="detail-panel-head">
                <h3>Oyuncular</h3>
                <span>{activeMovie.cast?.length || 0}</span>
              </div>
              {activeMovie.cast?.length > 0 ? (
                <div className="detail-cast-scroll">
                  {activeMovie.cast.map(actor => (
                    <article className="detail-cast-card" key={actor.id || actor.name}>
                      <span className="detail-cast-avatar" aria-hidden="true">
                        {(actor.name || '?').charAt(0)}
                      </span>
                      <strong>{actor.name}</strong>
                      <small>{actor.character || 'Rol bilgisi yok'}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="detail-muted">Oyuncu bilgisi bulunamadı.</p>
              )}
            </div>

            <div className="movie-modal-panel detail-section detail-watch-panel" ref={watchSectionRef}>
              <div className="detail-panel-head">
                <h3>Nerede İzlenir?</h3>
                <span>Yasal platformlar</span>
              </div>
              {!watchLinks.hasProviderInfo && (
                <p className="detail-muted">Bu içerik için izleme platformu bilgisi bulunamadı.</p>
              )}
              <div className="watch-provider-grid">
                {visibleWatchLinks.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.logo ? <img src={link.logo} alt="" aria-hidden="true" /> : <Globe2 size={18} aria-hidden="true" />}
                    <span>
                      <strong>{link.cta}</strong>
                      <small>{link.name}</small>
                    </span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ))}
                <a className="watch-google-link" href={watchLinks.googleSearchLink} target="_blank" rel="noopener noreferrer">
                  <Search size={18} aria-hidden="true" />
                  <span>
                    <strong>Google'da Nerede İzlenir Ara</strong>
                    <small>Yasal izleme kaynaklarını ara</small>
                  </span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div
              className={`movie-modal-panel detail-section detail-trailer-panel ${trailerOpen ? 'is-playing' : ''}`}
              ref={trailerSectionRef}
            >
              <div className="detail-panel-head">
                <h3>Fragman</h3>
                <span>{trailerKey ? (trailerOpen ? 'Oynatılıyor' : 'Hazır') : 'Yok'}</span>
              </div>
              {trailerKey ? (
                <>
                  <button
                    className={`detail-trailer-card ${trailerOpen ? 'is-open' : ''}`}
                    type="button"
                    onClick={toggleTrailer}
                    aria-expanded={trailerOpen}
                  >
                    <span><Play size={22} aria-hidden="true" /></span>
                    <span className="detail-trailer-card-copy">
                      <strong>{trailerOpen ? 'Fragmanı Kapat' : 'Fragmanı İzle'}</strong>
                      <small>{trailerOpen ? 'Videoyu gizlemek için tıkla' : 'Fragman bu alanda açılır'}</small>
                    </span>
                  </button>
                  <div className={`detail-trailer-player-wrap ${trailerOpen ? 'is-open' : ''}`} aria-hidden={!trailerOpen}>
                    <div className="detail-trailer-player-inner">
                      {trailerOpen && (
                        <iframe
                          className="movie-modal-trailer detail-trailer-embed"
                          title={`${activeMovie.title} fragman`}
                          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="detail-muted">{loading ? 'Fragman bilgisi yükleniyor...' : 'Bu içerik için fragman bulunamadı.'}</p>
              )}
            </div>

            <div className="movie-modal-panel detail-section detail-similar-panel">
              <div className="detail-panel-head">
                <h3>Benzer {tvShow ? 'Diziler' : 'Filmler'}</h3>
                <span>{similarContent.length}</span>
              </div>
              {similarContent.length > 0 ? (
                <div className="detail-similar-scroll">
                  {similarContent.map(related => (
                    <button
                      className="detail-similar-card"
                      key={`${related.mediaType}:${related.id}`}
                      type="button"
                      onClick={() => openSimilarContent(related)}
                    >
                      <span className="detail-similar-poster">
                        {related.poster ? (
                          <img src={related.poster} alt="" />
                        ) : (
                          <Film size={22} aria-hidden="true" />
                        )}
                        {Number(related.rating) > 0 && (
                          <em>★ {Number(related.rating).toFixed(1)}</em>
                        )}
                      </span>
                      <strong>{related.title}</strong>
                      <small>{related.year || 'Yıl yok'}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="detail-muted">{loading ? 'Benzer içerikler yükleniyor...' : 'Benzer içerik bulunamadı.'}</p>
              )}
            </div>

            <div className="movie-modal-comments-anchor detail-section" ref={commentsRef}>
              <CommentsSection key={`${mediaType}:${activeMovie.id}`} media={activeMovie} />
            </div>
          </div>
        </div>

      </section>
    </div>
  );

  return createPortal(modal, document.body);
};

export default MovieDetailsModal;
