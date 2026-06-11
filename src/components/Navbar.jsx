import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Clapperboard,
  Home,
  List,
  LogOut,
  Settings,
  Shield,
  User,
  UserCog,
  X,
} from 'lucide-react';
import { logoutUser } from '../services/firebase';
import { useMovies } from '../context/MovieContext';
import { isAdminProfile } from '../utils/admin';
import { getWatchStatus } from '../utils/media';
import MovieSearch from './MovieSearch';
import NotificationCenter from './NotificationCenter';
import UserAvatar from './UserAvatar';
import '../styles/components/Navbar.css';

const DrawerNavGroup = ({ title, children }) => (
  <section className="drawer-nav-group">
    <span className="drawer-nav-group-title">{title}</span>
    <div className="drawer-nav-list">{children}</div>
  </section>
);

const DrawerNavItem = ({ icon: Icon, label, active = false, onClick, className = '' }) => (
  <button
    type="button"
    className={`drawer-nav-item ${active ? 'active' : ''} ${className}`.trim()}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
  >
    <span className="drawer-nav-icon" aria-hidden="true">
      <Icon size={18} strokeWidth={2} />
    </span>
    <span className="drawer-nav-text">{label}</span>
  </button>
);

const Navbar = () => {
  const { setFilter, movies, user, userProfile } = useMovies();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const stats = useMemo(() => ({
    watched: movies.filter(movie => movie.watched || getWatchStatus(movie) === 'completed' || getWatchStatus(movie) === 'watched').length,
    watchlist: movies.filter(movie => getWatchStatus(movie) === 'watchlist').length,
    favorites: movies.filter(movie => movie.favorite || movie.isFavorite).length,
    total: movies.length,
  }), [movies]);

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const goToAccountSettings = () => {
    closeDrawer();
    navigate('/account-settings');
  };

  const goToProfile = () => {
    closeDrawer();
    navigate(`/user/${user.uid}`);
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

  const goToAdmin = () => {
    setFilter('all');
    closeDrawer();
    navigate('/admin');
  };

  const goToMyList = () => {
    setFilter('all');
    closeDrawer();
    navigate('/listem');
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

  const goToNotifications = () => {
    closeDrawer();
    navigate('/notifications');
  };

  const goToLibraryView = (view) => {
    const routes = {
      all: '/library/all',
      watched: '/library/watched',
      watchlist: '/library/watchlist',
      favorites: '/library/favorites',
    };

    setFilter(view === 'all' ? 'all' : view);
    closeDrawer();
    navigate(routes[view] || routes.all);
  };

  const signOut = async () => {
    await logoutUser();
    closeDrawer();
  };

  const toggleDrawer = () => {
    setDrawerOpen(current => !current);
  };

  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || 'Kullanıcı';
  const isAdmin = isAdminProfile(userProfile);
  const isAccountSettings = location.pathname === '/account-settings';
  const isSettings = location.pathname === '/settings';
  const isHome = location.pathname === '/';
  const isMyList = location.pathname === '/listem';
  const isNotifications = location.pathname === '/notifications';
  const isLibraryPage = location.pathname.startsWith('/library/')
    || location.pathname === '/watched'
    || location.pathname === '/watchlist'
    || location.pathname === '/favorites';
  const isMovies = location.pathname === '/movies';
  const isStatistics = location.pathname === '/statistics' || location.pathname === '/istatistikler';
  const isUserProfile = location.pathname.startsWith('/user/');
  const isAdminPanel = location.pathname.startsWith('/admin');
  const hideNavbarSearch = isAccountSettings || isSettings || isLibraryPage || isMyList || isNotifications || isStatistics || isUserProfile || isAdminPanel || isMovies;
  const logoMarkUrl = `${import.meta.env.BASE_URL}cinetrack-logo-mark.png`;

  const metricCards = [
    { value: stats.total, label: 'Tümü', view: 'all' },
    { value: stats.watched, label: 'İzlenen', view: 'watched' },
    { value: stats.watchlist, label: 'İzlenecek', view: 'watchlist' },
    { value: stats.favorites, label: 'Favori', view: 'favorites' },
  ];

  useEffect(() => {
    let frameId = 0;

    const getScrollTop = (event) => {
      const target = event?.target;
      const targetScrollTop = target && target !== document
        ? Number(target.scrollTop || target.documentElement?.scrollTop || target.body?.scrollTop || 0)
        : 0;

      return Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0,
        targetScrollTop,
      );
    };

    const handleScroll = (event) => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setScrolled(getScrollTop(event) > 12);
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  return (
    <>
      <nav className={[
        'navbar-container',
        hideNavbarSearch ? 'navbar-compact' : '',
        scrolled ? 'navbar-scrolled' : '',
      ].filter(Boolean).join(' ')}>
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
          <NotificationCenter />
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
          {isAdmin && (
            <button
              className={isAdminPanel ? 'nav-page-btn active admin-link' : 'nav-page-btn admin-link'}
              type="button"
              onClick={goToAdmin}
            >
              Admin Paneli
            </button>
          )}
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
      <div className="navbar-spacer" aria-hidden="true" />

      <aside
        className={drawerOpen ? 'side-drawer open' : 'side-drawer'}
        aria-hidden={!drawerOpen}
        aria-label="Navigasyon menüsü"
      >
        <div className="drawer-shell">
          <header className="drawer-head">
            <div className="drawer-user">
              <UserAvatar
                profile={userProfile}
                className="drawer-user-avatar"
                decorative
              />
              <div className="drawer-user-copy">
                <strong>{accountLabel}</strong>
                <small>{user?.email}</small>
                {userProfile?.profileNote && <em>{userProfile.profileNote}</em>}
              </div>
            </div>
            <button className="drawer-close" type="button" onClick={closeDrawer} aria-label="Menüyü kapat">
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </header>

          <div className="drawer-metrics" aria-label="Liste özeti">
            {metricCards.map(card => (
              <button
                className="drawer-metric-card"
                key={card.label}
                type="button"
                onClick={() => goToLibraryView(card.view)}
              >
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </button>
            ))}
          </div>

          <nav className="drawer-nav" aria-label="Menü bağlantıları">
            <DrawerNavGroup title="Ana Menü">
              <DrawerNavItem
                icon={Home}
                label="Anasayfa"
                active={isHome}
                onClick={goToHomeTop}
              />
              <DrawerNavItem
                icon={Clapperboard}
                label="Film & Dizi"
                active={isMovies}
                onClick={goToMovies}
              />
              <DrawerNavItem
                icon={BarChart3}
                label="İstatistikler"
                active={isStatistics}
                onClick={goToStatistics}
              />
            </DrawerNavGroup>

            <DrawerNavGroup title="Listeler">
              <DrawerNavItem
                icon={List}
                label="Listem"
                active={isMyList}
                onClick={goToMyList}
              />
            </DrawerNavGroup>

            <DrawerNavGroup title="Hesap">
              <DrawerNavItem
                icon={User}
                label="Profilim"
                active={isUserProfile}
                onClick={goToProfile}
              />
              <DrawerNavItem
                icon={UserCog}
                label="Hesap Ayarları"
                active={isAccountSettings}
                onClick={goToAccountSettings}
              />
              <DrawerNavItem
                icon={Bell}
                label="Bildirimler"
                active={isNotifications}
                onClick={goToNotifications}
              />
              <DrawerNavItem
                icon={Settings}
                label="Ayarlar"
                active={isSettings}
                onClick={goToSettings}
              />
            </DrawerNavGroup>

            {isAdmin && (
              <DrawerNavGroup title="Yönetim">
                <DrawerNavItem
                  icon={Shield}
                  label="Admin Paneli"
                  active={isAdminPanel}
                  onClick={goToAdmin}
                />
              </DrawerNavGroup>
            )}
          </nav>

          <footer className="drawer-footer">
            <button className="drawer-logout" type="button" onClick={signOut}>
              <LogOut size={18} strokeWidth={2} aria-hidden="true" />
              <span>Çıkış Yap</span>
            </button>
          </footer>
        </div>
      </aside>

      {drawerOpen && <button className="drawer-backdrop" type="button" aria-label="Navigasyon arka planını kapat" onClick={closeDrawer} />}
    </>
  );
};

export default Navbar;
