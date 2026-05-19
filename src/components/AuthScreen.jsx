import { useMemo, useState } from 'react';
import { loginUser, registerUser } from '../services/firebase';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import {
  getRememberedAccounts,
  rememberAccount,
} from '../utils/rememberedAccounts';
import '../styles/components/AuthScreen.css';

const AuthScreen = () => {
  const logoUrl = `${import.meta.env.BASE_URL}cinetrack-logo.png`;
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState('');
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

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

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

  return (
    <main className="auth-screen">
      <section className="auth-hero" aria-label="CineTrack giriş">
        <div className="auth-poster-strip" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="auth-copy">
          <img className="auth-logo" src={logoUrl} alt="CineTrack" />
          <h1>Sinematik izleme merkezine hoş geldin.</h1>
          <p>Haftanın seçkilerini keşfet, izleme listeni kur ve izlediklerini tek premium panelde yönet.</p>
        </div>
      </section>

      <section className="auth-card" aria-label="Kullanıcı girişi">
        <div className="auth-card-head">
          <p className="eyebrow">Hesap</p>
          <h2>{isRegister ? 'Kayıt Ol' : selectedAccount ? `${selectedAccount.displayName} ile gir` : 'Giriş Yap'}</h2>
        </div>

        <div className="auth-mode-switch" role="tablist" aria-label="Giriş veya kayıt">
          <button
            className={!isRegister ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            Giriş
          </button>
          <button
            className={isRegister ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            Kayıt
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {isRegister && (
            <label>
              Ad Soyad
              <input
                type="text"
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                autoComplete="name"
                placeholder="Adını yaz"
              />
            </label>
          )}

          <label>
            {isRegister ? 'E-posta' : 'Kullanıcı adı veya e-posta'}
            <input
              type={isRegister ? 'email' : 'text'}
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete={isRegister ? 'email' : 'username'}
              placeholder={isRegister ? 'ornek@mail.com' : 'mail adresi veya kullanıcı adı'}
              required
            />
          </label>

          <label>
            Şifre
            <span className="password-field">
              <input
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="En az 6 karakter"
                minLength={6}
                required
              />
              <button
                className={passwordVisible ? 'password-toggle visible' : 'password-toggle'}
                type="button"
                aria-label={passwordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible(current => !current)}
              >
                <span className="password-toggle-icon" aria-hidden="true" />
              </button>
            </span>
          </label>

          {!isRegister && (
            <label className="remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={event => setRememberMe(event.target.checked)}
              />
              <span>Beni Hatırla</span>
            </label>
          )}

          {message && <p className="auth-error">{message}</p>}

          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Bekleyin...' : isRegister ? 'Hesap oluştur' : 'Uygulamaya gir'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default AuthScreen;
