import AccountSettingsPanel from '../components/AccountSettingsPanel';
import Navbar from '../components/Navbar';
import { useMovies } from '../context/MovieContext';
import UserAvatar from '../components/UserAvatar';
import '../styles/pages/pages.css';

const AccountSettings = () => {
  const { user, userProfile } = useMovies();
  const displayName = userProfile?.displayName || user?.displayName || 'Kullanıcı';

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
              <UserAvatar
                profile={userProfile}
                className="account-avatar"
                label="Profil görseli"
              />
              <div>
                <h3>{displayName}</h3>
                <p>{userProfile?.email || user?.email}</p>
                {userProfile?.profileNote && <small>{userProfile.profileNote}</small>}
              </div>
            </aside>

            <div className="account-settings-shell">
              <AccountSettingsPanel
                key={user?.uid || 'guest'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
