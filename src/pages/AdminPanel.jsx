import { useMemo, useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import Navbar from '../components/Navbar';
import AdminComments from './admin/AdminComments';
import AdminAnnouncements from './admin/AdminAnnouncements';
import AdminDashboard from './admin/AdminDashboard';
import AdminFeaturedMovies from './admin/AdminFeaturedMovies';
import AdminHeroBanners from './admin/AdminHeroBanners';
import AdminHomeSettings from './admin/AdminHomeSettings';
import AdminModeration from './admin/AdminModeration';
import AdminReports from './admin/AdminReports';
import AdminSendNotification from './admin/AdminSendNotification';
import AdminSettings from './admin/AdminSettings';
import AdminUsers from './admin/AdminUsers';
import '../styles/pages/AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const content = useMemo(() => {
    switch (activeTab) {
      case 'users':
        return <AdminUsers />;
      case 'comments':
        return <AdminComments />;
      case 'reports':
        return <AdminReports />;
      case 'announcements':
        return <AdminAnnouncements />;
      case 'notifications':
        return <AdminSendNotification />;
      case 'moderation':
        return <AdminModeration />;
      case 'hero':
        return <AdminHeroBanners />;
      case 'featured':
        return <AdminFeaturedMovies />;
      case 'home':
        return <AdminHomeSettings />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboard onNavigate={setActiveTab} />;
    }
  }, [activeTab]);

  return (
    <div className="page-container admin-page">
      <Navbar />
      <div className="admin-shell">
        <AdminSidebar
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <button
            className="admin-sidebar-backdrop"
            type="button"
            aria-label="Admin menüsünü kapat"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="admin-main">
          <header className="admin-topbar">
            <button className="admin-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Admin menüsünü aç">
              <Menu size={18} aria-hidden="true" />
            </button>
            <div>
              <p className="eyebrow">CineTrack</p>
              <h1>Admin Paneli</h1>
              <p>CineTrack yönetim paneline hoş geldiniz.</p>
            </div>
            <span className="admin-role-check-btn">
              <ShieldCheck size={17} aria-hidden="true" />
              Firestore rol kontrolü
            </span>
          </header>

          {content}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
