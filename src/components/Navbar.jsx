import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/firebase';
import { useMovies } from '../context/MovieContext';
import MovieSearch from './MovieSearch';
import '../styles/components/Navbar.css';

const Navbar = () => {
  const { filter, setFilter, movies, user, userProfile } = useMovies();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const watchedCount = movies.filter(movie => movie.watched).length;
  const watchlistCount = movies.filter(movie => !movie.watched).length;
  const favoriteCount = movies.filter(movie => movie.favorite).length;
  const totalCount = movies.length;

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
      case 'favorites':
        navigate('/favorites');
        break;
      default:
        navigate('/');
    }
  };

  const openSearch = () => {
    navigate('/');
    setSearchOpen(true);
  };

  const signOut = async () => {
    await logoutUser();
    setDrawerOpen(false);
  };

  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || 'Kullanici';

  return (
    <>
      <nav className="navbar-container">
        <button className="navbar-brand" type="button" onClick={() => handleFilterChange('all')}>
          <span className="brand-mark">CT</span>
          <span className="brand-text">
            <span className="brand-title">CineTrack</span>
            <span className="brand-subtitle">Kirmizi sinema paneli</span>
          </span>
        </button>

        <div className="navbar-center">
          <span>Film kesfet</span>
          <strong>{totalCount}</strong>
        </div>

        <div className="navbar-actions">
          <button
            className={searchOpen ? 'nav-icon-btn search active' : 'nav-icon-btn search'}
            type="button"
            aria-label="Arama ac"
            onClick={openSearch}
          >
            <span className="search-symbol" />
          </button>
          <button
            className={drawerOpen ? 'nav-icon-btn menu active' : 'nav-icon-btn menu'}
            type="button"
            aria-label="Menu ac"
            onClick={() => setDrawerOpen(current => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {searchOpen && (
        <div className="nav-search-layer">
          <button className="nav-search-backdrop" type="button" aria-label="Aramayi kapat" onClick={() => setSearchOpen(false)} />
          <div className="nav-search-panel">
            <div className="nav-search-head">
              <div>
                <p className="eyebrow">Arama</p>
                <h3>Yeni bir film bul</h3>
              </div>
              <button type="button" onClick={() => setSearchOpen(false)}>Kapat</button>
            </div>
            <MovieSearch autoFocus onAdd={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      <aside className={drawerOpen ? 'side-drawer open' : 'side-drawer'} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="drawer-user">
            <span className="account-avatar">{accountLabel.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{accountLabel}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Menu kapat">X</button>
        </div>

        <div className="drawer-metrics">
          <span><strong>{totalCount}</strong> Tumu</span>
          <span><strong>{watchedCount}</strong> Izlendi</span>
          <span><strong>{watchlistCount}</strong> Izlenecek</span>
          <span><strong>{favoriteCount}</strong> Favori</span>
        </div>

        <div className="drawer-links">
          <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => handleFilterChange('all')}>
            Tumu
          </button>
          <button className={filter === 'watched' ? 'active' : ''} type="button" onClick={() => handleFilterChange('watched')}>
            Izlendi
          </button>
          <button className={filter === 'watchlist' ? 'active' : ''} type="button" onClick={() => handleFilterChange('watchlist')}>
            Izlenecek
          </button>
          <button className={filter === 'favorites' ? 'active' : ''} type="button" onClick={() => handleFilterChange('favorites')}>
            Favoriler
          </button>
        </div>

        <button className="drawer-logout" type="button" onClick={signOut}>
          Cikis yap
        </button>
      </aside>

      {drawerOpen && <button className="drawer-backdrop" type="button" aria-label="Menuyu kapat" onClick={() => setDrawerOpen(false)} />}
    </>
  );
};

export default Navbar;
