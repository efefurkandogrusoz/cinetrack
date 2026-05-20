import {
  DEFAULT_PROFILE_AVATAR,
  hasProfileAvatarUpdate,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';

const REMEMBERED_ACCOUNTS_KEY = 'cinetrack_remembered_accounts';

export const getRememberedAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS_KEY) || '[]')
      .map(account => ({
        ...account,
        ...normalizeProfileAvatarFields(account),
      }));
  } catch (error) {
    console.error('Error reading remembered accounts:', error);
    return [];
  }
};

export const rememberAccount = ({ email, displayName, avatar, avatarType, avatarId, avatarUrl }) => {
  if (!email) return;

  const accounts = getRememberedAccounts();
  const normalizedEmail = email.toLowerCase();
  const avatarUpdate = {
    avatar,
    avatarType,
    avatarId,
    avatarUrl,
  };
  const existingAccount = accounts.find(account => account.email === normalizedEmail);
  const avatarFields = normalizeProfileAvatarFields(
    hasProfileAvatarUpdate(avatarUpdate)
      ? avatarUpdate
      : existingAccount || { avatar: DEFAULT_PROFILE_AVATAR },
  );
  const nextAccount = {
    email: normalizedEmail,
    displayName: displayName || normalizedEmail.split('@')[0],
    ...avatarFields,
    rememberedAt: new Date().toISOString(),
  };

  const nextAccounts = [
    nextAccount,
    ...accounts.filter(account => account.email !== normalizedEmail),
  ].slice(0, 5);

  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
};

export const forgetAccount = (email) => {
  const normalizedEmail = email.toLowerCase();
  const accounts = getRememberedAccounts()
    .filter(account => account.email !== normalizedEmail);

  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const updateRememberedAccount = (previousEmail, {
  email,
  displayName,
  avatar,
  avatarType,
  avatarId,
  avatarUrl,
}) => {
  const normalizedPrevious = previousEmail?.toLowerCase();
  const accounts = getRememberedAccounts();
  const exists = accounts.some(account => account.email === normalizedPrevious);

  if (!exists) return;

  const normalizedEmail = email?.toLowerCase() || normalizedPrevious;
  const avatarUpdate = {
    avatar,
    avatarType,
    avatarId,
    avatarUrl,
  };
  const existingAccount = accounts.find(account => account.email === normalizedPrevious);
  const avatarFields = normalizeProfileAvatarFields(
    hasProfileAvatarUpdate(avatarUpdate)
      ? avatarUpdate
      : existingAccount || { avatar: DEFAULT_PROFILE_AVATAR },
  );
  const nextAccounts = [
    {
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      ...avatarFields,
      rememberedAt: new Date().toISOString(),
    },
    ...accounts.filter(account => account.email !== normalizedPrevious && account.email !== normalizedEmail),
  ].slice(0, 5);

  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
};
