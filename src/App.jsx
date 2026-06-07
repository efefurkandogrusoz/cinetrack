import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MovieProvider, useMovies } from './context/MovieContext';
import { NotificationProvider } from './context/NotificationContext';
import ToastContainer from './components/ToastContainer';
import './styles/global.css';

const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Home = lazy(() => import('./pages/Home'));
const Movies = lazy(() => import('./pages/Movies'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const MyList = lazy(() => import('./pages/MyList'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Settings = lazy(() => import('./pages/Settings'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Notifications = lazy(() => import('./pages/Notifications'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ActorDetails = lazy(() => import('./pages/ActorDetails'));
const AdminRoute = lazy(() => import('./components/routes/AdminRoute'));

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
      <Router basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<AppFallback />}>
          <Routes>
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/actor/:actorId" element={<ActorDetails />} />
            <Route path="/oyuncu/:actorId" element={<ActorDetails />} />
            <Route path="*" element={<AuthScreen />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/listem" element={<MyList />} />
          <Route path="/library/all" element={<LibraryPage view="all" />} />
          <Route path="/library/watched" element={<LibraryPage view="watched" />} />
          <Route path="/library/watchlist" element={<LibraryPage view="watchlist" />} />
          <Route path="/library/favorites" element={<LibraryPage view="favorites" />} />
          <Route path="/watched" element={<LibraryPage view="watched" />} />
          <Route path="/watchlist" element={<LibraryPage view="watchlist" />} />
          <Route path="/favorites" element={<LibraryPage view="favorites" />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/istatistikler" element={<Statistics />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/actor/:actorId" element={<ActorDetails />} />
          <Route path="/oyuncu/:actorId" element={<ActorDetails />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/admin"
            element={(
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            )}
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

function App() {
  return (
    <MovieProvider>
      <NotificationProvider>
        <AppRoutes />
        <ToastContainer />
      </NotificationProvider>
    </MovieProvider>
  );
}

export default App;
