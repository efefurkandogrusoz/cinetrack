import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MovieProvider, useMovies } from './context/MovieContext';
import AuthScreen from './components/AuthScreen';
import Home from './pages/Home';
import Watched from './pages/Watched';
import Watchlist from './pages/Watchlist';
import Favorites from './pages/Favorites';
import './styles/global.css';

const AppRoutes = () => {
  const { authReady, user } = useMovies();

  if (!authReady) {
    return (
      <main className="app-loading">
        <span className="brand-mark">CT</span>
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
        <Route path="/watched" element={<Watched />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/favorites" element={<Favorites />} />
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
