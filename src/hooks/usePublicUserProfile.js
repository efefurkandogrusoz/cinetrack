import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_PROFILE_AVATAR, normalizeProfileAvatarFields } from '../constants/profileAvatars';
import { db } from '../services/firebase';

const profileCache = new Map();

const buildPublicProfile = (userId, profile, fallback = {}) => {
  const source = profile || fallback || {};
  const avatarSource = profile || fallback || {
    avatarType: 'preset',
    avatarId: DEFAULT_PROFILE_AVATAR,
    avatar: DEFAULT_PROFILE_AVATAR,
  };

  return {
    uid: userId,
    ...source,
    displayName:
      source.displayName ||
      fallback.displayName ||
      fallback.username ||
      'CineTrack kullanıcısı',
    createdAt: source.createdAt || source.created_at || fallback.createdAt || fallback.created_at || null,
    ...normalizeProfileAvatarFields(avatarSource),
  };
};

export const usePublicUserProfile = (userId, fallback = {}) => {
  const fallbackDisplayName = fallback.displayName;
  const fallbackUsername = fallback.username;
  const fallbackProfileNote = fallback.profileNote;
  const fallbackCreatedAt = fallback.createdAt;
  const fallbackCreatedAtLegacy = fallback.created_at;
  const fallbackAvatarType = fallback.avatarType;
  const fallbackAvatarId = fallback.avatarId;
  const fallbackAvatarUrl = fallback.avatarUrl;
  const fallbackAvatar = fallback.avatar;
  const stableFallback = useMemo(() => ({
    displayName: fallbackDisplayName,
    username: fallbackUsername,
    profileNote: fallbackProfileNote,
    createdAt: fallbackCreatedAt,
    created_at: fallbackCreatedAtLegacy,
    avatarType: fallbackAvatarType,
    avatarId: fallbackAvatarId,
    avatarUrl: fallbackAvatarUrl,
    avatar: fallbackAvatar,
  }), [
    fallbackAvatar,
    fallbackAvatarId,
    fallbackAvatarType,
    fallbackAvatarUrl,
    fallbackCreatedAt,
    fallbackCreatedAtLegacy,
    fallbackDisplayName,
    fallbackProfileNote,
    fallbackUsername,
  ]);
  const initialProfile = useMemo(
    () => buildPublicProfile(userId, profileCache.get(userId), stableFallback),
    [stableFallback, userId],
  );
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    if (!userId) return undefined;

    return onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        const nextProfile = snapshot.exists() ? snapshot.data() : null;

        if (nextProfile) {
          profileCache.set(userId, nextProfile);
        } else {
          profileCache.delete(userId);
        }

        setProfile(buildPublicProfile(userId, nextProfile, stableFallback));
      },
      (error) => {
        console.warn('User profile could not be loaded:', error);
        setProfile(buildPublicProfile(userId, null, stableFallback));
      },
    );
  }, [stableFallback, userId]);

  return profile;
};

export default usePublicUserProfile;
