import { useEffect, useState } from 'react';
import { useMovies } from '../../context/MovieContext';
import { isCurrentUserAdmin } from '../../services/adminService';
import { isAdminProfile } from '../../utils/admin';
import '../../styles/pages/AdminPanel.css';

const AdminRoute = ({ children }) => {
  const { authReady, user, userProfile } = useMovies();
  const [remoteCheck, setRemoteCheck] = useState({
    allowed: null,
    uid: null,
  });
  const profileAllows = isAdminProfile(userProfile);
  const needsRemoteCheck = authReady && Boolean(user) && !profileAllows;

  useEffect(() => {
    let cancelled = false;

    if (!needsRemoteCheck) return undefined;

    isCurrentUserAdmin()
      .then((result) => {
        if (!cancelled) {
          setRemoteCheck({
            allowed: result,
            uid: user.uid,
          });
        }
      })
      .catch((error) => {
        console.warn('Admin role could not be verified:', error);
        if (!cancelled) {
          setRemoteCheck({
            allowed: false,
            uid: user.uid,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [needsRemoteCheck, user]);

  const remoteAllows = remoteCheck.uid === user?.uid ? remoteCheck.allowed : null;
  const allowed = !authReady
    ? null
    : !user
      ? false
      : profileAllows
        ? true
        : remoteAllows;

  if (!authReady || allowed === null) {
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
