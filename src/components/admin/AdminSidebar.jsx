import { BarChart3, Flag, Home, MessageSquare, PanelLeftClose, Star, Users } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'Kullanıcılar', icon: Users },
  { id: 'comments', label: 'Yorumlar', icon: MessageSquare },
  { id: 'reports', label: 'Şikayetler', icon: Flag },
  { id: 'featured', label: 'Popüler Filmler', icon: Star },
  { id: 'home', label: 'Ana Sayfa Ayarları', icon: Home },
];

const AdminSidebar = ({ activeTab, onChangeTab, open, onClose }) => (
  <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
    <div className="admin-sidebar-head">
      <div>
        <span>CT</span>
        <strong>Admin Paneli</strong>
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
  </aside>
);

export default AdminSidebar;
