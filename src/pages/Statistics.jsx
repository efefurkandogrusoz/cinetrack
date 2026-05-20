import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MovieDetailsModal from '../components/MovieDetailsModal';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import { calculateMovieStatistics, formatMovieRating } from '../utils/movieStatistics';
import '../styles/pages/Statistics.css';

const chartColors = ['var(--primary-color)', '#ffffff', '#9b9b9b', '#ffbf47', '#2dcf86', '#8ca3ff'];

const StatCard = ({ label, value, hint }) => (
  <article className="statistics-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {hint && <p>{hint}</p>}
  </article>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const name = label || item.name;

  return (
    <div className="statistics-tooltip">
      <strong>{name}</strong>
      <span>{item.value} kayıt</span>
    </div>
  );
};

const MeasuredChart = ({ children }) => {
  const chartRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    const updateSize = () => {
      const bounds = node.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(bounds.width)),
        height: Math.max(0, Math.floor(bounds.height)),
      });
    };

    updateSize();

    if (!window.ResizeObserver) {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="statistics-chart-shell" ref={chartRef}>
      {size.width > 0 && size.height > 0 ? children(size) : <div className="statistics-chart-placeholder" />}
    </div>
  );
};

const Statistics = () => {
  const { error, loading, movies } = useMovies();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const stats = useMemo(() => calculateMovieStatistics(movies), [movies]);
  const isInitialLoading = loading && movies.length === 0;
  const hasMovies = movies.length > 0;
  const favoriteMovie = stats.highestRatedFavorite;

  return (
    <div className="page-container statistics-page">
      <Navbar />
      <div className="page-content">
        <main className="container-fluid statistics-shell">
          <section className="page-header statistics-header">
            <p className="eyebrow">CineTrack</p>
            <h2>İstatistikler</h2>
            <p>Film alışkanlıklarını ve listelerini buradan takip edebilirsin.</p>
          </section>

          {error && (
            <div className="statistics-alert" role="alert">
              Veriler senkronize edilirken bir sorun oluştu. Yerel kayıtlar üzerinden istatistik gösteriliyor.
            </div>
          )}

          {isInitialLoading ? (
            <div className="statistics-loading" role="status">
              <div className="spinner-border text-primary" aria-hidden="true" />
              <p>İstatistikler yükleniyor...</p>
            </div>
          ) : !hasMovies ? (
            <section className="statistics-empty-state">
              <div className="empty-icon">CT</div>
              <h3>Henüz istatistik oluşturmak için yeterli kayıt yok.</h3>
              <p>Film ekledikçe istatistiklerin burada görünecek.</p>
            </section>
          ) : (
            <>
              <section className="statistics-grid" aria-label="Film istatistikleri">
                <StatCard label="Toplam kayıt" value={stats.totalCount} hint="Listendeki tüm film ve diziler" />
                <StatCard label="İzlenen" value={stats.watchedCount} hint="İzlendi olarak işaretlenenler" />
                <StatCard label="İzlenecek" value={stats.watchlistCount} hint="Henüz izlenmeyi bekleyenler" />
                <StatCard label="Favori" value={stats.favoriteCount} hint="Favorilerine eklediklerin" />
                <StatCard label="Favori oranı" value={`${stats.favoriteRate.toFixed(0)}%`} hint="Favori / toplam kayıt" />
                <StatCard
                  label="Ortalama TMDB"
                  value={stats.ratingCount > 0 ? stats.averageTmdbRating.toFixed(1) : 'Henüz veri yok'}
                  hint={stats.ratingCount > 0 ? `${stats.ratingCount} puanlı kayıt üzerinden` : 'Puan verisi bulunamadı'}
                />
                <StatCard label="En çok izlenen tür" value={stats.topWatchedGenre} hint="İzlenen kayıtlar içinde" />
                <StatCard
                  label="En yüksek favori"
                  value={favoriteMovie ? favoriteMovie.title : 'Henüz yok'}
                  hint={favoriteMovie ? `TMDB ${formatMovieRating(favoriteMovie)}` : 'Favori film eklenmedi'}
                />
                <StatCard label="Devam edilen dizi" value={stats.watchingTvCount} hint="Devam ediyorum durumundaki diziler" />
                <StatCard label="Tamamlanan dizi" value={stats.completedTvCount} hint="Tamamladım olarak işaretlenenler" />
                <StatCard label="Bırakılan dizi" value={stats.droppedTvCount} hint="Bıraktım durumundaki diziler" />
                <StatCard label="Ortalama dizi ilerleme" value={`${stats.averageTvProgress.toFixed(0)}%`} hint="Dizi ilerleme yüzdesi ortalaması" />
                <StatCard label="İzlenen bölüm" value={stats.totalWatchedEpisodes} hint="Dizilerde toplam izlenen bölüm" />
              </section>

              <section className="statistics-charts" aria-label="Film grafikleri">
                <article className="statistics-panel">
                  <div className="statistics-panel-head">
                    <div>
                      <h3>Tür Dağılımı</h3>
                      <p>Listendeki film ve dizilerin türlere göre dağılımı.</p>
                    </div>
                  </div>

                  {stats.genreDistribution.length > 0 ? (
                    <MeasuredChart>
                      {({ width, height }) => (
                        <PieChart width={width} height={height}>
                          <Pie
                            data={stats.genreDistribution.slice(0, 8)}
                            dataKey="count"
                            nameKey="name"
                            innerRadius="52%"
                            outerRadius="82%"
                            paddingAngle={3}
                            isAnimationActive={false}
                          >
                            {stats.genreDistribution.slice(0, 8).map((entry, index) => (
                              <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      )}
                    </MeasuredChart>
                  ) : (
                    <p className="statistics-muted">Tür verisi bulunamadı.</p>
                  )}

                  {stats.genreDistribution.length > 0 && (
                    <div className="statistics-legend">
                      {stats.genreDistribution.slice(0, 6).map((genre, index) => (
                        <span key={genre.name}>
                          <i style={{ background: chartColors[index % chartColors.length] }} />
                          {genre.name} ({genre.count})
                        </span>
                      ))}
                    </div>
                  )}
                </article>

                <article className="statistics-panel">
                  <div className="statistics-panel-head">
                    <div>
                      <h3>Liste Durumu</h3>
                      <p>İzlenen, izlenecek ve favori kayıt sayıların.</p>
                    </div>
                  </div>

                  <MeasuredChart>
                    {({ width, height }) => (
                      <BarChart width={width} height={height} data={stats.statusDistribution} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#d8d8d8', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#a8a8a8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" radius={[7, 7, 0, 0]} isAnimationActive={false}>
                          {stats.statusDistribution.map((entry, index) => (
                            <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </MeasuredChart>
                </article>
              </section>

              <section className="statistics-bottom">
                <article className="statistics-panel favorite-highlight">
                  <div className="statistics-panel-head">
                    <div>
                      <h3>En Yüksek Puanlı Favori Kayıt</h3>
                      <p>Favorilerin arasında TMDB puanı en yüksek olan film veya dizi.</p>
                    </div>
                  </div>

                  {favoriteMovie ? (
                    <button className="favorite-highlight-card" type="button" onClick={() => setSelectedMovie(favoriteMovie)}>
                      <span className="favorite-highlight-poster">
                        {favoriteMovie.poster ? (
                          <img src={favoriteMovie.poster} alt={favoriteMovie.title} />
                        ) : (
                          <span>Poster Yok</span>
                        )}
                      </span>
                      <span className="favorite-highlight-copy">
                        <strong>{favoriteMovie.title}</strong>
                        <span>{favoriteMovie.year || 'Yıl yok'}</span>
                        <em>TMDB {formatMovieRating(favoriteMovie)}</em>
                      </span>
                    </button>
                  ) : (
                    <p className="statistics-muted">Henüz favori film veya dizi yok. Favori ekledikçe burada en yüksek puanlı kayıt görünecek.</p>
                  )}
                </article>

                <article className="statistics-panel taste-summary">
                  <div className="statistics-panel-head">
                    <div>
                      <h3>Zevk Analizi Özeti</h3>
                      <p>İzlenen ve favori kayıtlarına göre öne çıkan türler.</p>
                    </div>
                  </div>

                  {stats.tasteGenres.length > 0 ? (
                    <div className="taste-summary-tags">
                      {stats.tasteGenres.map(genre => <span key={genre}>{genre}</span>)}
                    </div>
                  ) : (
                    <p className="statistics-muted">Film ve dizi zevkine göre tür özeti için izlenen veya favori kayıtlar ekle.</p>
                  )}
                </article>
              </section>
            </>
          )}
        </main>
      </div>

      {selectedMovie && <MovieDetailsModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
};

export default Statistics;
