import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BellPlus,
  CalendarClock,
  ChevronRight,
  Clapperboard,
  Eye,
  Film,
  Flag,
  ImagePlus,
  Megaphone,
  MessageSquare,
  RefreshCw,
  ShieldOff,
  Star,
  Tv,
  UserCheck,
  Users,
} from 'lucide-react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import SpoilerContent from '../../components/SpoilerContent';
import { loadAdminDashboard } from '../../services/adminService';
import { formatAdminDate } from '../../utils/admin';

const emptyDashboard = {
  totals: {
    users: 0,
    activeUsers: 0,
    passiveUsers: 0,
    comments: 0,
    movies: 0,
    tv: 0,
    favorites: 0,
    watched: 0,
    watchlist: 0,
    reports: 0,
    pendingReports: 0,
  },
  userRegistrationsSeries: [],
  commentSeries: [],
  contentDistribution: [],
  libraryStatusDistribution: [],
  topEngagedMedia: [],
  topCommentedMedia: [],
  topLikedComments: [],
  recentActivities: [],
};

const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

const getTimestampValue = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
};

const formatNumber = (value) => new Intl.NumberFormat('tr-TR').format(Number(value) || 0);

const formatCompact = (value) => new Intl.NumberFormat('tr-TR', {
  notation: Number(value) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: 1,
}).format(Number(value) || 0);

const formatRelativeTime = (value) => {
  const timestamp = getTimestampValue(value);
  if (!timestamp) return 'Tarih yok';

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'Az önce';
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} sa önce`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} gün önce`;

  return formatAdminDate(value);
};

const getPosterUrl = (poster) => {
  if (!poster) return '';
  if (String(poster).startsWith('http')) return poster;
  return `https://image.tmdb.org/t/p/w185${poster}`;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="admin-chart-tooltip">
      <strong>{label || payload[0].name}</strong>
      {payload.map(item => (
        <span key={item.name || item.dataKey}>
          {item.name || item.dataKey}: {formatNumber(item.value)}
        </span>
      ))}
    </div>
  );
};

const DonutCenterLabel = ({ viewBox = {}, total }) => {
  const { cx = 0, cy = 0 } = viewBox;

  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="admin-donut-center">
      <tspan x={cx} dy="-0.35em">Toplam</tspan>
      <tspan x={cx} dy="1.25em">{formatNumber(total)}</tspan>
    </text>
  );
};

const DashboardChartCard = ({ title, children, actionLabel = 'Son 7 gün' }) => (
  <section className="admin-dashboard-card admin-chart-card">
    <header>
      <h3>{title}</h3>
      {actionLabel && <span>{actionLabel}</span>}
    </header>
    <div className="admin-chart-wrap">
      {children}
    </div>
  </section>
);

const ActivityIcon = ({ type }) => {
  const iconMap = {
    user: Users,
    comment: MessageSquare,
    report: Flag,
    favorite: Star,
    watched: Eye,
  };
  const Icon = iconMap[type] || CalendarClock;
  return <Icon size={15} aria-hidden="true" />;
};

