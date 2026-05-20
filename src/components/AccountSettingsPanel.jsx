import { useMemo, useState } from 'react';
import { useMovies } from '../context/MovieContext';
import { getFirebaseMessage } from '../utils/firebaseErrors';
import { updateRememberedAccount } from '../utils/rememberedAccounts';
import {
  PROFILE_AVATARS,
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_SIZE,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';
import UserAvatar from './UserAvatar';
import '../styles/components/Navbar.css';

const securityFields = ['password', 'passwordConfirm', 'currentPassword'];
const emptySecurityForm = {
  password: '',
  passwordConfirm: '',
  currentPassword: '',
};
const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const acceptedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];

const sameProfileAvatar = (first, second) => (
  first.avatarType === second.avatarType &&
  first.avatarId === second.avatarId &&
  first.avatarUrl === second.avatarUrl
);

const getProfilePhotoValidationMessage = (file) => {
  if (!file) return 'Profil fotoğrafı seçilemedi.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  const isAcceptedType = acceptedImageTypes.includes(file.type);
  const isAcceptedExtension = acceptedImageExtensions.includes(extension);
  const hasImageMime = file.type ? file.type.startsWith('image/') : isAcceptedExtension;

  if (!hasImageMime || (!isAcceptedType && !isAcceptedExtension)) {
    return 'Sadece jpg, jpeg, png veya webp formatında görsel seçebilirsin.';
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return 'Profil fotoğrafı en fazla 2 MB olabilir.';
  }

  return '';
};

const resizeProfileImage = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('canvas-unavailable');
      }

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;

      canvas.width = PROFILE_IMAGE_SIZE;
      canvas.height = PROFILE_IMAGE_SIZE;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        PROFILE_IMAGE_SIZE,
        PROFILE_IMAGE_SIZE,
      );

      const webpDataUrl = canvas.toDataURL('image/webp', 0.82);
      const dataUrl = webpDataUrl.startsWith('data:image/webp')
        ? webpDataUrl
        : canvas.toDataURL('image/jpeg', 0.86);

      resolve(dataUrl);
    } catch (error) {
      reject(error);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };

  image.src = objectUrl;
});

