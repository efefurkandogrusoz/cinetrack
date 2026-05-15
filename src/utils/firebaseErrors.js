export const getFirebaseMessage = (error) => {
  const code = error?.code || '';

  if (code.includes('invalid-email')) return 'E-posta formati hatali.';
  if (code.includes('missing-password')) return 'Sifre alani bos birakilamaz.';
  if (code.includes('invalid-credential')) return 'E-posta veya sifre hatali.';
  if (code.includes('user-not-found')) return 'Bu e-posta ile kayitli kullanici yok.';
  if (code.includes('wrong-password')) return 'Sifre hatali.';
  if (code.includes('email-already-in-use')) return 'Bu e-posta zaten kayitli.';
  if (code.includes('weak-password')) return 'Sifre en az 6 karakter olmali.';
  if (code.includes('operation-not-allowed')) {
    return 'Firebase Authentication icinde Email/Password giris yontemini aktif etmelisin.';
  }
  if (code.includes('configuration-not-found')) {
    return 'Firebase Authentication kurulumu bulunamadi. Firebase Console > Authentication bolumunu acip Email/Password etkinlestir.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'Bu localhost/domain Firebase Authentication icin yetkili degil. Authorized domains listesine eklemelisin.';
  }
  if (code.includes('too-many-requests')) return 'Cok fazla deneme yapildi. Biraz bekleyip tekrar dene.';
  if (code.includes('network-request-failed')) return 'Firebase baglantisi kurulamadi.';
  if (code.includes('permission-denied')) {
    return 'Firebase Firestore users koleksiyonuna yazma izni vermiyor. Rules ayarlarini kontrol et.';
  }

  return `Islem tamamlanamadi. Firebase hata kodu: ${code || 'bilinmiyor'}`;
};
