import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/firebase';
import { useMovies } from '../context/MovieContext';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import { updateRememberedAccount } from '../utils/rememberedAccounts';
import MovieSearch from './MovieSearch';
import '../styles/components/Navbar.css';

const Navbar = () => {
  const { filter, setFilter, movies, user, userProfile } = useMovies();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const stats = useMemo(() => ({
    watched: movies.filter(movie => movie.watched).length,
    watchlist: movies.filter(movie => !movie.watched).length,
    favorites: movies.filter(movie => movie.favorite).length,
    total: movies.length,
  }), [movies]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSettingsOpen(false);
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

  useEffect(() => {
    if (!searchOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      const target = event.target;
      const clickedInsideModal = target.closest?.('.movie-modal-layer');

      if (!searchRef.current?.contains(target) && !clickedInsideModal) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [searchOpen]);

  const openSearch = () => {
    setSearchOpen(true);
  };

  const closeDrawer = () => {
    setSettingsOpen(false);
    setDrawerOpen(false);
  };

  const signOut = async () => {
    await logoutUser();
    closeDrawer();
  };

  const toggleDrawer = () => {
    if (drawerOpen) {
      closeDrawer();
      return;
    }

    setDrawerOpen(true);
  };

  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || 'Kullanıcı';

  return (
    <>
      <nav className={searchOpen ? 'navbar-container searching' : 'navbar-container'}>
        <button className="navbar-brand" type="button" onClick={() => handleFilterChange('all')}>
          <span className="brand-mark">CT</span>
          <span className="brand-text">
            <span className="brand-title">CineTrack</span>
            <span className="brand-subtitle">Premium film paneli</span>
          </span>
        </button>

        <div className="navbar-actions">
          <div
            ref={searchRef}
            className={searchOpen ? 'nav-search-shell open' : 'nav-search-shell'}
          >
            <button
              className={searchOpen ? 'nav-icon-btn search active' : 'nav-icon-btn search'}
              type="button"
              aria-label={searchOpen ? 'Aramayı kapat' : 'Arama aç'}
              onClick={openSearch}
            >
              <span className="search-symbol" />
            </button>
            <div className="nav-search-expand" aria-hidden={!searchOpen}>
              {searchOpen && <MovieSearch autoFocus compact onAdd={() => setSearchOpen(false)} />}
            </div>
          </div>

          <button
            className={drawerOpen ? 'nav-icon-btn menu active' : 'nav-icon-btn menu'}
            type="button"
            aria-label="Menü aç"
            onClick={toggleDrawer}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <aside className={drawerOpen ? 'side-drawer open' : 'side-drawer'} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="drawer-user">
            <span className="account-avatar">{accountLabel.slice(0, 1).toUpperCase()}</span>
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
          <button className={filter === 'all' && !settingsOpen ? 'active' : ''} type="button" onClick={() => handleFilterChange('all')}>
            Tümü
          </button>
          <button className={filter === 'watched' && !settingsOpen ? 'active' : ''} type="button" onClick={() => handleFilterChange('watched')}>
            İzlenen Filmler
          </button>
          <button className={filter === 'watchlist' && !settingsOpen ? 'active' : ''} type="button" onClick={() => handleFilterChange('watchlist')}>
            İzlenecek Filmler
          </button>
          <button className={settingsOpen ? 'active' : ''} type="button" onClick={() => setSettingsOpen(current => !current)}>
            Hesap Ayarları
          </button>
        </div>

        {settingsOpen && (
          <AccountSettingsPanel
            key={`${user?.uid}-${userProfile?.email || user?.email}-${userProfile?.displayName || user?.displayName}-${userProfile?.profileNote || ''}`}
            user={user}
            userProfile={userProfile}
          />
        )}

        <button className="drawer-logout" type="button" onClick={signOut}>
          Çıkış Yap
        </button>
      </aside>

      {drawerOpen && <button className="drawer-backdrop" type="button" aria-label="Menüyü kapat" onClick={closeDrawer} />}
    </>
  );
};

const AccountSettingsPanel = ({ user, userProfile }) => {
  const { updateAccountSettings } = useMovies();
  const [form, setForm] = useState({
    displayName: userProfile?.displayName || user?.displayName || '',
    email: userProfile?.email || user?.email || '',
    profileNote: userProfile?.profileNote || '',
    password: '',
    passwordConfirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password && form.password !== form.passwordConfirm) {
      setMessageType('error');
      setMessage('Şifreler eşleşmiyor.');
      return;
    }

    setSaving(true);
    try {
      const previousEmail = user?.email;
      const nextProfile = await updateAccountSettings({
        displayName: form.displayName,
        email: form.email,
        profileNote: form.profileNote,
        password: form.password,
      });

      updateRememberedAccount(previousEmail, nextProfile);
      setForm(current => ({ ...current, password: '', passwordConfirm: '' }));
      setMessageType('success');
      setMessage('Hesap bilgileri güncellendi.');
    } catch (error) {
      setMessageType('error');
      setMessage(getFirebaseMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="account-settings-panel" onSubmit={submit}>
      <div>
        <p className="eyebrow">Hesap Ayarları</p>
        <h3>Profilini düzenle</h3>
      </div>

      <label>
        Kullanıcı adı
        <input
          type="text"
          value={form.displayName}
          onChange={event => updateField('displayName', event.target.value)}
          placeholder="Kullanıcı adın"
        />
      </label>

      <label>
        E-posta
        <input
          type="email"
          value={form.email}
          onChange={event => updateField('email', event.target.value)}
          placeholder="ornek@mail.com"
        />
      </label>

      <label>
        Profil notu
        <input
          type="text"
          value={form.profileNote}
          onChange={event => updateField('profileNote', event.target.value)}
          maxLength={70}
          placeholder="Favori türün, ruh halin veya kısa not"
        />
      </label>

      <div className="settings-password-grid">
        <label>
          Yeni şifre
          <input
            type="password"
            value={form.password}
            onChange={event => updateField('password', event.target.value)}
            minLength={6}
            placeholder="Boş bırakırsan değişmez"
          />
        </label>
        <label>
          Şifre tekrar
          <input
            type="password"
            value={form.passwordConfirm}
            onChange={event => updateField('passwordConfirm', event.target.value)}
            minLength={6}
            placeholder="Yeni şifreyi tekrar yaz"
          />
        </label>
      </div>

      {message && <p className={`settings-message ${messageType}`}>{message}</p>}

      <button className="settings-save" type="submit" disabled={saving}>
        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
      </button>
    </form>
  );
};

export default Navbar;
