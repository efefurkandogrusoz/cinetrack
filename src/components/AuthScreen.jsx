import React, { useMemo, useState } from 'react';
import { loginUser, registerUser } from '../services/firebase';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import {
  forgetAccount,
  getRememberedAccounts,
  rememberAccount,
} from '../utils/rememberedAccounts';
import '../styles/components/AuthScreen.css';

const AuthScreen = () => {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState(() => getRememberedAccounts());
  const [showAuthForm, setShowAuthForm] = useState(false);

  const isRegister = mode === 'register';
  const showProfilePicker = accounts.length > 0 && !showAuthForm;
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

  const chooseAccount = (account) => {
    setMode('login');
    setEmail(account.email);
    setDisplayName(account.displayName);
    setPassword('');
    setRememberMe(true);
    setMessage('');
    setShowAuthForm(true);
  };

  const addProfile = () => {
    setMode('login');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setRememberMe(true);
    setMessage('');
    setShowAuthForm(true);
  };

  const backToProfiles = () => {
    setMode('login');
    setDisplayName('');
    setEmail('');
    setPassword('');
    setMessage('');
    setShowAuthForm(false);
  };

  const removeAccount = (event, accountEmail) => {
    event.stopPropagation();
    forgetAccount(accountEmail);
    const nextAccounts = getRememberedAccounts();
    setAccounts(nextAccounts);

    if (nextAccounts.length === 0) setShowAuthForm(true);
    if (email.toLowerCase() === accountEmail.toLowerCase()) {
      setEmail('');
      setPassword('');
    }
  };

  if (showProfilePicker) {
    return (
      <main className="profile-select-screen">
        <section className="profile-select-panel" aria-label="Hesap seçimi">
          <p className="eyebrow">CineTrack</p>
          <h1>Kim izliyor?</h1>

          <div className="profile-grid">
            {accounts.map((account, index) => (
              <button
                className="profile-card"
                key={account.email}
                type="button"
                onClick={() => chooseAccount(account)}
              >
                <span className={`profile-avatar tone-${index % 4}`}>
                  {account.displayName.slice(0, 1).toUpperCase()}
                </span>
                <strong>{account.displayName}</strong>
                <small>{account.email}</small>
                <span
                  className="profile-delete"
                  role="button"
                  tabIndex={0}
                  onClick={event => removeAccount(event, account.email)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') removeAccount(event, account.email);
                  }}
                >
                  Sil
                </span>
              </button>
            ))}

            <button className="profile-card add-profile" type="button" onClick={addProfile}>
              <span className="profile-add-icon" aria-hidden="true" />
              <strong>Profil Ekle</strong>
            </button>
          </div>
        </section>
      </main>
    );
  }

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
          <p className="eyebrow">CineTrack</p>
          <h1>Sinematik izleme merkezine hoş geldin.</h1>
          <p>Haftanın seçkilerini keşfet, izleme listeni kur ve izlediklerini tek premium panelde yönet.</p>
        </div>
      </section>

      <section className="auth-card" aria-label="Kullanıcı girişi">
        <div className="auth-card-head">
          <div>
            <p className="eyebrow">Hesap</p>
            <h2>{isRegister ? 'Kayıt Ol' : selectedAccount ? `${selectedAccount.displayName} ile gir` : 'Giriş Yap'}</h2>
          </div>
          {accounts.length > 0 && (
            <button className="profile-back" type="button" onClick={backToProfiles}>
              Profil Seç
            </button>
          )}
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
              placeholder={isRegister ? 'ornek@mail.com' : 'mail adresi veya hatırlanan kullanıcı adı'}
              required
            />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="En az 6 karakter"
              minLength={6}
              required
            />
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
