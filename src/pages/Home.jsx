import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DiscoveryRows from '../components/DiscoveryRows';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import UserInsights from '../components/UserInsights';
import '../styles/pages/pages.css';

const Home = () => {
  const location = useLocation();

  useEffect(() => {
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
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid">
          <div className="page-header hero-header">
            <p className="eyebrow">CineTrack</p>
            <h2>Bugün ne izleyeceğini saniyeler içinde bul.</h2>
            <p>Canlı arama, haftalık seçkiler ve kişisel listelerin tek sinematik panelde birleşiyor.</p>
          </div>
          <DiscoveryRows />
          <UserInsights />
          <MovieList listId="my-list" />
        </div>
      </div>
    </div>
  );
};

export default Home;
