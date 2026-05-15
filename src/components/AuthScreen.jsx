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

  const isRegister = mode === 'register';
  const showAccountPicker = !isRegister && accounts.length > 0;
  const selectedAccount = useMemo(
    () => accounts.find(account => account.email === email.toLowerCase()),
    [accounts, email]
  );

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      let user;
      if (isRegister) {
        user = await registerUser(email, password, displayName);
      } else {
        user = await loginUser(email, password);
      }

      if (rememberMe) {
        const accountName = displayName || user.displayName || selectedAccount?.displayName;
        rememberAccount({ email: user.email || email, displayName: accountName });
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
    setRememberMe(true);
    setMessage('');
  };

  const removeAccount = (event, accountEmail) => {
    event.stopPropagation();
    forgetAccount(accountEmail);
    const nextAccounts = getRememberedAccounts();
    setAccounts(nextAccounts);
    if (email.toLowerCase() === accountEmail.toLowerCase()) {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-hero" aria-label="CineTrack giris">
        <div className="auth-poster-strip" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="auth-copy">
          <p className="eyebrow">CineTrack</p>
          <h1>Koyu, hizli, sana ozel film merkezi.</h1>
          <p>Hesabini sec, listene gir ve kirmizi-siyah sinema panelinden filmleri kesfet.</p>
        </div>
      </section>

      <section className="auth-card" aria-label="Kullanici girisi">
        {showAccountPicker && (
          <div className="account-picker">
            <div className="account-picker-head">
              <p className="eyebrow">Hatirlananlar</p>
              <h2>Hesap secin</h2>
            </div>
            <div className="account-list">
              {accounts.map(account => (
                <button
                  className={account.email === email.toLowerCase() ? 'account-choice active' : 'account-choice'}
                  key={account.email}
                  type="button"
                  onClick={() => chooseAccount(account)}
                >
                  <span className="account-avatar">{account.displayName.slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{account.displayName}</strong>
                    <small>{account.email}</small>
                  </span>
                  <span
                    className="forget-account"
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
            </div>
          </div>
        )}

        <div className="auth-card-head">
          <p className="eyebrow">Hesap</p>
          <h2>{isRegister ? 'Kayit ol' : selectedAccount ? `${selectedAccount.displayName} ile gir` : 'Giris yap'}</h2>
        </div>

        <div className="auth-mode-switch" role="tablist" aria-label="Giris veya kayit">
          <button
            className={!isRegister ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            Giris
          </button>
          <button
            className={isRegister ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            Kayit
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
                placeholder="Adini yaz"
              />
            </label>
          )}

          <label>
            E-posta
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="ornek@mail.com"
              required
            />
          </label>

          <label>
            Sifre
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
              <span>Bu hesabi hatirla</span>
            </label>
          )}

          {message && <p className="auth-error">{message}</p>}

          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Bekleyin...' : isRegister ? 'Hesap olustur' : 'Uygulamaya gir'}
          </button>
        </form>
      </section>
    </main>
  );
};

export default AuthScreen;
