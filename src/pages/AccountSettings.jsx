import React from 'react';
import AccountSettingsPanel from '../components/AccountSettingsPanel';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import '../styles/pages/pages.css';

const AccountSettings = () => {
  const { user, userProfile } = useMovies();

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">
        <div className="container-fluid account-settings-page">
          <div className="page-header account-settings-header">
            <p className="eyebrow">Hesap</p>
            <h2>Hesap Ayarları</h2>
            <p>Kullanıcı adını, e-posta adresini, profil notunu ve şifreni buradan güncelleyebilirsin.</p>
          </div>

          <div className="account-settings-layout">
            <aside className="account-settings-summary">
              <span className="account-avatar">
                {(userProfile?.displayName || user?.displayName || user?.email || 'Kullanıcı').slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h3>{userProfile?.displayName || user?.displayName || 'Kullanıcı'}</h3>
                <p>{userProfile?.email || user?.email}</p>
                {userProfile?.profileNote && <small>{userProfile.profileNote}</small>}
              </div>
            </aside>

            <div className="account-settings-shell">
              <AccountSettingsPanel
                key={`${user?.uid}-${userProfile?.email || user?.email}-${userProfile?.displayName || user?.displayName}-${userProfile?.profileNote || ''}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
