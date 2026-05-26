export const DISABLED_ACCOUNT_ERROR_CODE = 'auth/account-disabled-by-admin';
export const DISABLED_ACCOUNT_MESSAGE = 'Bu hesap admin tarafından pasifleştirilmiştir. Giriş yapamazsınız.';

const inactiveStatuses = new Set([
  'disabled',
  'inactive',
  'passive',
  'pasif',
]);

export const isInactiveUserProfile = (profile) => {
  if (!profile) return false;

  const status = String(profile.status || '').trim().toLowerCase();

  return profile.disabled === true ||
    profile.isActive === false ||
    inactiveStatuses.has(status);
};

export const createDisabledAccountError = () => {
  const error = new Error(DISABLED_ACCOUNT_MESSAGE);
  error.code = DISABLED_ACCOUNT_ERROR_CODE;
  return error;
};
