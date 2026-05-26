import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ContinueWatching from '../components/ContinueWatching';
import DiscoveryRows from '../components/DiscoveryRows';
import FeaturedMovies from '../components/FeaturedMovies';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import RecentMovieRows from '../components/RecentMovieRows';
import UserInsights from '../components/UserInsights';
import { useMovies } from '../context/MovieContext';
import { subscribeHeroBanners } from '../services/adminService';
import { isWithinDateRange } from '../utils/adminContent';
import { getWatchStatus } from '../utils/media';
import '../styles/pages/pages.css';
import '../styles/pages/Home.css';

const HERO_BACKDROP =
  'https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg';
const HERO_BANNER_CACHE_KEY = 'cinetrack-active-hero-banner';

const readCachedHeroBanner = () => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = JSON.parse(window.localStorage.getItem(HERO_BANNER_CACHE_KEY) || 'null');
    return cached && cached.isActive !== false && isWithinDateRange(cached) ? cached : null;
  } catch {
    return null;
  }
};

const writeCachedHeroBanner = (banner) => {
  if (typeof window === 'undefined') return;

  if (!banner) {
    window.localStorage.removeItem(HERO_BANNER_CACHE_KEY);
    return;
  }

  const cachedBanner = {
    title: banner.title || '',
    description: banner.description || '',
    imageUrl: banner.imageUrl || '',
    posterUrl: banner.posterUrl || banner.posterImageUrl || '',
    buttonText: banner.buttonText || '',
    buttonLink: banner.buttonLink || '',
    featuredContentId: banner.featuredContentId || '',
    featuredContentType: banner.featuredContentType || 'movie',
    featuredContentTitle: banner.featuredContentTitle || '',
    featuredContentYear: banner.featuredContentYear || '',
    isActive: banner.isActive !== false,
    startDate: banner.startDate || null,
    endDate: banner.endDate || null,
  };

  window.localStorage.setItem(HERO_BANNER_CACHE_KEY, JSON.stringify(cachedBanner));
};

const getPrimaryHeroLink = (banner, buttonText) => {
  const link = banner?.buttonLink || '#discover';
  const normalizedText = String(buttonText || '').trim().toLocaleLowerCase('tr-TR');

  if (normalizedText === 'keşfet' && link === '#my-list') {
    return '#discover';
  }

  return link;
};

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { movies } = useMovies();
  const [heroBanners, setHeroBanners] = useState([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [cachedHeroBanner, setCachedHeroBanner] = useState(readCachedHeroBanner);
  const activeHeroBanner = useMemo(
    () => heroBanners.find(banner => banner.isActive !== false && isWithinDateRange(banner)) || cachedHeroBanner,
    [cachedHeroBanner, heroBanners],
  );
  const heroReady = Boolean(activeHeroBanner) || !heroLoading;
  const heroTitle = activeHeroBanner?.title || 'Film ve Dizilerini Takip Et';
  const heroDescription = activeHeroBanner?.description || 'Favorilerini kaydet, izlediklerini işaretle, puan ver ve yeni içerikler keşfet.';
  const heroBackdrop = activeHeroBanner?.imageUrl || activeHeroBanner?.posterUrl || HERO_BACKDROP;
  const heroPoster = activeHeroBanner?.posterUrl || activeHeroBanner?.imageUrl || HERO_BACKDROP;
  const primaryButtonText = activeHeroBanner?.buttonText || 'Keşfet';
  const primaryButtonLink = getPrimaryHeroLink(activeHeroBanner, primaryButtonText);

  const scrollToSection = (selector) => {
    document.querySelector(selector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const runHeroAction = (link, fallbackSelector) => {
    if (!link) {
      scrollToSection(fallbackSelector);
      return;
    }

    if (link.startsWith('#')) {
      scrollToSection(link);
      return;
    }

    if (link.startsWith('/')) {
      navigate(link);
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const heroStats = useMemo(() => {
    const watched = movies.filter(
      movie => movie.watched
        || getWatchStatus(movie) === 'completed'
        || getWatchStatus(movie) === 'watched',
    ).length;

    return [
      { value: movies.length, label: 'içerik' },
      { value: watched, label: 'izlendi' },
      {
        value: movies.filter(movie => movie.favorite || movie.isFavorite).length,
        label: 'favori',
      },
      {
        value: movies.filter(movie => getWatchStatus(movie) === 'watchlist').length,
        label: 'izlenecek',
      },
    ];
  }, [movies]);

  useEffect(() => {
    if (location.state?.scrollToTop) {
      const frameId = window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (!location.state?.scrollToMyList && location.hash !== '#my-list') {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById('my-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash, location.key, location.state]);

  useEffect(() => {
    const unsubscribe = subscribeHeroBanners(
      (items) => {
        const liveActiveHero = items.find(banner => banner.isActive !== false && isWithinDateRange(banner)) || null;
        setHeroBanners(items);
        setCachedHeroBanner(liveActiveHero);
        setHeroLoading(false);
        writeCachedHeroBanner(liveActiveHero);
      },
      () => {
        setHeroBanners([]);
        setHeroLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="page-container home-page">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid home-layout">
          {heroReady ? (
            <section
            className="page-header hero-header home-hero cinematic-hero"
            aria-labelledby="home-hero-title"
          >
            <div className="hero-backdrop" aria-hidden="true">
              <div
                className="hero-backdrop-image"
                style={{ backgroundImage: `url(${heroBackdrop})` }}
              />
              <div className="hero-backdrop-overlay" />
            </div>

            <div className="hero-inner">
              <div className="hero-copy">
                <p className="eyebrow hero-brand">CineTrack</p>
                <h2 id="home-hero-title">{heroTitle}</h2>
                <p className="hero-lead">
                  {heroDescription}
                </p>

                <div className="hero-actions">
                  <button
                    className="hero-action primary"
                    type="button"
                    onClick={() => runHeroAction(primaryButtonLink, '.discovery-section')}
                  >
                    {primaryButtonText}
                  </button>
                  <button
                    className="hero-action secondary"
                    type="button"
                    onClick={() => scrollToSection('#my-list')}
                  >
                    Listeme Git
                  </button>
                </div>

                <ul className="hero-stats" aria-label="Liste özeti">
                  {heroStats.map(stat => (
                    <li key={stat.label}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="hero-visual" aria-hidden="true">
                <div
                  className="hero-visual-poster"
                  style={{ backgroundImage: `url(${heroPoster})` }}
                />
              </div>
            </div>
            </section>
          ) : (
            <section className="page-header hero-header home-hero cinematic-hero hero-loading" aria-label="Hero yükleniyor">
              <div className="hero-loading-content">
                <span />
                <strong />
                <p />
                <div />
              </div>
            </section>
          )}

          <FeaturedMovies />
          <DiscoveryRows />
          <ContinueWatching />
          <MovieList listId="my-list" />
          <RecentMovieRows />
          <UserInsights />
        </div>
      </div>
    </div>
  );
};

export default Home;
