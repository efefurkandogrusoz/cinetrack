import {
  Camera,
  Clapperboard,
  Crown,
  Film,
  Flame,
  Heart,
  Popcorn,
  Sparkles,
  Star,
  Trophy,
  Tv,
  User,
} from 'lucide-react';

export const DEFAULT_PROFILE_AVATAR_ID = 'cinema-red';
export const DEFAULT_PROFILE_AVATAR = DEFAULT_PROFILE_AVATAR_ID;
export const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_SIZE = 300;

export const avatarOptions = [
  {
    id: 'cinema-red',
    label: 'Sinema',
    icon: Clapperboard,
    gradient: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
  },
  {
    id: 'popcorn-gold',
    label: 'Popcorn',
    icon: Popcorn,
    gradient: 'linear-gradient(135deg, #f59e0b, #7c2d12)',
  },
  {
    id: 'star-purple',
    label: 'Yıldız',
    icon: Star,
    gradient: 'linear-gradient(135deg, #a855f7, #312e81)',
  },
  {
    id: 'movie-blue',
    label: 'Film',
    icon: Film,
    gradient: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
  },
  {
    id: 'crown-dark',
    label: 'Kral',
    icon: Crown,
    gradient: 'linear-gradient(135deg, #facc15, #451a03)',
  },
  {
    id: 'camera-teal',
    label: 'Kamera',
    icon: Camera,
    gradient: 'linear-gradient(135deg, #14b8a6, #0f172a)',
  },
  {
    id: 'tv-night',
    label: 'Ekran',
    icon: Tv,
    gradient: 'linear-gradient(135deg, #38bdf8, #1e1b4b)',
  },
  {
    id: 'spark-rose',
    label: 'Parıltı',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #fb7185, #831843)',
  },
  {
    id: 'flame-orange',
    label: 'Alev',
    icon: Flame,
    gradient: 'linear-gradient(135deg, #fb923c, #991b1b)',
  },
  {
    id: 'user-slate',
    label: 'Profil',
    icon: User,
    gradient: 'linear-gradient(135deg, #f8fafc, #3f3f46)',
  },
  {
    id: 'trophy-crimson',
    label: 'Ödül',
    icon: Trophy,
    gradient: 'linear-gradient(135deg, #f43f5e, #7f1d1d)',
  },
  {
    id: 'heart-rose',
    label: 'Favori',
    icon: Heart,
    gradient: 'linear-gradient(135deg, #fb7185, #be123c)',
  },
];

export const PROFILE_AVATARS = avatarOptions;

const avatarIds = new Set(avatarOptions.map(option => option.id));

const LEGACY_PRESET_ID_MAP = {
  clapper: 'cinema-red',
  popcorn: 'popcorn-gold',
  star: 'star-purple',
  camera: 'camera-teal',
  crown: 'crown-dark',
  cool: 'movie-blue',
  fire: 'flame-orange',
  brain: 'spark-rose',
  cat: 'user-slate',
  wolf: 'trophy-crimson',
  'film-noir': 'movie-blue',
  'royal-premiere': 'crown-dark',
  'tv-blue': 'tv-night',
  'letter-initial': 'user-slate',
  'minimal-user': 'user-slate',
  'indie-director': 'trophy-crimson',
};

const LEGACY_EMOJIS = new Set(['🎬', '🍿', '⭐', '🎥', '👑', '😎', '🔥', '🧠', '🐱', '🐺']);

export const getProfileAvatar = (avatar) => {
  if (avatarIds.has(avatar)) return avatar;
  if (LEGACY_PRESET_ID_MAP[avatar]) return LEGACY_PRESET_ID_MAP[avatar];
  if (LEGACY_EMOJIS.has(avatar)) return DEFAULT_PROFILE_AVATAR_ID;
  return DEFAULT_PROFILE_AVATAR_ID;
};

export const getProfileAvatarOption = (avatar) => (
  avatarOptions.find(option => option.id === getProfileAvatar(avatar)) ||
  avatarOptions[0]
);

export const hasProfileAvatarUpdate = (profile = {}) => (
  (
    Object.prototype.hasOwnProperty.call(profile, 'avatarType') &&
    profile.avatarType !== undefined
  ) ||
  (
    Object.prototype.hasOwnProperty.call(profile, 'avatarId') &&
    profile.avatarId !== undefined
  ) ||
  (
    Object.prototype.hasOwnProperty.call(profile, 'avatarUrl') &&
    profile.avatarUrl !== undefined
  ) ||
  (
    Object.prototype.hasOwnProperty.call(profile, 'avatar') &&
    profile.avatar !== undefined
  )
);

export const normalizeProfileAvatarFields = (profile = {}) => {
  if (profile.avatarType === 'image' && profile.avatarUrl) {
    return {
      avatarType: 'image',
      avatarId: null,
      avatarUrl: profile.avatarUrl,
      avatar: null,
    };
  }

  const avatarId = getProfileAvatar(profile.avatarId ?? profile.avatar);

  return {
    avatarType: 'preset',
    avatarId,
    avatarUrl: null,
    avatar: avatarId,
  };
};
