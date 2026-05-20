import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/firebase';
import { useMovies } from '../context/MovieContext';
import { getWatchStatus } from '../utils/media';
import MovieSearch from './MovieSearch';
import UserAvatar from './UserAvatar';
import '../styles/components/Navbar.css';

const Navbar = () => {
  const { filter, setFilter, movies, user, userProfile } = useMovies();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const stats = useMemo(() => ({
    watched: movies.filter(movie => movie.watched || getWatchStatus(movie) === 'completed' || getWatchStatus(movie) === 'watched').length,
    watchlist: movies.filter(movie => getWatchStatus(movie) === 'watchlist').length,
    favorites: movies.filter(movie => movie.favorite || movie.isFavorite).length,
    total: movies.length,
  }), [movies]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setDrawerOpen(false);

    switch (newFilter) {
      case 'watched':
        navigate('/watched');
        break;
      case 'watchlist':
        navigate('/watchlist');
        break;
      default:
        navigate('/');
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const goToAccountSettings = () => {
    closeDrawer();
    navigate('/account-settings');
  };

  const goToSettings = () => {
    closeDrawer();
    navigate('/settings');
  };

  const goToMovies = () => {
    setFilter('all');
    closeDrawer();
    navigate('/movies');
  };

  const goToStatistics = () => {
    setFilter('all');
    closeDrawer();
    navigate('/statistics');
  };

  const scrollToMyList = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('my-list')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const goToMyList = () => {
    setFilter('all');
    closeDrawer();

    if (location.pathname === '/') {
      scrollToMyList();
      return;
    }

    navigate('/', { state: { scrollToMyList: true } });
  };

  const goToHomeTop = () => {
    setFilter('all');
    closeDrawer();

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate('/', { state: { scrollToTop: true } });
  };

  const signOut = async () => {
    await logoutUser();
    closeDrawer();
  };

  const toggleDrawer = () => {
    setDrawerOpen(current => !current);
  };

  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || 'Kullanıcı';
  const isAccountSettings = location.pathname === '/account-settings';
  const isSettings = location.pathname === '/settings';
  const isWatched = location.pathname === '/watched';
  const isWatchlist = location.pathname === '/watchlist';
  const isMovies = location.pathname === '/movies';
  const isStatistics = location.pathname === '/statistics' || location.pathname === '/istatistikler';
  const hideQuickNav = isAccountSettings || isSettings || isWatched || isWatchlist || isStatistics;
  const hideNavbarSearch = hideQuickNav || isMovies;
  const logoMarkUrl = `${import.meta.env.BASE_URL}cinetrack-logo-mark.png`;

  return (
    <>
      <nav className={hideNavbarSearch ? 'navbar-container navbar-compact' : 'navbar-container'}>
        <button className="navbar-brand" type="button" onClick={goToHomeTop}>
          <img className="brand-logo-mark" src={logoMarkUrl} alt="" aria-hidden="true" />
          <span className="brand-text">
            <span className="brand-title">CineTrack</span>
            <span className="brand-subtitle">Premium film & dizi paneli</span>
          </span>
        </button>

        {!hideNavbarSearch && (
          <div className="navbar-search-center">
            <MovieSearch compact />
          </div>
        )}

        <div className="navbar-actions">
          <button
            className={isMovies ? 'nav-page-btn active' : 'nav-page-btn'}
            type="button"
            onClick={goToMovies}
          >
            Film & Dizi
          </button>
          <button
            className={isStatistics ? 'nav-page-btn active' : 'nav-page-btn'}
            type="button"
            onClick={goToStatistics}
          >
            İstatistikler
          </button>
          <button
            className={drawerOpen ? 'nav-icon-btn profile-menu active' : 'nav-icon-btn profile-menu'}
            type="button"
            aria-label="Profil menüsünü aç"
            onClick={toggleDrawer}
          >
            <UserAvatar
              profile={userProfile}
              className="profile-menu-avatar"
              decorative
            />
          </button>
        </div>
      </nav>

      <aside className={drawerOpen ? 'side-drawer open' : 'side-drawer'} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="drawer-user">
            <UserAvatar
              profile={userProfile}
              className="account-avatar"
              decorative
            />
            <div>
              <strong>{accountLabel}</strong>
              <small>{user?.email}</small>
              {userProfile?.profileNote && <em>{userProfile.profileNote}</em>}
            </div>
          </div>
          <button className="drawer-close" type="button" onClick={closeDrawer} aria-label="Menü kapat">
            X
          </button>
        </div>

        <div className="drawer-metrics">
          <span><strong>{stats.total}</strong> Tümü</span>
          <span><strong>{stats.watched}</strong> İzlenen</span>
          <span><strong>{stats.watchlist}</strong> İzlenecek</span>
          <span><strong>{stats.favorites}</strong> Favori</span>
        </div>

        <div className="drawer-links">
          <button className={isMovies ? 'active' : ''} type="button" onClick={goToMovies}>
            Film & Dizi
          </button>
          <button className={isStatistics ? 'active' : ''} type="button" onClick={goToStatistics}>
            İstatistikler
          </button>
          {!hideQuickNav && (
            <button type="button" onClick={goToMyList}>
              Listem
            </button>
          )}
          <button className={filter === 'all' && !isAccountSettings && !isSettings && !isMovies && !isStatistics ? 'active' : ''} type="button" onClick={() => handleFilterChange('all')}>
            Tümü
          </button>
          <button className={filter === 'watched' && !isAccountSettings && !isSettings && !isStatistics ? 'active' : ''} type="button" onClick={() => handleFilterChange('watched')}>
            İzlenenler
          </button>
          <button className={filter === 'watchlist' && !isAccountSettings && !isSettings && !isStatistics ? 'active' : ''} type="button" onClick={() => handleFilterChange('watchlist')}>
            İzlenecekler
          </button>
          <button className={isAccountSettings ? 'active' : ''} type="button" onClick={goToAccountSettings}>
            Hesap Ayarları
          </button>
          <button className={isSettings ? 'active' : ''} type="button" onClick={goToSettings}>
            Ayarlar
          </button>
        </div>

        <button className="drawer-logout" type="button" onClick={signOut}>
          Çıkış Yap
        </button>
      </aside>

      {drawerOpen && <button className="drawer-backdrop" type="button" aria-label="Menüyü kapat" onClick={closeDrawer} />}
    </>
  );
};

export default Navbar;