const AccountSettingsPanel = () => {
  const { user, userProfile, updateAccountSettings } = useMovies();
  const profileDefaults = useMemo(() => {
    const avatarFields = normalizeProfileAvatarFields(userProfile || {});

    return {
      displayName: userProfile?.displayName || user?.displayName || '',
      email: userProfile?.email || user?.email || '',
      profileNote: userProfile?.profileNote || '',
      ...avatarFields,
    };
  }, [
    user?.displayName,
    user?.email,
    userProfile,
  ]);
  const [profileUpdates, setProfileUpdates] = useState({});
  const [securityForm, setSecurityForm] = useState(emptySecurityForm);
  const [saving, setSaving] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const form = { ...profileDefaults, ...profileUpdates, ...securityForm };
  const selectedAvatar = normalizeProfileAvatarFields(form);
  const selectedPresetId = selectedAvatar.avatarType === 'preset'
    ? selectedAvatar.avatarId
    : null;
  const imageSelected = selectedAvatar.avatarType === 'image';

  const updateField = (field, value) => {
    if (securityFields.includes(field)) {
      setSecurityForm(current => ({ ...current, [field]: value }));
      return;
    }

    setProfileUpdates(current => ({ ...current, [field]: value }));
  };

  const selectPresetAvatar = (avatarId) => {
    setMessage('');
    setProfileUpdates(current => ({
      ...current,
      avatarType: 'preset',
      avatarId,
      avatarUrl: null,
      avatar: avatarId,
    }));
  };

  const handleProfilePhotoFile = async (file) => {
    const validationMessage = getProfilePhotoValidationMessage(file);

    if (validationMessage) {
      setMessageType('error');
      setMessage(validationMessage);
      return;
    }

    setPhotoProcessing(true);
    setMessage('');

    try {
      const avatarUrl = await resizeProfileImage(file);
      setProfileUpdates(current => ({
        ...current,
        avatarType: 'image',
        avatarId: null,
        avatarUrl,
        avatar: null,
      }));
    } catch (error) {
      console.error('Profile photo could not be processed:', error);
      setMessageType('error');
      setMessage('Profil fotoğrafı okunamadı. Lütfen başka bir görsel seç.');
    } finally {
      setPhotoProcessing(false);
    }
  };

  const handlePhotoInputChange = (event) => {
    handleProfilePhotoFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handlePhotoDrop = (event) => {
    event.preventDefault();
    setDraggingPhoto(false);
    handleProfilePhotoFile(event.dataTransfer.files?.[0]);
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

    const previousAvatar = normalizeProfileAvatarFields(userProfile || {});
    const nextAvatar = normalizeProfileAvatarFields(form);

    setSaving(true);
    try {
      const previousEmail = user?.email;
      const nextProfile = await updateAccountSettings({
        displayName: form.displayName,
        email: form.email,
        profileNote: form.profileNote,
        avatarType: nextAvatar.avatarType,
        avatarId: nextAvatar.avatarId,
        avatarUrl: nextAvatar.avatarUrl,
        avatar: nextAvatar.avatar,
        password: form.password,
        currentPassword: form.currentPassword,
      });
      const savedAvatar = normalizeProfileAvatarFields(nextProfile);

      updateRememberedAccount(previousEmail, nextProfile);
      setProfileUpdates({
        displayName: nextProfile.displayName || '',
        email: nextProfile.email || '',
        profileNote: nextProfile.profileNote || '',
        ...savedAvatar,
      });
      setSecurityForm(emptySecurityForm);
      setMessageType('success');
      setMessage(
        sameProfileAvatar(previousAvatar, savedAvatar)
          ? 'Hesap bilgileri güncellendi.'
          : 'Profil görseli güncellendi.',
      );
    } catch (error) {
      setMessageType('error');
      setMessage(
        sameProfileAvatar(previousAvatar, nextAvatar)
          ? getFirebaseMessage(error)
          : 'Profil görseli güncellenemedi.',
      );
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

      <section className="profile-avatar-section" aria-labelledby="profile-avatar-title">
        <div className="profile-avatar-head">
          <UserAvatar
            avatarType={selectedAvatar.avatarType}
            avatarId={selectedAvatar.avatarId}
            avatarUrl={selectedAvatar.avatarUrl}
            className="profile-avatar-preview"
            label="Seçili profil görseli"
          />
          <div>
            <h4 id="profile-avatar-title">Profil Görseli</h4>
            <p>Hazır avatar seçebilir veya kendi profil fotoğrafını yükleyebilirsin.</p>
          </div>
        </div>

        <div className="profile-visual-layout">
          <div className="profile-visual-group">
            <div className="profile-visual-group-head">
              <strong>Hazır Avatarlar</strong>
              <span>{imageSelected ? 'Fotoğraf aktif' : 'Avatar aktif'}</span>
            </div>

            <div className="profile-avatar-grid" role="radiogroup" aria-label="Hazır avatarlar">
              {PROFILE_AVATARS.map(avatarOption => {
                const selected = selectedPresetId === avatarOption.id;

                return (
                  <button
                    key={avatarOption.id}
                    className={selected ? 'avatar-option selected' : 'avatar-option'}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${avatarOption.label} avatarını seç`}
                    onClick={() => selectPresetAvatar(avatarOption.id)}
                  >
                    <UserAvatar
                      avatarType="preset"
                      avatarId={avatarOption.id}
                      decorative
                    />
                    <span className="avatar-option-label">{avatarOption.label}</span>
                    {selected && <span className="avatar-check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="profile-visual-group">
            <div className="profile-visual-group-head">
              <strong>Fotoğraf Yükle</strong>
              <span>{imageSelected ? 'Seçildi' : 'Opsiyonel'}</span>
            </div>

            <label
              className={[
                'profile-upload-dropzone',
                imageSelected ? 'selected' : '',
                draggingPhoto ? 'dragging' : '',
              ].filter(Boolean).join(' ')}
              onDragOver={(event) => {
                event.preventDefault();
                setDraggingPhoto(true);
              }}
              onDragLeave={() => setDraggingPhoto(false)}
              onDrop={handlePhotoDrop}
            >
              <input
                className="profile-photo-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handlePhotoInputChange}
                disabled={saving || photoProcessing}
              />
              <UserAvatar
                avatarType={selectedAvatar.avatarType}
                avatarId={selectedAvatar.avatarId || 'user-slate'}
                avatarUrl={selectedAvatar.avatarUrl}
                className="profile-upload-preview"
                decorative
              />
              <span className="profile-upload-copy">
                <strong>
                  {photoProcessing
                    ? 'Fotoğraf hazırlanıyor...'
                    : imageSelected
                      ? 'Fotoğraf seçildi'
                      : 'Profil Fotoğrafı Yükle'}
                </strong>
                <small>JPG, PNG veya WEBP; 2 MB'a kadar.</small>
              </span>
            </label>
          </div>
        </div>
      </section>

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
            type={currentPasswordVisible ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={event => updateField('currentPassword', event.target.value)}
            placeholder="Güvenlik doğrulaması için mevcut şifreni yaz"
          />
          <button
            type="button"
            className={currentPasswordVisible ? 'password-toggle visible' : 'password-toggle'}
            aria-label={currentPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            aria-pressed={currentPasswordVisible}
            onClick={() => setCurrentPasswordVisible(current => !current)}
          >
            <span className="password-toggle-icon" aria-hidden="true" />
          </button>
        </span>
      </label>

      {message && <p className={`settings-message ${messageType}`}>{message}</p>}

      <button className="settings-save" type="submit" disabled={saving || photoProcessing}>
        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
      </button>
    </form>
  );
};

export default AccountSettingsPanel;