const AdminDashboard = ({ onNavigate }) => {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await loadAdminDashboard());
    } catch {
      setError('Dashboard verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    loadAdminDashboard()
      .then((nextDashboard) => {
        if (!cancelled) setDashboard(nextDashboard);
      })
      .catch(() => {
        if (!cancelled) setError('Dashboard verileri yüklenemedi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = dashboard.totals || emptyDashboard.totals;
  const statCards = useMemo(() => [
    { icon: Users, label: 'Toplam kullanıcı', value: totals.users, hint: 'Tüm kayıtlı kullanıcılar' },
    { icon: UserCheck, label: 'Aktif kullanıcı', value: totals.activeUsers, hint: 'Pasif olmayan kullanıcılar' },
    { icon: ShieldOff, label: 'Pasif kullanıcı', value: totals.passiveUsers, hint: 'Admin tarafından kapatılan' },
    { icon: MessageSquare, label: 'Toplam yorum', value: totals.comments, hint: 'Yayınlanan ve bekleyen yorumlar' },
    { icon: Film, label: 'Toplam film', value: totals.movies, hint: 'Kayıtlı film sayısı' },
    { icon: Tv, label: 'Toplam dizi', value: totals.tv, hint: 'Kayıtlı dizi sayısı' },
    { icon: Star, label: 'Toplam favori', value: totals.favorites, hint: 'Favoriye eklenen içerikler' },
    { icon: Flag, label: 'Şikayetler', value: totals.reports, hint: `${formatNumber(totals.pendingReports)} bekleyen şikayet` },
  ], [totals]);

  const quickActions = [
    { label: 'Kullanıcıları Yönet', tab: 'users', icon: Users, tone: 'users' },
    { label: 'Şikayetleri İncele', tab: 'reports', icon: Flag, tone: 'reports' },
    { label: 'Duyuru Oluştur', tab: 'announcements', icon: Megaphone, tone: 'announcements' },
    { label: 'Bildirim Gönder', tab: 'notifications', icon: BellPlus, tone: 'notifications' },
    { label: 'Hero Banner', tab: 'hero', icon: ImagePlus, tone: 'hero' },
    { label: 'Popüler Filmler', tab: 'featured', icon: Star, tone: 'featured' },
  ];

  const contentTotal = (totals.movies || 0) + (totals.tv || 0);

  return (
    <div className="admin-dashboard">
      <div className="admin-section-head admin-dashboard-head">
        <div>
          <p className="eyebrow">Genel Bakış</p>
          <h2>Dashboard</h2>
        </div>
        <button
          className={loading ? 'admin-refresh-btn loading' : 'admin-refresh-btn'}
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Yenile
        </button>
      </div>

      {error && <p className="admin-alert">{error}</p>}

      <div className="admin-stat-grid dashboard-stat-grid">
        {statCards.map(card => (
          <AdminStatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={loading ? '...' : formatNumber(card.value)}
            hint={card.hint}
          />
        ))}
      </div>

      <div className="admin-dashboard-chart-grid">
        <DashboardChartCard title="Son 7 Gün Kullanıcı Kayıtları">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.userRegistrationsSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a9b7cc', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7f8da3', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="value" name="Kayıt" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Son 7 Gün Yorum Grafiği">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.commentSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#a9b7cc', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7f8da3', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Yorum" fill="#3b82f6" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard title="Film / Dizi Dağılımı" actionLabel={null}>
          <div className="admin-donut-layout">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.contentDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  labelLine={false}
                >
                  {dashboard.contentDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                  <Label content={<DonutCenterLabel total={contentTotal} />} />
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="admin-chart-legend">
              {dashboard.contentDistribution.map((item, index) => (
                <span key={item.name}>
                  <i style={{ background: chartColors[index % chartColors.length] }} />
                  {item.name} <b>{formatNumber(item.value)}</b>
                </span>
              ))}
            </div>
          </div>
        </DashboardChartCard>

        <DashboardChartCard title="İzlenen / İzlenecek / Favori" actionLabel={null}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.libraryStatusDistribution}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#a9b7cc', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7f8da3', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Adet" radius={[7, 7, 0, 0]}>
                {dashboard.libraryStatusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>
      </div>

      <div className="admin-dashboard-bottom-grid">
        <section className="admin-dashboard-card admin-engagement-card">
          <header>
            <h3>En Çok Etkileşim Alan İçerikler</h3>
            <span>{dashboard.topEngagedMedia.length} içerik</span>
          </header>

          {dashboard.topEngagedMedia.length === 0 ? (
            <p className="admin-empty">Henüz etkileşim verisi yok.</p>
          ) : (
            <div className="admin-engagement-table">
              <div className="admin-engagement-head">
                <span>İçerik</span>
                <span>Tür</span>
                <span>Yorum</span>
                <span>Favori</span>
                <span>İzlenme</span>
                <span>Puan</span>
              </div>
              {dashboard.topEngagedMedia.map(item => (
                <article className="admin-engagement-row" key={item.key}>
                  <div className="admin-engagement-title">
                    <span className="admin-engagement-poster">
                      {getPosterUrl(item.poster) ? <img src={getPosterUrl(item.poster)} alt="" /> : <Clapperboard size={17} aria-hidden="true" />}
                    </span>
                    <strong>{item.mediaTitle}</strong>
                  </div>
                  <span>{item.mediaType === 'tv' ? 'Dizi' : 'Film'}</span>
                  <span className="admin-engagement-metric comments">
                    <MessageSquare size={14} aria-hidden="true" />
                    {formatNumber(item.commentCount)}
                  </span>
                  <span className="admin-engagement-metric favorites">
                    <Star size={14} aria-hidden="true" />
                    {formatNumber(item.favoriteCount)}
                  </span>
                  <span className="admin-engagement-metric watched">
                    <Eye size={14} aria-hidden="true" />
                    {formatCompact(item.watchedCount)}
                  </span>
                  <span className="admin-engagement-metric rating">
                    <Star size={14} aria-hidden="true" />
                    {item.averageRating ? item.averageRating.toFixed(1) : '-'}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="admin-dashboard-side-grid">
          <section className="admin-dashboard-card admin-liked-comments-card">
            <header>
              <h3>En Çok Beğenilen Yorumlar</h3>
              <span>{dashboard.topLikedComments.length} yorum</span>
            </header>

            {dashboard.topLikedComments.length === 0 ? (
              <p className="admin-empty">Henüz beğeni alan yorum yok.</p>
            ) : dashboard.topLikedComments.map(comment => (
              <article className="admin-liked-comment" key={`${comment.kind}:${comment.id}`}>
                <div className="admin-liked-comment-author">
                  <strong>{comment.username || 'Kullanıcı'}</strong>
                  <span>{comment.mediaTitle || 'İsimsiz içerik'}</span>
                </div>
                <div className="admin-liked-comment-text">
                  <SpoilerContent text={comment.text} isSpoiler={comment.isSpoiler === true} />
                </div>
                <small className="admin-liked-comment-meta">
                  <span>{formatNumber(comment.likes || 0)} beğeni</span>
                  <span>{formatAdminDate(comment.createdAt)}</span>
                </small>
              </article>
            ))}
          </section>

          <div className="admin-dashboard-side-row">
            <section className="admin-dashboard-card admin-activity-card">
              <header>
                <h3>Son Aktiviteler</h3>
                <span>Canlı özet</span>
              </header>

              {dashboard.recentActivities.length === 0 ? (
                <p className="admin-empty">Henüz aktivite yok.</p>
              ) : dashboard.recentActivities.map((activity, index) => (
                <article className="admin-activity-item" key={`${activity.type}:${index}:${getTimestampValue(activity.createdAt)}`}>
                  <span>
                    <ActivityIcon type={activity.type} />
                  </span>
                  <div>
                    <strong>{activity.text}</strong>
                    {activity.meta && <small>{activity.meta}</small>}
                  </div>
                  <time>{formatRelativeTime(activity.createdAt)}</time>
                </article>
              ))}
            </section>

            <section className="admin-dashboard-card admin-quick-actions-card">
              <header>
                <h3>Hızlı İşlemler</h3>
                <span>Yönetim</span>
              </header>
              <div className="admin-quick-actions">
                {quickActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      className={`admin-quick-action ${action.tone}`}
                      key={action.tab}
                      type="button"
                      onClick={() => onNavigate?.(action.tab)}
                    >
                      <span className="admin-quick-action-icon">
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <span>{action.label}</span>
                      <ChevronRight className="admin-quick-action-arrow" size={14} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
