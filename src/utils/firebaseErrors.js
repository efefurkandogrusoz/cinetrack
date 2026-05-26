export const getFirebaseMessage = (error) => {
  const code = error?.code || error?.message || '';

  if (code.includes('invalid-email')) return 'E-posta formati hatali.';
  if (code.includes('missing-password')) return 'Şifre alanı boş bırakılamaz.';
  if (code.includes('invalid-credential')) return 'E-posta veya şifre hatalı.';
  if (code.includes('user-not-found')) return 'Bu e-posta ile kayıtlı kullanıcı yok.';
  if (code.includes('wrong-password')) return 'Şifre hatalı.';
  if (code.includes('email-already-in-use')) return 'Bu e-posta zaten kayıtlı.';
  if (code.includes('weak-password')) return 'Şifre en az 6 karakter olmalı.';
  if (code.includes('popup-closed-by-user')) return 'Google giriş penceresi kapatıldı.';
  if (code.includes('popup-blocked')) return 'Tarayıcı Google giriş penceresini engelledi. Popup izni verip tekrar dene.';
  if (code.includes('account-exists-with-different-credential')) {
    return 'Bu e-posta adresi farklı bir giriş yöntemiyle kullanılıyor.';
  }
  if (code.includes('requires-recent-login')) return 'Bu değişiklik için çıkış yapıp tekrar giriş yaptıktan sonra yeniden deneyin.';
  if (code.includes('user-token-expired')) return 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
  if (code.includes('credential-already-in-use')) return 'Bu hesap bilgisi başka bir kullanıcı tarafından kullanılıyor.';
  if (code.includes('operation-not-allowed')) {
    return 'Firebase Console üzerinden Google giriş sağlayıcısını aktif etmelisin.';
  }
  if (code.includes('configuration-not-found')) {
    return 'Firebase Authentication kurulumu bulunamadı. Firebase Console > Authentication bölümünü açıp Email/Password etkinleştir.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'Bu domain Firebase Authentication için yetkili değil. Firebase Console > Authentication > Settings > Authorized domains kısmına domaini eklemelisin.';
  }
  if (code.includes('too-many-requests')) return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (code.includes('network-request-failed')) return 'Firebase bağlantısı kurulamadı.';
  if (code.includes('account-disabled-by-admin')) {
    return 'Bu hesap admin tarafından pasifleştirilmiştir. Giriş yapamazsınız.';
  }
  if (code.includes('permission-denied')) {
    return 'Firebase Firestore users koleksiyonuna yazma izni vermiyor. Rules ayarlarını kontrol et.';
  }
  if (code.includes('Mevcut şifre hatalı')) return 'Mevcut şifren hatalı. Doğru şifreni gir.';

  return `İşlem tamamlanamadı. Firebase hata kodu: ${code || 'bilinmiyor'}`;
};
