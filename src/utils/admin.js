export const ADMIN_EMAIL = 'admin@gmail.com';

export const isAdminProfile = (profile) => profile?.role === 'admin';

export const formatAdminDate = (value) => {
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : value
        ? new Date(value)
        : null;

  if (!date || Number.isNaN(date.getTime())) return 'Tarih yok';

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const reportReasons = [
  'Spoiler',
  'Hakaret / küfür',
  'Spam',
  'Uygunsuz içerik',
  'Diğer',
];
