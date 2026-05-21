import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Swords } from 'lucide-react';
import { useMovies } from '../context/MovieContext';
import { useNotifications } from '../context/NotificationContext';
import { compareMovies } from '../utils/compareHelpers';
import { getMediaKey, getMediaTypeLabel } from '../utils/media';
import { NOTIFICATION_TYPES } from '../utils/notificationHelpers';
import MovieDetailsModal from './MovieDetailsModal';
import '../styles/components/FeatureWidgets.css';

const CompareCard = ({ movie, label }) => {
  const mediaLabel = getMediaTypeLabel(movie);
  const rating = Number(movie.rating);
  const ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '—';

  return (
    <article className="compare-card">
      <span className="compare-card-label">{label}</span>
      <div className="compare-card-poster">
        {movie.poster ? <img src={movie.poster} alt="" /> : <span>{mediaLabel}</span>}
      </div>
      <strong>{movie.title}</strong>
      <span>{mediaLabel} · {movie.year || 'Yıl yok'}</span>
      <span>{movie.genres?.[0] || 'Tür yok'} · TMDB {ratingLabel}</span>
    </article>
  );
};

const ComparePicker = () => {
  const { addMovie, movies } = useMovies();
  const { addNotification } = useNotifications();
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const [result, setResult] = useState(null);
  const [detailsMovie, setDetailsMovie] = useState(null);

  const options = useMemo(
    () => movies.map(movie => ({
      key: getMediaKey(movie),
      title: movie.title,
      movie,
    })),
    [movies],
  );

  const movieA = options.find(item => item.key === firstId)?.movie;
  const movieB = options.find(item => item.key === secondId)?.movie;

  const runCompare = () => {
    if (!movieA || !movieB || firstId === secondId) return;

    const comparison = compareMovies(movieA, movieB, movies);
    setResult(comparison);

    addNotification(
      NOTIFICATION_TYPES.COMPARE,
      'Karşılaştırma hazır',
      `Senin için daha uygun içerik: ${comparison.winner.title}`,
      { toastVariant: 'success' },
    );
  };

  const handleAddWinner = async () => {
    if (!result?.winner) return;

    await addMovie({
      ...result.winner,
      watchStatus: 'watchlist',
    });

    addNotification(
      NOTIFICATION_TYPES.WATCHLIST,
      'Listeye Eklendi',
      `${result.winner.title} izlenecekler listesine eklendi.`,
      { toastVariant: 'success' },
    );
  };

  if (movies.length < 2) {
    return (
      <section className="feature-widget compare-picker" aria-labelledby="compare-title">
        <div className="feature-widget-head">
          <div>
            <p className="eyebrow">Karar ver</p>
            <h3 id="compare-title">Hangisini İzleyeyim?</h3>
          </div>
        </div>
        <div className="feature-empty">
          <p>Karşılaştırma yapabilmek için en az iki içerik eklemelisin.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="feature-widget compare-picker" aria-labelledby="compare-title">
      <div className="feature-widget-head">
        <div>
          <p className="eyebrow">Karar ver</p>
          <h3 id="compare-title">Hangisini İzleyeyim?</h3>
          <p>İki içerik arasında kaldığında karşılaştır.</p>
        </div>
        <button type="button" className="feature-primary-btn" onClick={runCompare} disabled={!movieA || !movieB || firstId === secondId}>
          <Swords size={16} aria-hidden="true" />
          Karşılaştır
        </button>
      </div>

      <div className="compare-select-row">
        <label>
          <span>1. İçerik</span>
          <select value={firstId} onChange={event => setFirstId(event.target.value)}>
            <option value="">Seç</option>
            {options.map(item => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
        </label>
        <label>
          <span>2. İçerik</span>
          <select value={secondId} onChange={event => setSecondId(event.target.value)}>
            <option value="">Seç</option>
            {options.map(item => (
              <option key={item.key} value={item.key}>{item.title}</option>
            ))}
          </select>
        </label>
      </div>

      {movieA && movieB && firstId !== secondId && (
        <div className="compare-stage">
          <CompareCard movie={movieA} label="Seçenek A" />
          <span className="compare-vs" aria-hidden="true">VS</span>
          <CompareCard movie={movieB} label="Seçenek B" />
        </div>
      )}

      {result && (
        <article className="compare-result">
          <p>Bugün bunu izlemeni öneriyoruz:</p>
          <strong>{result.winner.title}</strong>
          <span>{result.reason}</span>
          <div className="suggestion-actions">
            <button type="button" onClick={() => setDetailsMovie(result.winner)}>Detayları Gör</button>
            <button type="button" onClick={handleAddWinner}>
              <Plus size={14} aria-hidden="true" />
              Listeme Ekle
            </button>
            <button type="button" className="ghost" onClick={runCompare}>
              <RefreshCw size={14} aria-hidden="true" />
              Tekrar Karşılaştır
            </button>
          </div>
        </article>
      )}

      {detailsMovie && (
        <MovieDetailsModal movie={detailsMovie} onClose={() => setDetailsMovie(null)} />
      )}
    </section>
  );
};

export default ComparePicker;
