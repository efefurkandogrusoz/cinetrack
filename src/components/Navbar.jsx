import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/firebase';
import { useMovies } from '../context/MovieContext';
import MovieSearch from './MovieSearch';
import '../styles/components/Navbar.css';

const Navbar = () => {
  const { filter, setFilter, movies, user, userProfile } = useMovies();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const stats = useMemo(() => ({
    watched: movies.filter(movie => movie.watched).length,
    watchlist: movies.filter(movie => !movie.watched).length,
    favorites: movies.filter(movie => movie.favorite).length,
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

  const signOut = async () => {
    await logoutUser();
    closeDrawer();
  };

  const toggleDrawer = () => {
    setDrawerOpen(current => !current);
  };

  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || 'Kullanıcı';
  const accountInitial = accountLabel.trim().slice(0, 1).toUpperCase() || 'K';
  const accountPhoto = userProfile?.photoURL || userProfile?.avatarUrl || user?.photoURL || null;
  const isAccountSettings = location.pathname === '/account-settings';
  const isSettings = location.pathname === '/settings';
  const hideQuickNav = isAccountSettings || isSettings;

  return (
    <>
      <nav className={hideQuickNav ? 'navbar-container navbar-compact' : 'navbar-container'}>
        <button className="navbar-brand" type="button" onClick={() => handleFilterChange('all')}>
          <span className="brand-mark">CT</span>
          <span className="brand-text">
            <span className="brand-title">CineTrack</span>
            <span className="brand-subtitle">Premium film paneli</span>
          </span>
        </button>

        {!hideQuickNav && (
          <div className="navbar-search-center">
            <MovieSearch compact />
          </div>
        )}

        <div className="navbar-actions">
          {!hideQuickNav && (
            <button className="nav-list-btn" type="button" onClick={goToMyList}>
              Listem
            </button>
          )}
          <button
            className={drawerOpen ? 'nav-icon-btn profile-menu active' : 'nav-icon-btn profile-menu'}
            type="button"
            aria-label="Profil menüsünü aç"
            onClick={toggleDrawer}
          >
            <span className={accountPhoto ? 'profile-menu-avatar has-image' : 'profile-menu-avatar'}>
              {accountPhoto ? <img src={accountPhoto} alt="" /> : accountInitial}
            </span>
          </button>
        </div>
      </nav>

      <aside className={drawerOpen ? 'side-drawer open' : 'side-drawer'} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="drawer-user">
            <span className={accountPhoto ? 'account-avatar has-image' : 'account-avatar'}>
              {accountPhoto ? <img src={accountPhoto} alt="" /> : accountInitial}
            </span>
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
          {!hideQuickNav && (
            <button type="button" onClick={goToMyList}>
              Listem
            </button>
          )}
          <button className={filter === 'all' && !isAccountSettings && !isSettings ? 'active' : ''} type="button" onClick={() => handleFilterChange('all')}>
            Tümü
          </button>
          <button className={filter === 'watched' && !isAccountSettings && !isSettings ? 'active' : ''} type="button" onClick={() => handleFilterChange('watched')}>
            İzlenen Filmler
          </button>
          <button className={filter === 'watchlist' && !isAccountSettings && !isSettings ? 'active' : ''} type="button" onClick={() => handleFilterChange('watchlist')}>
            İzlenecek Filmler
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
