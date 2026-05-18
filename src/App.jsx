import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MovieProvider, useMovies } from './context/MovieContext';
import AuthScreen from './components/AuthScreen';
import Home from './pages/Home';
import Movies from './pages/Movies';
import Watched from './pages/Watched';
import Watchlist from './pages/Watchlist';
import Favorites from './pages/Favorites';
import AccountSettings from './pages/AccountSettings';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import './styles/global.css';

const AppRoutes = () => {
  const { authReady, user } = useMovies();
  const logoUrl = `${import.meta.env.BASE_URL}cinetrack-logo.png`;

  if (!authReady) {
    return (
      <main className="app-loading">
        <img className="app-loading-logo" src={logoUrl} alt="CineTrack" />
        <p>Yükleniyor...</p>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/watched" element={<Watched />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/istatistikler" element={<Statistics />} />
        <Route path="/account-settings" element={<AccountSettings />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <MovieProvider>
      <AppRoutes />
    </MovieProvider>
  );
}

export default App;
