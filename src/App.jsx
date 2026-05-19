import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MovieProvider, useMovies } from './context/MovieContext';
import './styles/global.css';

const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Home = lazy(() => import('./pages/Home'));
const Movies = lazy(() => import('./pages/Movies'));
const Watched = lazy(() => import('./pages/Watched'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Favorites = lazy(() => import('./pages/Favorites'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Settings = lazy(() => import('./pages/Settings'));
const Statistics = lazy(() => import('./pages/Statistics'));

const AppFallback = () => {
  const logoUrl = `${import.meta.env.BASE_URL}cinetrack-logo.png`;

  return (
    <main className="app-loading">
      <img className="app-loading-logo" src={logoUrl} alt="CineTrack" />
      <p>Yükleniyor...</p>
    </main>
  );
};

const AppRoutes = () => {
  const { authReady, user } = useMovies();

  if (!authReady) {
    return <AppFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<AppFallback />}>
        <AuthScreen />
      </Suspense>
    );
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<AppFallback />}>
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
      </Suspense>
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
