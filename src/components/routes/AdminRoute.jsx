import { useMovies } from '../../context/MovieContext';
import { isInactiveUserProfile } from '../../utils/accountStatus';
import { isAdminProfile } from '../../utils/admin';
import '../../styles/pages/AdminPanel.css';

const AdminRoute = ({ children }) => {
  const { authReady, user, userProfile } = useMovies();
  const allowed = authReady && Boolean(user) && isAdminProfile(userProfile) && !isInactiveUserProfile(userProfile);

  if (!authReady) {
    return (
      <main className="app-loading">
        <p>Admin yetkisi kontrol ediliyor...</p>
      </main>
    );
  }

  if (!user || !allowed) {
    return (
      <main className="admin-denied">
        <h2>Bu sayfaya erişim yetkiniz yok.</h2>
        <p>Admin paneli yalnızca Firestore profilinde admin rolü olan kullanıcılar için açıktır.</p>
      </main>
    );
  }

  return children;
};

export default AdminRoute;
