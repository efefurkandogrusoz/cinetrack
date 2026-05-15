import React from 'react';
import DiscoveryRows from '../components/DiscoveryRows';
import MovieList from '../components/MovieList';
import Navbar from '../components/Navbar';
import UserInsights from '../components/UserInsights';
import '../styles/pages/pages.css';

const Home = () => {
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
          <MovieList />
        </div>
      </div>
    </div>
  );
};

export default Home;
