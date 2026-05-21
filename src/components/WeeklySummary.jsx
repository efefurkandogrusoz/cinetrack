import { useEffect, useMemo, useRef } from 'react';
import { useMovies } from '../context/MovieContext';
import { useNotifications } from '../context/NotificationContext';
import { calculateWeeklySummary } from '../utils/weeklySummaryHelpers';
import { NOTIFICATION_TYPES } from '../utils/notificationHelpers';
import '../styles/components/FeatureWidgets.css';

const WeeklySummary = () => {
  const { movies } = useMovies();
  const { addNotification, notifications } = useNotifications();

  const summary = useMemo(() => calculateWeeklySummary(movies), [movies]);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!summary.hasActivity || notifiedRef.current) return;

    const alreadySent = notifications.some(
      item => item.type === NOTIFICATION_TYPES.WEEKLY_SUMMARY
        && item.title === 'Haftalık özetin hazır',
    );

    if (alreadySent) {
      notifiedRef.current = true;
      return;
    }

    addNotification(
      NOTIFICATION_TYPES.WEEKLY_SUMMARY,
      'Haftalık özetin hazır',
      `Bu hafta ${summary.totalWatched} içerik izledin.`,
      { toastVariant: 'info', actionUrl: '/statistics', showToast: false },
    );
    notifiedRef.current = true;
  }, [summary.hasActivity, summary.totalWatched, addNotification, notifications]);

  return (
    <section className="feature-widget weekly-summary" aria-labelledby="weekly-summary-title">
      <div className="feature-widget-head">
        <div>
          <p className="eyebrow">Haftalık</p>
          <h3 id="weekly-summary-title">Haftalık Özet</h3>
          <p>Bu haftaki izleme aktiviteni gör.</p>
        </div>
      </div>

      {!summary.hasActivity ? (
        <div className="feature-empty">
          <p>Bu hafta henüz izleme aktiviten yok.</p>
        </div>
      ) : (
        <>
          <p className="weekly-summary-lead">
            Bu hafta {summary.moviesWatched} film ve {summary.showsWatched} dizi izledin.
            Toplam {summary.weekDurationLabel} izleme yaptın.
          </p>
          <div className="stats-mini-grid">
            <article><strong>{summary.totalWatched}</strong><span>İzlenen</span></article>
            <article><strong>{summary.favoritesAdded}</strong><span>Favori eklendi</span></article>
            <article><strong>{summary.watchlistAdded}</strong><span>Listeye eklendi</span></article>
            <article>
              <strong>{summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '—'}</strong>
              <span>Ortalama puan</span>
            </article>
            <article><strong>{summary.topGenre || '—'}</strong><span>En çok izlenen tür</span></article>
            <article>
              <strong>{summary.latestWatched?.title || '—'}</strong>
              <span>Son izlenen</span>
            </article>
          </div>
        </>
      )}
    </section>
  );
};

export default WeeklySummary;
