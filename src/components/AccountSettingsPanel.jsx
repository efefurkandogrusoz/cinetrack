import React, { useState } from 'react';
import { useMovies } from '../context/MovieContext';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import { updateRememberedAccount } from '../utils/rememberedAccounts';
import '../styles/components/Navbar.css';

const AccountSettingsPanel = () => {
  const { user, userProfile, updateAccountSettings } = useMovies();
  const [form, setForm] = useState({
    displayName: userProfile?.displayName || user?.displayName || '',
    email: userProfile?.email || user?.email || '',
    profileNote: userProfile?.profileNote || '',
    password: '',
    passwordConfirm: '',
    currentPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password && form.password !== form.passwordConfirm) {
      setMessageType('error');
      setMessage('Şifreler eşleşmiyor.');
      return;
    }

    // E-posta veya şifre değiştirilecekse, mevcut şifre gerekiyor
    const emailChanged = form.email.trim().toLowerCase() !== (userProfile?.email || user?.email || '');
    const passwordChanged = form.password.trim() !== '';

    if ((emailChanged || passwordChanged) && !form.currentPassword.trim()) {
      setMessageType('error');
      setMessage('E-posta veya şifre değişikliği için mevcut şifreni girmelisin.');
      return;
    }

    setSaving(true);
    try {
      const previousEmail = user?.email;
      const nextProfile = await updateAccountSettings({
        displayName: form.displayName,
        email: form.email,
        profileNote: form.profileNote,
        password: form.password,
        currentPassword: form.currentPassword,
      });

      updateRememberedAccount(previousEmail, nextProfile);
      setForm(current => ({ ...current, password: '', passwordConfirm: '', currentPassword: '' }));
      setMessageType('success');
      setMessage('Hesap bilgileri güncellendi.');
    } catch (error) {
      setMessageType('error');
      setMessage(getFirebaseMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="account-settings-panel" onSubmit={submit}>
      <div>
        <p className="eyebrow">Hesap Ayarları</p>
        <h3>Profilini düzenle</h3>
      </div>

      <label>
        Kullanıcı adı
        <input
          type="text"
          value={form.displayName}
          onChange={event => updateField('displayName', event.target.value)}
          placeholder="Kullanıcı adın"
        />
      </label>

      <label>
        E-posta
        <input
          type="email"
          value={form.email}
          onChange={event => updateField('email', event.target.value)}
          placeholder="ornek@mail.com"
        />
      </label>

      <label>
        Profil notu
        <input
          type="text"
          value={form.profileNote}
          onChange={event => updateField('profileNote', event.target.value)}
          maxLength={70}
          placeholder="Favori türün, ruh halin veya kısa not"
        />
      </label>

      <div className="settings-password-grid">
        <label>
          Yeni şifre
          <span className="password-field">
            <input
              type={passwordVisible ? 'text' : 'password'}
              value={form.password}
              onChange={event => updateField('password', event.target.value)}
              minLength={6}
              placeholder="Boş bırakırsan değişmez"
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

        <label>
          Şifre tekrar
          <span className="password-field">
            <input
              type={passwordConfirmVisible ? 'text' : 'password'}
              value={form.passwordConfirm}
              onChange={event => updateField('passwordConfirm', event.target.value)}
              minLength={6}
              placeholder="Yeni şifreyi tekrar yaz"
            />
            <button
              className={passwordConfirmVisible ? 'password-toggle visible' : 'password-toggle'}
              type="button"
              aria-label={passwordConfirmVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              aria-pressed={passwordConfirmVisible}
              onClick={() => setPasswordConfirmVisible(current => !current)}
            >
              <span className="password-toggle-icon" aria-hidden="true" />
            </button>
          </span>
        </label>
      </div>

      <label>
        Mevcut şifren <span style={{ color: '#ff6b6b' }}>*</span>
        <small style={{ display: 'block', marginTop: '4px', color: '#999' }}>E-posta veya şifre değişikliği için mevcut şifreni girmek zorundasın</small>
        <span className="password-field">
          <input
            type={passwordVisible ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={event => updateField('currentPassword', event.target.value)}
            placeholder="Güvenlik doğrulaması için mevcut şifreni yaz"
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

      {message && <p className={`settings-message ${messageType}`}>{message}</p>}

      <button className="settings-save" type="submit" disabled={saving}>
        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
      </button>
    </form>
  );
};

export default AccountSettingsPanel;
