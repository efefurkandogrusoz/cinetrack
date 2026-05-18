import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DiscoveryRows from '../components/DiscoveryRows';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import RecentMovieRows from '../components/RecentMovieRows';
import UserInsights from '../components/UserInsights';
import '../styles/pages/pages.css';

const Home = () => {
  const location = useLocation();

  const scrollToSection = (selector) => {
    document.querySelector(selector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

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
          <section className="page-header hero-header" aria-labelledby="home-hero-title">
            <div className="hero-copy">
              <p className="eyebrow">CineTrack</p>
              <h2 id="home-hero-title">Bugün ne izleyeceğini saniyeler içinde bul.</h2>
              <p>Canlı arama, haftalık seçkiler ve kişisel listelerin tek sinematik panelde birleşiyor.</p>

              <div className="hero-actions">
                <button className="hero-action primary" type="button" onClick={() => scrollToSection('.discovery-section')}>
                  Trendleri Keşfet
                </button>
                <button className="hero-action ghost" type="button" onClick={() => scrollToSection('#my-list')}>
                  Listeme Git
                </button>
              </div>
            </div>

            <div className="hero-poster-rail" aria-hidden="true">
              <span className="hero-frame frame-one" />
              <span className="hero-frame frame-two" />
              <span className="hero-frame frame-three" />
            </div>
          </section>
          <DiscoveryRows />
          <RecentMovieRows />
          <UserInsights />
          <MovieList listId="my-list" />
        </div>
      </div>
    </div>
  );
};

export default Home;
