import { useEffect, useMemo, useRef } from 'react';
import { useMovies } from '../context/MovieContext';
import { useNotifications } from '../context/NotificationContext';
import {
  calculateWatchTimeStats,
  formatWatchDuration,
  formatWatchDurationLong,
  WATCH_TIME_MILESTONES,
  WEEKLY_WATCH_MILESTONE,
} from '../utils/watchTimeHelpers';
import { NOTIFICATION_TYPES } from '../utils/notificationHelpers';
import '../styles/components/FeatureWidgets.css';

const WatchTimeStats = () => {
  const { movies } = useMovies();
  const { addNotification, notifications } = useNotifications();

  const stats = useMemo(() => calculateWatchTimeStats(movies), [movies]);
  const milestonesSentRef = useRef(new Set());

  useEffect(() => {
    WATCH_TIME_MILESTONES.forEach((milestone) => {
      if (stats.totalMinutes < milestone || milestonesSentRef.current.has(milestone)) return;

      const exists = notifications.some(
        item => item.type === NOTIFICATION_TYPES.WATCH_TIME
          && item.message.includes(formatWatchDuration(milestone)),
      );

      if (exists) {
        milestonesSentRef.current.add(milestone);
        return;
      }

      const hours = Math.floor(milestone / 60);
      addNotification(
        NOTIFICATION_TYPES.WATCH_TIME,
        `${hours} saat izleme süresine ulaştın`,
        `Toplam izleme süren ${formatWatchDuration(milestone)}.`,
        { toastVariant: 'success', actionUrl: '/statistics', showToast: false },
      );
      milestonesSentRef.current.add(milestone);
    });

    if (stats.weekMinutes >= WEEKLY_WATCH_MILESTONE && !milestonesSentRef.current.has('week')) {
      const exists = notifications.some(
        item => item.type === NOTIFICATION_TYPES.WATCH_TIME
          && item.title.includes('Bu hafta 5 saat'),
      );

      if (!exists) {
        addNotification(
          NOTIFICATION_TYPES.WATCH_TIME,
          'Bu hafta 5 saatten fazla izledin',
          `Bu hafta ${formatWatchDuration(stats.weekMinutes)} izleme yaptın.`,
          { toastVariant: 'info', actionUrl: '/statistics', showToast: false },
        );
      }
      milestonesSentRef.current.add('week');
    }
  }, [stats.totalMinutes, stats.weekMinutes, addNotification, notifications]);

  return (
    <section className="feature-widget watch-time-stats" aria-labelledby="watch-time-title">
      <div className="feature-widget-head">
        <div>
          <p className="eyebrow">Süre</p>
          <h3 id="watch-time-title">İzleme Süresi</h3>
          <p>Toplam ve dönemsel izleme süren.</p>
        </div>
      </div>

      {stats.watchedCount === 0 ? (
        <div className="feature-empty">
          <p>Henüz izleme süresi hesaplanacak kayıt yok.</p>
        </div>
      ) : (
        <>
          <p className="weekly-summary-lead">
            Toplam izleme süren: <strong>{formatWatchDuration(stats.totalMinutes)}</strong>
            <br />
            Bu yaklaşık <strong>{formatWatchDurationLong(stats.totalMinutes)}</strong> eder.
          </p>
          <div className="stats-mini-grid">
            <article><strong>{formatWatchDuration(stats.weekMinutes)}</strong><span>Bu hafta</span></article>
            <article><strong>{formatWatchDuration(stats.monthMinutes)}</strong><span>Bu ay</span></article>
            <article><strong>{formatWatchDuration(stats.movieMinutes)}</strong><span>Film süresi</span></article>
            <article><strong>{formatWatchDuration(stats.tvMinutes)}</strong><span>Dizi süresi</span></article>
            <article>
              <strong>{stats.topGenre?.name || '—'}</strong>
              <span>En çok zaman geçirilen tür</span>
            </article>
            <article><strong>{stats.watchedCount}</strong><span>İzlenen kayıt</span></article>
          </div>
        </>
      )}
    </section>
  );
};

export default WatchTimeStats;
