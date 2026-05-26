export const announcementTypeLabels = {
  info: 'Bilgi',
  warning: 'Uyarı',
  feature: 'Yeni özellik',
  maintenance: 'Bakım',
};

export const notificationTypeLabels = {
  info: 'Bilgi',
  warning: 'Uyarı',
  system: 'Sistem',
  feature: 'Yeni özellik',
  account: 'Hesap uyarısı',
};

export const targetAudienceLabels = {
  all: 'Tüm kullanıcılar',
  authenticated: 'Giriş yapan kullanıcılar',
  admins: 'Adminler',
};

export const getDateValue = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
};

export const isWithinDateRange = (item, now = Date.now()) => {
  const start = getDateValue(item?.startDate);
  const end = getDateValue(item?.endDate);

  return (!start || start <= now) && (!end || end >= now);
};

export const isAudienceMatch = (targetAudience, { user, isAdmin }) => {
  if (targetAudience === 'admins') return Boolean(user && isAdmin);
  if (targetAudience === 'authenticated') return Boolean(user);
  return true;
};

export const isActiveAudienceItem = (item, audience) => (
  item?.isActive !== false &&
  isWithinDateRange(item) &&
  isAudienceMatch(item.targetAudience || item.targetType || 'all', audience)
);

export const toDateInputValue = (value) => {
  const time = getDateValue(value);
  if (!time) return '';

  const date = new Date(time);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
};
