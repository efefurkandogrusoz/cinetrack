import React, { useState } from 'react';
import { loginUser, logoutUser, registerUser } from '../services/firebase';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import '../styles/components/AuthPanel.css';

const AuthPanel = ({ user, userProfile }) => {
  const [mode, setMode] = useState('login');
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (mode === 'login') {
        await loginUser(email, password);
      } else {
        await registerUser(email, password);
      }
      setEmail('');
      setPassword('');
      setOpen(false);
    } catch (error) {
      setMessage(getFirebaseMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setMessage('');
    try {
      await logoutUser();
    } catch (error) {
      setMessage(getFirebaseMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    const accountLabel = userProfile?.displayName || user.displayName || user.email;

    return (
      <div className="auth-user">
        <span className="auth-email" title={user.email}>{accountLabel}</span>
        <button className="auth-button subtle" type="button" onClick={signOut} disabled={busy}>
          Cikis
        </button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <button className="auth-button" type="button" onClick={() => setOpen(current => !current)}>
        Giris / Kayit
      </button>

      {open && (
        <form className="auth-popover" onSubmit={submit}>
          <div className="auth-tabs" role="tablist" aria-label="Kullanici islemleri">
            <button
              className={mode === 'login' ? 'active' : ''}
              type="button"
              onClick={() => setMode('login')}
            >
              Giris
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              type="button"
              onClick={() => setMode('register')}
            >
              Kayit
            </button>
          </div>

          <label>
            E-posta
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Sifre
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>

          {message && <p className="auth-message">{message}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Bekleyin...' : mode === 'login' ? 'Giris yap' : 'Kayit ol'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AuthPanel;
