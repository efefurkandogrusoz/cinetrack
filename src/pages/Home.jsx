import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ContinueWatching from '../components/ContinueWatching';
import DiscoveryRows from '../components/DiscoveryRows';
import FeaturedMovies from '../components/FeaturedMovies';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import RecentMovieRows from '../components/RecentMovieRows';
import UserInsights from '../components/UserInsights';
import { useMovies } from '../context/MovieContext';
import { getWatchStatus } from '../utils/media';
import '../styles/pages/pages.css';
import '../styles/pages/Home.css';

const HERO_BACKDROP =
  'https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg';

const Home = () => {
  const location = useLocation();
  const { movies } = useMovies();

  const scrollToSection = (selector) => {
    document.querySelector(selector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
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

  return (
    <div className="page-container home-page">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid home-layout">
          <section
            className="page-header hero-header home-hero cinematic-hero"
            aria-labelledby="home-hero-title"
          >
            <div className="hero-backdrop" aria-hidden="true">
              <div
                className="hero-backdrop-image"
                style={{ backgroundImage: `url(${HERO_BACKDROP})` }}
              />
              <div className="hero-backdrop-overlay" />
            </div>

            <div className="hero-inner">
              <div className="hero-copy">
                <p className="eyebrow hero-brand">CineTrack</p>
                <h2 id="home-hero-title">Film ve Dizilerini Takip Et</h2>
                <p className="hero-lead">
                  Favorilerini kaydet, izlediklerini işaretle, puan ver ve yeni içerikler keşfet.
                </p>

                <div className="hero-actions">
                  <button
                    className="hero-action primary"
                    type="button"
                    onClick={() => scrollToSection('.discovery-section')}
                  >
                    Keşfet
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
                  style={{ backgroundImage: `url(${HERO_BACKDROP})` }}
                />
              </div>
            </div>
          </section>

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
