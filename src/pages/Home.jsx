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
            <h2>Film kesfi artik daha hizli.</h2>
            <p>Navbar'daki buyutecle ara, begendiklerine gore oneriler al ve listeni tek panelden yonet.</p>
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
