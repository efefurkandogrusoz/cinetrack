const REMEMBERED_ACCOUNTS_KEY = 'cinetrack_remembered_accounts';

export const getRememberedAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS_KEY) || '[]');
  } catch (error) {
    console.error('Error reading remembered accounts:', error);
    return [];
  }
};

export const rememberAccount = ({ email, displayName }) => {
  if (!email) return;

  const accounts = getRememberedAccounts();
  const normalizedEmail = email.toLowerCase();
  const nextAccount = {
    email: normalizedEmail,
    displayName: displayName || normalizedEmail.split('@')[0],
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
