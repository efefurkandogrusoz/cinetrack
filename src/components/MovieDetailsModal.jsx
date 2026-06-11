import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Clock3,
  Film,
  Globe2,
  Heart,
  Languages,
  MessageSquare,
  Play,
  Plus,
  RotateCcw,
  Search,
  Star,
  Tv,
  X,
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import ShareActions from './ShareActions';
import WhereToWatch from './WhereToWatch';
import { getMediaFullDetails, getSmartTrailerVideo, NO_OVERVIEW_MESSAGE } from '../services/tmdb';
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

const getDateFromValue = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'object' && Number.isFinite(value.seconds)) {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDetailDate = (value) => {
  const date = getDateFromValue(value);
  if (!date) return null;

  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getActorProfileUrl = (actor = {}) => {
  const profilePath = actor.profile_path || actor.profilePath;
  if (actor.profileUrl) return actor.profileUrl;
  if (!profilePath) return '';
  if (String(profilePath).startsWith('http')) return profilePath;
  return `https://image.tmdb.org/t/p/w185${profilePath}`;
};

const uniqueText = (items = []) => (
  Array.from(new Set(items.filter(Boolean)))
);

const MovieDetailsModal = ({ movie, onClose }) => {
  const navigate = useNavigate();
  const {
    addMovie,
    movies,
    setUserRating,
    setWatchStatus,
    toggleFavorite,
    toggleWatched,
    updateMediaProgress,
    updateMovieMetadata,
  } = useMovies();
  const [modalMedia, setModalMedia] = useState(movie);
  const mediaType = getMediaType(modalMedia);
  const [details, setDetails] = useState(movie);
  const [loadedDetailsKey, setLoadedDetailsKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [watchAssistantPicker, setWatchAssistantPicker] = useState({ season: '', episode: '' });
  const [watchAssistantFeedback, setWatchAssistantFeedback] = useState('');
  const [trackingDraft, setTrackingDraft] = useState(null);
  const [castExpansion, setCastExpansion] = useState({ key: '', expanded: false });
  const [trailer, setTrailer] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerSeason, setTrailerSeason] = useState('');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [isHiddenSearchModalOpen, setIsHiddenSearchModalOpen] = useState(false);
  const [hiddenClickCount, setHiddenClickCount] = useState(0);
  const [clickTimeout, setClickTimeout] = useState(null);
  const modalRef = useRef(null);
  const ratingRef = useRef(null);
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
  const isListed = Boolean(listedMovie);
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
  const mediaDetailKey = `${mediaType}:${activeMovie.id || ''}`;
  const defaultAssistantSeason = tvShow ? Math.max(1, Number(activeMovie.currentSeason || tracking.currentSeason) || 1) : '';
  const defaultAssistantEpisode = tvShow ? Math.max(1, Number(activeMovie.currentEpisode || tracking.currentEpisode) || 1) : '';
  const selectedAssistantSeason = Number(watchAssistantPicker.season) || 0;
  const assistantSeasonCount = tvShow
    ? Math.max(Number(activeMovie.totalSeasons) || 0, selectedAssistantSeason, tracking.currentSeason, 1)
    : 0;
  const assistantEpisodeLimit = tvShow && selectedAssistantSeason > 0
    ? getEpisodeCountForSeason(activeMovie, selectedAssistantSeason)
    : 0;
  const assistantEpisodeCount = tvShow
    ? Math.max(assistantEpisodeLimit, Number(watchAssistantPicker.episode) || Number(defaultAssistantEpisode) || 0, 1)
    : 0;
  const productionStatus = formatProductionStatus(activeMovie.status);
  const runtimeLabel = formatRuntime(activeMovie, tvShow);
  const countryLabel = formatCountries(activeMovie);
  const languageLabel = formatLanguage(activeMovie.originalLanguage || activeMovie.original_language);
  const rating = Number(activeMovie.rating ?? activeMovie.voteAverage);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
  const userRating = getUserRating(activeMovie);
  const originalTitle = activeMovie.originalTitle || activeMovie.originalName || activeMovie.original_title || activeMovie.original_name;
  const showOriginalTitle = originalTitle && originalTitle !== activeMovie.title;
  const titleText = String(activeMovie.title || '');
  const titleWithoutLast = titleText.slice(0, -1);
  const lastTitleLetter = titleText.slice(-1);
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
  const castExpansionKey = `${mediaType}:${activeMovie?.id || ''}`;
  const showAllCast = castExpansion.key === castExpansionKey && castExpansion.expanded;
  const similarContent = activeMovie.similarContent || [];
  const castList = activeMovie.cast || [];
  const visibleCastList = showAllCast ? castList : castList.slice(0, 5);
  const hasHiddenCast = castList.length > 5;
  const watchMethodLabel = activeMovie.watchMethod ||
    activeMovie.preferredPlatform ||
    (tvShow ? 'Dizi takibi' : 'Film takibi');
  const startedDateLabel = formatDetailDate(
    activeMovie.watchStartedAt ||
    activeMovie.startedAt ||
    activeMovie.addedAt ||
    activeMovie.createdAt,
  );
  const lastWatchedDateLabel = formatDetailDate(
    activeMovie.lastWatchedAt ||
    activeMovie.watchedAt ||
    activeMovie.updatedAt ||
    activeMovie.ratingAt,
  );
  const trailerSeasonNumber = tvShow ? Math.max(1, Number(trailerSeason) || Number(tracking.currentSeason) || 1) : 1;
  const trailerSeasonCount = tvShow ? Math.max(Number(activeMovie.totalSeasons) || 0, trailerSeasonNumber, 1) : 0;

  useLayoutEffect(() => {
    setDetailModalPageState(true);

    return () => {
      setDetailModalPageState(false);
    };
  }, []);

  useEffect(() => () => {
    if (clickTimeout) {
      window.clearTimeout(clickTimeout);
    }
  }, [clickTimeout]);

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
      setLoadedDetailsKey('');
      getMediaFullDetails(modalMedia.id, mediaType)
        .then(fullDetails => {
          if (cancelled) return;

          if (fullDetails) {
            setDetails({ ...modalMedia, ...fullDetails });
            setLoadedDetailsKey(`${mediaType}:${modalMedia.id}`);
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
    if (!listedMovie || loadedDetailsKey !== mediaDetailKey) return;

    const nextOverview = details?.overview?.trim();
    if (!nextOverview || nextOverview === listedMovie.overview) return;

    updateMovieMetadata(docId, {
      overview: nextOverview,
      overviewLanguage: details.overviewLanguage || listedMovie.overviewLanguage || '',
    });
  }, [
    details?.overview,
    details?.overviewLanguage,
    docId,
    listedMovie,
    loadedDetailsKey,
    mediaDetailKey,
    updateMovieMetadata,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWatchAssistantFeedback('');
      setIsHiddenSearchModalOpen(false);
      setTrailer(null);
      setTrailerOpen(false);
      setTrailerSeason(tvShow ? String(defaultAssistantSeason) : '');
      setWatchAssistantPicker(tvShow
        ? {
          season: String(defaultAssistantSeason),
          episode: String(defaultAssistantEpisode),
        }
        : { season: '', episode: '' });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [mediaDetailKey, tvShow, defaultAssistantSeason, defaultAssistantEpisode]);

  useEffect(() => {
    let cancelled = false;

    if (!activeMovie?.id) return undefined;

    const timer = window.setTimeout(() => {
      setTrailerLoading(true);
      setTrailerOpen(false);

      getSmartTrailerVideo({
        mediaId: activeMovie.id,
        mediaType,
        seasonNumber: trailerSeasonNumber,
      })
        .then(nextTrailer => {
          if (cancelled) return;
          setTrailer(nextTrailer);
        })
        .catch(() => {
          if (!cancelled) setTrailer(null);
        })
        .finally(() => {
          if (!cancelled) setTrailerLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeMovie?.id, mediaType, trailerSeasonNumber]);

  useEffect(() => {
    if (!hiddenClickCount || isHiddenSearchModalOpen) return undefined;

    const resetOnOutsideClick = () => {
      if (clickTimeout) {
        window.clearTimeout(clickTimeout);
      }

      setClickTimeout(null);
      setHiddenClickCount(0);
    };

    window.addEventListener('click', resetOnOutsideClick);
    return () => window.removeEventListener('click', resetOnOutsideClick);
  }, [clickTimeout, hiddenClickCount, isHiddenSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isHiddenSearchModalOpen) {
          if (clickTimeout) {
            window.clearTimeout(clickTimeout);
          }

          setClickTimeout(null);
          setHiddenClickCount(0);
          setWatchAssistantFeedback('');
          setIsHiddenSearchModalOpen(false);
          return;
        }

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clickTimeout, isHiddenSearchModalOpen, onClose]);

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

  const handleAddToLibrary = async () => {
    if (listedMovie) return;

    await addToList({ watched: false, watchStatus: watchStatus || 'watchlist' });
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

  const resetTvTracking = async () => {
    const resetTracking = normalizeTvTracking(activeMovie, {
      watchStatus: 'watchlist',
      currentSeason: 1,
      currentEpisode: 1,
    });
    const updates = {
      ...resetTracking,
      watched: false,
      progressPercent: 0,
      watchedEpisodes: 0,
      totalWatchedEpisodes: 0,
    };

    if (listedMovie) {
      await updateMediaProgress(docId, updates);
      setTrackingDraft(null);
      return;
    }

    await addToList(updates);
    setTrackingDraft(null);
  };

  const updateWatchAssistantSeason = (event) => {
    const nextSeason = event.target.value;
    const nextSeasonNumber = Number(nextSeason) || 0;
    const nextEpisodeLimit = nextSeasonNumber > 0
      ? getEpisodeCountForSeason(activeMovie, nextSeasonNumber)
      : 0;

    setWatchAssistantFeedback('');
    setWatchAssistantPicker(current => {
      const currentEpisode = Number(current.episode) || 0;
      const nextEpisode = currentEpisode > 0
        ? String(nextEpisodeLimit > 0 ? Math.min(currentEpisode, nextEpisodeLimit) : currentEpisode)
        : '';

      return {
        season: nextSeason,
        episode: nextSeason ? nextEpisode : '',
      };
    });
  };

  const updateWatchAssistantEpisode = (event) => {
    setWatchAssistantFeedback('');
    setWatchAssistantPicker(current => ({
      ...current,
      episode: event.target.value,
    }));
  };

  const openWatchAssistantSearch = () => {
    const cleanTitle = titleText || 'İçerik';

    if (!tvShow) {
      const query = `${cleanTitle} türkçe dublaj izle`;

      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
      return;
    }

    const season = Number(watchAssistantPicker.season);
    const episode = Number(watchAssistantPicker.episode);

    if (!season || !episode) {
      const message = 'Lütfen sezon ve bölüm seç.';
      setWatchAssistantFeedback(message);
      window.alert(message);
      return;
    }

    const query = `${cleanTitle} sezon ${season} bölüm ${episode} türkçe dublaj izle`;

    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const resetHiddenSearchTrigger = () => {
    if (clickTimeout) {
      window.clearTimeout(clickTimeout);
    }

    setClickTimeout(null);
    setHiddenClickCount(0);
  };

  const closeHiddenSearchModal = () => {
    resetHiddenSearchTrigger();
    setWatchAssistantFeedback('');
    setIsHiddenSearchModalOpen(false);
  };

  const openSimilarContent = (relatedMedia) => {
    setModalMedia(relatedMedia);
    setDetails(relatedMedia);
    setLoadedDetailsKey('');
    setDetailsError(null);
    setWatchAssistantFeedback('');
    setTrackingDraft(null);
    resetHiddenSearchTrigger();
    setIsHiddenSearchModalOpen(false);
    modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openActorDetails = (actor) => {
    if (!actor?.id) return;
    onClose?.();
    navigate(`/actor/${actor.id}`);
  };

  const handleHiddenTitleClick = (event) => {
    event.stopPropagation();

    if (clickTimeout) {
      window.clearTimeout(clickTimeout);
    }

    const nextCount = hiddenClickCount + 1;

    if (nextCount >= 5) {
      setClickTimeout(null);
      setHiddenClickCount(0);
      setWatchAssistantFeedback('');
      setIsHiddenSearchModalOpen(true);
      return;
    }

    setHiddenClickCount(nextCount);
    const nextTimeout = window.setTimeout(() => {
      setHiddenClickCount(0);
      setClickTimeout(null);
    }, 4000);
    setClickTimeout(nextTimeout);
  };

  const heroStyle = backdrop
    ? {
      backgroundImage: `var(--detail-hero-gradient), url(${backdrop})`,
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
            <h2>
              {titleWithoutLast}
              {lastTitleLetter && (
                <span className="secret-title-letter" onClick={handleHiddenTitleClick}>
                  {lastTitleLetter}
                </span>
              )}
            </h2>
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
              {activeMovie.overview || NO_OVERVIEW_MESSAGE}
            </p>

            {detailsError && <p className="movie-modal-warning" role="alert">{detailsError}</p>}

            <div className="detail-actions">
              <div className="detail-actions-primary">
                <button
                  className={`detail-btn detail-btn--hero ${watchStatus === 'watchlist' ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleWatchlist}
                >
                  <Bookmark size={16} aria-hidden="true" />
                  {watchStatus === 'watchlist' ? 'Planlama Listemde' : 'Planlama Listeme Ekle'}
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
                  className={`detail-btn detail-btn--hero ${isFavorite ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleFavorite}
                >
                  <Heart size={16} aria-hidden="true" />
                  {isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                </button>
                <button
                  className={`detail-btn detail-btn--hero ${isListed ? 'is-active' : ''}`}
                  type="button"
                  onClick={handleAddToLibrary}
                  disabled={isListed}
                >
                  <Plus size={16} aria-hidden="true" />
                  {isListed ? 'Listede' : 'Listeye Ekle'}
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
              </div>
            </div>

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
                  <span className="detail-info-icon"><Star size={16} aria-hidden="true" /></span>
                  <dt>TMDB Puanı</dt>
                  <dd>{ratingLabel ? `${ratingLabel}/10` : 'Puan bilgisi yok'}</dd>
                </div>
                <div>
                  <span className="detail-info-icon"><CheckCircle2 size={16} aria-hidden="true" /></span>
                  <dt>Kullanıcı Puanı</dt>
                  <dd>{userRating > 0 ? `${userRating}/10` : 'Henüz puan vermedin'}</dd>
                </div>
                <div>
                  <span className="detail-info-icon"><Clock3 size={16} aria-hidden="true" /></span>
                  <dt>Süre</dt>
                  <dd>{runtimeLabel || 'Süre bilgisi yok'}</dd>
                </div>
                <div>
                  <span className="detail-info-icon"><Languages size={16} aria-hidden="true" /></span>
                  <dt>Ülke / Dil</dt>
                  <dd>{[countryLabel, languageLabel].filter(Boolean).join(' / ') || 'Bilgi yok'}</dd>
                </div>
                {tvShow && (
                  <div>
                    <span className="detail-info-icon"><Tv size={16} aria-hidden="true" /></span>
                    <dt>Dizi Takibi</dt>
                    <dd>
                      S{tracking.currentSeason || 1} B{tracking.currentEpisode || 1}
                      {activeMovie.totalEpisodes > 0 ? ` · ${trackingProgress.watchedEpisodes}/${activeMovie.totalEpisodes} bölüm` : ''}
                    </dd>
                  </div>
                )}
                <div>
                  <span className="detail-info-icon"><Clapperboard size={16} aria-hidden="true" /></span>
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
                  <div className="detail-panel-actions">
                    <span>{getWatchStatusLabel(tracking.watchStatus)}</span>
                    <button type="button" onClick={resetTvTracking}>
                      <RotateCcw size={14} aria-hidden="true" />
                      Durumu Sıfırla
                    </button>
                  </div>
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
                <div className="tv-progress-insights">
                  <span>
                    <Tv size={16} aria-hidden="true" />
                    <small>İzleme yöntemi</small>
                    <strong>{watchMethodLabel}</strong>
                  </span>
                  <span>
                    <CalendarDays size={16} aria-hidden="true" />
                    <small>Başlangıç</small>
                    <strong>{startedDateLabel || 'Henüz yok'}</strong>
                  </span>
                  <span>
                    <Clock3 size={16} aria-hidden="true" />
                    <small>Son izleme</small>
                    <strong>{lastWatchedDateLabel || 'Henüz yok'}</strong>
                  </span>
                </div>
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

            <div className={`movie-modal-panel detail-section detail-trailer-panel ${trailerOpen && trailer ? 'is-playing' : ''}`}>
              <div className="detail-panel-head">
                <h3>Fragman</h3>
                <span>{trailer?.badgeLabel || (trailerLoading ? 'Aranıyor' : 'YouTube')}</span>
              </div>

              {tvShow && (
                <div className="detail-trailer-controls">
                  <label>
                    <span>Sezon</span>
                    <select
                      value={String(trailerSeasonNumber)}
                      onChange={event => setTrailerSeason(event.target.value)}
                    >
                      {buildNumberOptions(trailerSeasonCount).map(season => (
                        <option key={season} value={season}>Sezon {season}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {trailerLoading ? (
                <div className="detail-trailer-loading" role="status">
                  <span aria-hidden="true" />
                  <strong>Fragman aranıyor</strong>
                  <small>Önce Türkçe dublaj, sonra Türkçe altyazılı ve orijinal fragmanlar kontrol ediliyor.</small>
                </div>
              ) : trailer ? (
                <>
                  <button
                    className={`detail-trailer-card ${trailerOpen ? 'is-open' : ''}`}
                    type="button"
                    style={{ '--trailer-thumb': `url(${trailer.thumbnail})` }}
                    onClick={() => setTrailerOpen(current => !current)}
                    aria-expanded={trailerOpen}
                  >
                    <span className="detail-trailer-thumb">
                      <Play size={22} aria-hidden="true" />
                    </span>
                    <span className="detail-trailer-card-copy">
                      <strong>{trailer.name || 'Fragman'}</strong>
                      <small>{[trailer.scopeLabel, trailer.badgeLabel, trailer.official ? 'Resmi' : null].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>

                  <div className={`detail-trailer-player-wrap ${trailerOpen ? 'is-open' : ''}`}>
                    <div className="detail-trailer-player-inner">
                      {trailerOpen && (
                        <iframe
                          className="detail-trailer-embed"
                          src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0&modestbranding=1`}
                          title={`${activeMovie.title} fragmanı`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="detail-trailer-empty">
                  <Film aria-hidden="true" />
                  <strong>Fragman bulunamadı</strong>
                  <small>Bu içerik için uygun YouTube fragmanı bulunamadı.</small>
                </div>
              )}
            </div>

            <WhereToWatch
              mediaId={activeMovie.id}
              mediaType={mediaType}
              mediaTitle={activeMovie.title}
              watchLinks={activeMovie.watchLinks || {}}
            />

            <div className="movie-modal-panel detail-section cast-panel">
              <div className="detail-panel-head">
                <h3>Oyuncular</h3>
                <span>{castList.length}</span>
              </div>
              {castList.length > 0 ? (
                <>
                <div className={`detail-cast-scroll ${showAllCast ? 'is-expanded' : ''}`}>
                  {visibleCastList.map(actor => {
                    const profileUrl = getActorProfileUrl(actor);

                    return (
                      <button
                        className="detail-cast-card"
                        key={actor.id || actor.name}
                        type="button"
                        onClick={() => openActorDetails(actor)}
                        disabled={!actor.id}
                        aria-label={`${actor.name} oyuncu detayını aç`}
                      >
                        <span className="detail-cast-avatar" aria-hidden="true">
                          {profileUrl ? (
                            <img src={profileUrl} alt="" loading="lazy" />
                          ) : (
                            (actor.name || '?').charAt(0)
                          )}
                        </span>
                        <strong>{actor.name}</strong>
                        <small>{actor.character || 'Rol bilgisi yok'}</small>
                      </button>
                    );
                  })}
                </div>
                {hasHiddenCast && (
                  <button
                    className="detail-cast-toggle"
                    type="button"
                    onClick={() => setCastExpansion({
                      key: castExpansionKey,
                      expanded: !showAllCast,
                    })}
                    aria-expanded={showAllCast}
                  >
                    {showAllCast ? 'Daha Az Göster' : 'Tüm Oyuncuları Göster'}
                  </button>
                )}
                </>
              ) : (
                <p className="detail-muted">Oyuncu bilgisi bulunamadı.</p>
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
      {isHiddenSearchModalOpen && (
        <div className="secret-watch-modal" role="dialog" aria-modal="true" aria-labelledby="secret-watch-title">
          <button
            className="secret-watch-backdrop"
            type="button"
            onClick={closeHiddenSearchModal}
            aria-label="Gizli izleme yardımcısını kapat"
          />
          <section className="secret-watch-card watch-assistant-modal-card">
            <button
              className="secret-watch-close"
              type="button"
              onClick={closeHiddenSearchModal}
              aria-label="Kapat"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <p className="eyebrow">CineTrack</p>
            <h3 id="secret-watch-title">Gizli İzleme Yardımcısı</h3>
            <p>Bu içerik için izleme seçeneklerini arayabilirsin.</p>

            {tvShow ? (
              <div className="watch-assistant-controls">
                <label className="watch-assistant-field">
                  <span>Sezon Seç</span>
                  <div className="watch-assistant-select">
                    <Tv size={22} aria-hidden="true" />
                    <select
                      value={watchAssistantPicker.season}
                      onChange={updateWatchAssistantSeason}
                      aria-label="Sezon Seç"
                    >
                      <option value="">Sezon Seç</option>
                      {buildNumberOptions(assistantSeasonCount).map(season => (
                        <option key={season} value={season}>Sezon {season}</option>
                      ))}
                    </select>
                    <ChevronDown size={22} aria-hidden="true" />
                  </div>
                </label>

                <label className="watch-assistant-field">
                  <span>Bölüm Seç</span>
                  <div className="watch-assistant-select">
                    <Clapperboard size={22} aria-hidden="true" />
                    <select
                      value={watchAssistantPicker.episode}
                      onChange={updateWatchAssistantEpisode}
                      disabled={!watchAssistantPicker.season}
                      aria-label="Bölüm Seç"
                    >
                      <option value="">Bölüm Seç</option>
                      {buildNumberOptions(assistantEpisodeCount).map(episode => (
                        <option key={episode} value={episode}>Bölüm {episode}</option>
                      ))}
                    </select>
                    <ChevronDown size={22} aria-hidden="true" />
                  </div>
                </label>
              </div>
            ) : (
              <div className="watch-assistant-movie-note">
                <Film size={22} aria-hidden="true" />
                <span>Film için izleme seçeneklerini arayabilirsin.</span>
              </div>
            )}

            <button className="watch-assistant-search" type="button" onClick={openWatchAssistantSearch}>
              <Search size={24} aria-hidden="true" />
              <span>Ara</span>
            </button>

            {watchAssistantFeedback && (
              <p className="watch-assistant-message" role="alert">{watchAssistantFeedback}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );

  return createPortal(modal, document.body);
};

export default MovieDetailsModal;
