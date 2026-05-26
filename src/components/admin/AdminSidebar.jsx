import {
  BarChart3,
  BellPlus,
  Flag,
  Home,
  ImagePlus,
  Megaphone,
  MessageSquare,
  PanelLeftClose,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { useMovies } from '../../context/MovieContext';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Kullanıcılar', icon: Users },
  { id: 'comments', label: 'Yorumlar', icon: MessageSquare },
  { id: 'reports', label: 'Şikayetler', icon: Flag },
  { id: 'announcements', label: 'Duyurular', icon: Megaphone },
  { id: 'notifications', label: 'Bildirim Gönder', icon: BellPlus },
  { id: 'moderation', label: 'Moderasyon', icon: ShieldAlert },
  { id: 'hero', label: 'Hero Banner Yönetimi', icon: ImagePlus },
  { id: 'featured', label: 'Popüler Filmler', icon: Star },
  { id: 'home', label: 'Ana Sayfa Ayarları', icon: Home },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

const AdminSidebar = ({ activeTab, onChangeTab, open, onClose }) => {
  const { user, userProfile } = useMovies();
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Admin';

  return (
    <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
      <div className="admin-sidebar-brand">
        <strong>Cine<span>Track</span></strong>
        <small>Admin Panel</small>
      </div>

      <div className="admin-sidebar-head">
        <div>
          <span>CT</span>
          <strong>{displayName}</strong>
          <small>
            <ShieldCheck size={12} aria-hidden="true" />
            Yönetici
          </small>
        </div>
        <button type="button" onClick={onClose} aria-label="Admin menüsünü kapat">
          <PanelLeftClose size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin panel bölümleri">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              type="button"
              onClick={() => {
                onChangeTab(tab.id);
                onClose();
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <footer className="admin-sidebar-footer">
        <strong>CineTrack v1.0.0</strong>
        <span>© 2026 CineTrack Admin</span>
      </footer>
    </aside>
  );
};

export default AdminSidebar;
