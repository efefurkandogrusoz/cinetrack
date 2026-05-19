import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMediaFullDetails } from '../services/tmdb';
import { useMovies } from '../context/MovieContext';
import {
  getMediaKey,
  getMediaType,
  getMediaTypeLabel,
  getWatchStatus,
  getWatchStatusLabel,
  isTvShow,
} from '../utils/media';
import '../styles/components/MovieDetailsModal.css';

const tvStatusOptions = [
  { value: 'watchlist', label: 'İzlenecek' },
  { value: 'watching', label: 'İzleniyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'dropped', label: 'Bırakıldı' },
];

const formatProductionStatus = (status) => {
  if (!status) return null;
  if (status === 'Returning Series' || status === 'In Production') return 'Devam ediyor';
  if (status === 'Ended' || status === 'Canceled') return 'Bitti';
  return status;
};

const MovieDetailsModal = ({ movie, onClose }) => {
  const {
    addMovie,
    advanceEpisode,
    movies,
    setReaction,
    toggleFavorite,
    toggleWatched,
    updateMediaProgress,
  } = useMovies();
  const mediaType = getMediaType(movie);
  const [details, setDetails] = useState(movie);
  const [loading, setLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const listedMovie = useMemo(
    () => movies.find(item => getMediaKey(item) === getMediaKey(movie)),
    [movies, movie]
  );

  const activeMovie = listedMovie
    ? {
      ...details,
      ...listedMovie,
      overview: details?.overview || listedMovie.overview || '',
      genres: details?.genres?.length ? details.genres : listedMovie.genres || [],
      totalSeasons: listedMovie.totalSeasons || details?.totalSeasons || 0,
      totalEpisodes: listedMovie.totalEpisodes || details?.totalEpisodes || 0,
      seasonEpisodeCounts: Object.keys(listedMovie.seasonEpisodeCounts || {}).length > 0
        ? listedMovie.seasonEpisodeCounts
        : details?.seasonEpisodeCounts || {},
      status: listedMovie.status || details?.status || null,
    }
    : details || movie;
  const docId = activeMovie?.docId || activeMovie?.id;
  const tvShow = isTvShow(activeMovie);
  const mediaLabel = getMediaTypeLabel(activeMovie);
  const watchStatus = getWatchStatus(activeMovie);
  const [trackingDraft, setTrackingDraft] = useState(null);
  const tracking = trackingDraft || {
    currentSeason: activeMovie?.currentSeason || 1,
    currentEpisode: activeMovie?.currentEpisode || 0,
    watchStatus,
  };

  const updateTrackingDraft = (updates) => {
    setTrackingDraft(current => ({
      ...(current || tracking),
      ...updates,
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setDetailsError(null);
      getMediaFullDetails(movie.id, mediaType)
        .then(fullDetails => {
          if (cancelled) return;

          if (fullDetails) {
            setDetails({ ...movie, ...fullDetails });
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
  }, [movie, mediaType]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const addToList = async (overrides = {}) => {
    await addMovie({ ...details, mediaType, ...overrides });
  };

  const saveTvTracking = async () => {
    const updates = {
      currentSeason: Number(tracking.currentSeason) || 1,
      currentEpisode: Number(tracking.currentEpisode) || 0,
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
    const updates = {
      watchStatus: nextStatus,
      currentSeason: Number(tracking.currentSeason) || 1,
      currentEpisode: nextStatus === 'watching'
        ? Math.max(1, Number(tracking.currentEpisode) || 1)
        : Number(tracking.currentEpisode) || 0,
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

  const handleFavorite = async () => {
    if (listedMovie) {
      await toggleFavorite(docId, listedMovie.favorite || false);
      return;
    }

    await addToList({ favorite: true, isFavorite: true });
  };

  const handleLike = async () => {
    if (listedMovie) {
      await setReaction(docId, 'liked');
      return;
    }

    await addToList({ watched: true, watchStatus: 'watched', reaction: 'liked' });
  };

  const handleNextEpisode = async () => {
    if (listedMovie) {
      await advanceEpisode(docId);
      return;
    }

    await addToList({
      watchStatus: 'watching',
      currentSeason: Number(tracking.currentSeason) || 1,
      currentEpisode: Math.max(1, (Number(tracking.currentEpisode) || 0) + 1),
      totalWatchedEpisodes: 1,
    });
  };

  const backdrop = details?.backdrop || details?.poster;
  const productionStatus = formatProductionStatus(activeMovie.status);
  const rating = Number(activeMovie.rating ?? activeMovie.voteAverage);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null;
  const totalInfo = tvShow
    ? [
      activeMovie.totalSeasons ? `${activeMovie.totalSeasons} sezon` : null,
      activeMovie.totalEpisodes ? `${activeMovie.totalEpisodes} bölüm` : null,
      productionStatus,
    ].filter(Boolean)
    : [];

  const modal = (
    <div className="movie-modal-layer" role="dialog" aria-modal="true" aria-label={`${activeMovie.title} detayları`}>
      <button className="movie-modal-backdrop" type="button" onClick={onClose} aria-label="Detayları kapat" />
      <section className="movie-modal">
        <button className="movie-modal-close" type="button" onClick={onClose} aria-label="Kapat">
          X
        </button>

        <div className="movie-modal-hero" style={backdrop ? { backgroundImage: `linear-gradient(90deg, #181818 0%, rgba(24, 24, 24, 0.82) 45%, rgba(24, 24, 24, 0.22)), url(${backdrop})` } : undefined}>
          <div className="movie-modal-copy">
            <p className="eyebrow">{mediaLabel} Detayı</p>
            <h2>{activeMovie.title}</h2>
            <div className="movie-modal-meta">
              <span>{mediaLabel}</span>
              <span>{activeMovie.year}</span>
              {details?.runtime && <span>{details.runtime} dk</span>}
              {ratingLabel && <span>{ratingLabel} puan</span>}
              {totalInfo.map(item => <span key={item}>{item}</span>)}
              {activeMovie.genres?.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}
            </div>
            <p>{activeMovie.overview || `Bu ${mediaLabel.toLowerCase()} için açıklama bulunamadı.`}</p>
            {detailsError && <p className="movie-modal-warning" role="alert">{detailsError}</p>}
            <div className="movie-modal-actions">
              <button type="button" onClick={() => addToList(tvShow ? { watchStatus: 'watchlist' } : {})}>
                {listedMovie ? 'Listede' : 'Listeye Ekle'}
              </button>
              {tvShow ? (
                <>
                  <button type="button" onClick={() => setTvStatus('watching')}>
                    İzleniyor
                  </button>
                  <button type="button" onClick={handleWatch}>
                    {watchStatus === 'completed' ? 'Tamamlandı' : 'Tamamla'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={handleWatch}>
                    {listedMovie?.watched ? 'İzlendi' : 'İzle'}
                  </button>
                  <button type="button" onClick={handleLike}>
                    {listedMovie?.reaction === 'liked' ? 'Beğenildi' : 'Beğen'}
                  </button>
                </>
              )}
              <button type="button" onClick={handleFavorite}>
                {listedMovie?.favorite ? 'Favori' : 'Favorile'}
              </button>
            </div>
          </div>
        </div>

        <div className="movie-modal-body">
          <div className="movie-modal-poster">
            {activeMovie.poster && <img src={activeMovie.poster} alt={activeMovie.title} />}
          </div>

          {tvShow && (
            <div className="movie-modal-panel tv-progress-panel">
              <h3>İzleme Durumum</h3>
              <div className="tv-progress-summary">
                <span>Sezon: <strong>{activeMovie.currentSeason || tracking.currentSeason}</strong></span>
                <span>Bölüm: <strong>{activeMovie.currentEpisode || tracking.currentEpisode}</strong></span>
                <span>Durum: <strong>{getWatchStatusLabel(activeMovie)}</strong></span>
              </div>
              <div className="tv-progress-form">
                <label>
                  <span>Sezon</span>
                  <input
                    type="number"
                    min="1"
                    max={activeMovie.totalSeasons || undefined}
                    value={tracking.currentSeason}
                    onChange={event => updateTrackingDraft({ currentSeason: event.target.value })}
                  />
                </label>
                <label>
                  <span>Bölüm</span>
                  <input
                    type="number"
                    min="0"
                    value={tracking.currentEpisode}
                    onChange={event => updateTrackingDraft({ currentEpisode: event.target.value })}
                  />
                </label>
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
              </div>
              <div className="tv-progress-actions">
                <button type="button" onClick={saveTvTracking}>Kaydet</button>
                <button type="button" onClick={handleNextEpisode}>Sonraki Bölüm</button>
              </div>
            </div>
          )}

          <div className="movie-modal-panel">
            <h3>Fragman</h3>
            {loading ? (
              <p>Detaylar yükleniyor...</p>
            ) : details?.trailerKey ? (
              <iframe
                className="movie-modal-trailer"
                title={`${activeMovie.title} fragman`}
                src={`https://www.youtube.com/embed/${details.trailerKey}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Bu {mediaLabel.toLowerCase()} için fragman bulunamadı.</p>
            )}
          </div>

          <div className="movie-modal-panel cast-panel">
            <h3>Oyuncular</h3>
            {details?.cast?.length > 0 ? (
              <div className="cast-list">
                {details.cast.map(actor => (
                  <span key={actor.id}>
                    <strong>{actor.name}</strong>
                    <small>{actor.character}</small>
                  </span>
                ))}
              </div>
            ) : (
              <p>Oyuncu bilgisi bulunamadı.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
};

export default MovieDetailsModal;
