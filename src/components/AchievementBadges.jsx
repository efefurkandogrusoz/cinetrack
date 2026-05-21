import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clapperboard,
  Crown,
  Flame,
  Heart,
  Lock,
  Medal,
  Popcorn,
  Star,
  Trophy,
  Tv,
} from 'lucide-react';
import { badgeCategoryFilters } from '../utils/achievements';

const badgeIconMap = {
  Award,
  Clapperboard,
  Crown,
  Flame,
  Heart,
  Medal,
  Popcorn,
  Star,
  Trophy,
  Tv,
};

const emptyBadges = [];

const AchievementBadges = ({ achievements }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const badges = achievements?.badges || emptyBadges;
  const filteredBadges = useMemo(() => (
    activeCategory === 'all'
      ? badges
      : badges.filter(badge => badge.category === activeCategory)
  ), [activeCategory, badges]);

  return (
    <section className="statistics-panel achievements-panel" aria-labelledby="achievements-title">
      <div className="statistics-panel-head achievements-head">
        <div>
          <h3 id="achievements-title">Başarılarım</h3>
          <p>İzleme alışkanlıklarına göre kazandığın rozetler.</p>
        </div>
        <span className="achievements-count">
          {achievements?.earnedCount || 0} / {achievements?.totalCount || 0} rozet kazanıldı
        </span>
      </div>

      <div className="achievement-filters" aria-label="Rozet kategorileri">
        {badgeCategoryFilters.map(filter => (
          <button
            key={filter.id}
            className={activeCategory === filter.id ? 'active' : ''}
            type="button"
            aria-pressed={activeCategory === filter.id}
            onClick={() => setActiveCategory(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="achievement-badge-grid">
        {filteredBadges.map((badge) => {
          const Icon = badgeIconMap[badge.icon] || Award;
          const statusLabel = badge.earned ? 'Kazanıldı' : 'Kilitli';

          return (
            <article
              key={badge.id}
              className={badge.earned ? 'achievement-card earned' : 'achievement-card locked'}
            >
              <div className="achievement-card-top">
                <span className="achievement-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.1} />
                </span>
                <span className="achievement-status">
                  {badge.earned ? <CheckCircle2 size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
                  {statusLabel}
                </span>
              </div>

              <div className="achievement-copy">
                <h4>{badge.title}</h4>
                <p>{badge.description}</p>
              </div>

              <div className="achievement-progress" aria-label={`${badge.title} ilerlemesi`}>
                <div className="achievement-progress-line">
                  <span>{badge.displayValue} / {badge.requirement} {badge.unit}</span>
                  <strong>{badge.progressPercent}%</strong>
                </div>
                <span className="achievement-progress-track">
                  <span style={{ width: `${badge.progressPercent}%` }} />
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AchievementBadges;
