import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Star,
  User,
} from 'lucide-react';
import {
  loginUser,
  registerUser,
  resetUserPassword,
  signInWithGoogle,
} from '../services/firebase';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import {
  getRememberedAccounts,
  rememberAccount,
} from '../utils/rememberedAccounts';
import { useMovies } from '../context/MovieContext';
import '../styles/components/AuthScreen.css';

const showcaseFeatures = [
  {
    title: 'Kişisel Listeler',
    text: 'İzleme listelerini oluştur ve düzenle.',
    icon: Bookmark,
  },
  {
    title: 'Favori İçerikler',
    text: 'Sevdiğin içerikleri kaydet ve kolayca eriş.',
    icon: Star,
  },
  {
    title: 'İzleme İstatistikleri',
    text: 'İzleme alışkanlıklarını analiz et.',
    icon: BarChart3,
  },
];

const AuthScreen = () => {
  const { authError, clearAuthError } = useMovies();
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState(() => getRememberedAccounts());

  const isRegister = mode === 'register';
  const selectedAccount = useMemo(() => {
    const normalized = email.trim().toLowerCase();
    return accounts.find(account =>
      account.email === normalized ||
      account.displayName?.toLowerCase() === normalized ||
      account.email.split('@')[0] === normalized
    );
  }, [accounts, email]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage('');
    setMessageType('error');
    clearAuthError();
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setMessageType('error');
    clearAuthError();

    try {
      const loginEmail = isRegister
        ? email.trim()
        : selectedAccount?.email || email.trim();
      const user = isRegister
        ? await registerUser(loginEmail, password, displayName, rememberMe)
        : await loginUser(loginEmail, password, rememberMe);

      if (rememberMe) {
        const accountName = displayName || user.displayName || selectedAccount?.displayName;
        rememberAccount({ email: user.email || loginEmail, displayName: accountName });
        setAccounts(getRememberedAccounts());
      }
    } catch (error) {
      setMessage(getFirebaseMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    const resetEmail = selectedAccount?.email || email.trim();

    if (!resetEmail || !resetEmail.includes('@')) {
      setMessageType('error');
      setMessage('Şifre sıfırlama bağlantısı için kayıtlı e-posta adresini yazmalısın.');
      return;
    }

    setBusy(true);
    setMessage('');
    setMessageType('error');
    clearAuthError();

    try {
      await resetUserPassword(resetEmail);
      setMessageType('success');
      setMessage('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.');
    } catch (error) {
      setMessageType('error');
      setMessage(getFirebaseMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setMessage('');
    setMessageType('error');
    clearAuthError();

    try {
      const user = await signInWithGoogle(rememberMe);

      if (rememberMe) {
        rememberAccount({
          email: user.email,
          displayName: user.displayName || 'Google Kullanıcısı',
        });
        setAccounts(getRememberedAccounts());
      }
    } catch (error) {
      setMessage(getFirebaseMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const visibleMessage = message || authError;
  const visibleMessageType = message ? messageType : 'error';

  return (
    <main className="auth-screen">
      <section className="auth-showcase" aria-label="CineTrack tanıtım alanı">
        <div className="auth-cinema-glow" aria-hidden="true" />
        <div className="auth-cinema-curve" aria-hidden="true" />

        <div className="auth-brand">
          <span className="auth-logo-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <strong className="auth-brand-name">
            <span>Cine</span>
            <span>Track</span>
          </strong>
        </div>

        <div className="auth-copy">
          <span className="auth-title-line" aria-hidden="true" />
          <h1>
            <span>İzle.</span>
            <span>Keşfet.</span>
            <span>Hatırla.</span>
          </h1>
          <p>
            Film ve dizilerini düzenle, favorilerini kaydet,
            izleme listeni oluştur ve tüm arşivini yönet.
          </p>
        </div>

        <div className="auth-feature-row" aria-label="CineTrack özellikleri">
          {showcaseFeatures.map(({ title, text, icon: Icon }) => (
            <article className="auth-feature-card" key={title}>
              <span className="auth-feature-icon">
                <Icon size={28} strokeWidth={1.85} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>

        <p className="auth-copyright">© 2024 CineTrack. Tüm hakları saklıdır.</p>
      </section>

      <section className="auth-panel-shell" aria-label="Kullanıcı girişi">
        <div className="auth-card">
          <header className="auth-card-head">
            <h2>{isRegister ? 'Hesap oluştur' : 'Hesabına giriş yap'}</h2>
            <p>
              {isRegister
                ? 'Film ve dizi arşivini yönetmek için yeni hesabını oluştur.'
                : 'Film ve dizi arşivine kaldığın yerden devam et.'}
            </p>
          </header>

          <div className="auth-mode-switch" role="tablist" aria-label="Giriş veya kayıt">
            <button
              className={!isRegister ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={!isRegister}
              onClick={() => switchMode('login')}
            >
              Giriş Yap
            </button>
            <button
              className={isRegister ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={isRegister}
              onClick={() => switchMode('register')}
            >
              Kayıt Ol
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <div className="auth-fields">
              {isRegister && (
                <label className="auth-field">
                  <span className="auth-field-label">Ad Soyad</span>
                  <span className="auth-field-control">
                    <User size={22} aria-hidden="true" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={event => setDisplayName(event.target.value)}
                      autoComplete="name"
                      placeholder="Ad Soyad"
                    />
                  </span>
                </label>
              )}

              <label className="auth-field">
                <span className="auth-field-label">{isRegister ? 'E-posta' : 'E-posta veya kullanıcı adı'}</span>
                <span className="auth-field-control">
                  <User size={22} aria-hidden="true" />
                  <input
                    type={isRegister ? 'email' : 'text'}
                    value={email}
                    onChange={event => {
                      setEmail(event.target.value);
                      if (authError) clearAuthError();
                    }}
                    autoComplete={isRegister ? 'email' : 'username'}
                    placeholder={isRegister ? 'E-posta adresi' : 'E-posta veya kullanıcı adı'}
                    required
                  />
                </span>
              </label>

              <label className="auth-field">
                <span className="auth-field-label">Şifre</span>
                <span className="auth-field-control auth-password-control">
                  <LockKeyhole size={22} aria-hidden="true" />
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder={isRegister ? 'En az 6 karakter' : 'Şifrenizi girin'}
                    minLength={6}
                    required
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-label={passwordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible(current => !current)}
                  >
                    {passwordVisible ? <EyeOff size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
                  </button>
                </span>
              </label>
            </div>

            {!isRegister && selectedAccount && (
              <p className="auth-account-hint">
                {selectedAccount.displayName} için kayıtlı e-posta kullanılacak.
              </p>
            )}

            {!isRegister && (
              <div className="auth-options">
                <label className="remember-row">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={event => setRememberMe(event.target.checked)}
                  />
                  <span className="remember-check" aria-hidden="true">
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>Beni hatırla</span>
                </label>

                <button
                  className="auth-forgot"
                  type="button"
                  disabled={busy}
                  onClick={requestPasswordReset}
                >
                  Şifremi unuttum?
                </button>
              </div>
            )}

            {visibleMessage && (
              <p className={`auth-message auth-message-${visibleMessageType}`} role="alert">
                {visibleMessage}
              </p>
            )}

            <button className="auth-primary" type="submit" disabled={busy}>
              <span>{busy ? 'İşleniyor...' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'}</span>
              <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />
            </button>

            {!isRegister && (
              <>
                <div className="auth-divider">
                  <span>veya</span>
                </div>

                <button
                  className="auth-google"
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                >
                  <span aria-hidden="true">G</span>
                  Google ile giriş yap
                </button>
              </>
            )}
          </form>

          <footer className="auth-card-footer">
            <span>{isRegister ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}</span>
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Giriş yap' : 'Kayıt ol'}
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
};

export default AuthScreen;
