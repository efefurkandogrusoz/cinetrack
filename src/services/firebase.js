import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  DEFAULT_PROFILE_AVATAR,
  hasProfileAvatarUpdate,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';

const requiredFirebaseEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingFirebaseEnvKeys = requiredFirebaseEnvKeys.filter(key => !import.meta.env[key]);

if (missingFirebaseEnvKeys.length > 0) {
  console.warn(
    `Firebase yapılandırması eksik: ${missingFirebaseEnvKeys.join(', ')}. Lütfen .env dosyasını .env.example üzerinden doldurun.`
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

const setAuthPersistence = async (rememberSession = true) => {
  await authPersistenceReady;
  await setPersistence(
    auth,
    rememberSession ? browserLocalPersistence : browserSessionPersistence
  );
};

// Firestore Movies Collection
const MOVIES_COLLECTION = 'movies';
const USERS_COLLECTION = 'users';

const getAuthCreatedAt = (user) => {
  const creationTime = user?.metadata?.creationTime;
  if (creationTime) return creationTime;

  const createdAtMs = Number(user?.metadata?.createdAt);
  if (Number.isFinite(createdAtMs) && createdAtMs > 0) {
    return new Date(createdAtMs).toISOString();
  }

  return null;
};

const saveUserProfile = async (user, extra = {}) => {
  const displayName = extra.displayName || user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
  const createdAt = extra.createdAt ?? getAuthCreatedAt(user);
  const profileData = {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: user.photoURL || null,
    provider: 'password',
    updatedAt: serverTimestamp(),
    ...extra,
  };

  if (createdAt && profileData.createdAt === undefined) {
    profileData.createdAt = createdAt;
  }

  if (hasProfileAvatarUpdate(extra)) {
    Object.assign(profileData, normalizeProfileAvatarFields(extra));
  }

  await setDoc(doc(db, USERS_COLLECTION, user.uid), profileData, { merge: true });
};

const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const saveUserProfileSafely = (user, extra = {}) => {
  saveUserProfile(user, extra).catch((error) => {
    console.warn('User profile could not be synced:', error);
  });
};

export const syncCurrentUserProfileMetadata = (user) => {
  const createdAt = getAuthCreatedAt(user);
  if (!user || !createdAt) return;

  saveUserProfileSafely(user, { createdAt });
};

// Add movie to Firestore
export const addMovie = async (movie) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be signed in to add movies');

    const now = new Date();
    const createdAt = movie.createdAt || movie.created_at || now;
    const updatedAt = movie.updatedAt || movie.updated_at || now;
    const movieRecord = {
      ...movie,
      userId: user.uid,
      createdAt,
      created_at: createdAt,
      updatedAt,
      updated_at: updatedAt,
    };

    const docRef = await addDoc(collection(db, MOVIES_COLLECTION), movieRecord);
    return { ...movieRecord, docId: docRef.id };
  } catch (error) {
    console.error('Error adding movie:', error);
    throw error;
  }
};

// Get all movies from Firestore
export const getAllMovies = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const moviesQuery = query(
      collection(db, MOVIES_COLLECTION),
      where('userId', '==', user.uid)
    );
    const querySnapshot = await withTimeout(
      getDocs(moviesQuery),
      5000,
      'Movies request timed out'
    );
    return querySnapshot.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting movies:', error);
    return [];
  }
};

// Delete movie from Firestore
export const deleteMovie = async (docId) => {
  try {
    await deleteDoc(doc(db, MOVIES_COLLECTION, docId));
  } catch (error) {
    console.error('Error deleting movie:', error);
    throw error;
  }
};

// Update movie watch status
export const updateMovieStatus = async (docId, updates) => {
  try {
    const now = new Date();
    await updateDoc(doc(db, MOVIES_COLLECTION, docId), {
      ...updates,
      updatedAt: updates.updatedAt || now,
      updated_at: updates.updated_at || now,
    });
  } catch (error) {
    console.error('Error updating movie:', error);
    throw error;
  }
};

// Auth functions
export const registerUser = async (email, password, displayName = '', rememberSession = true) => {
  try {
    await setAuthPersistence(rememberSession);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const cleanDisplayName = displayName.trim() || email.split('@')[0];
    updateProfile(userCredential.user, { displayName: cleanDisplayName }).catch((error) => {
      console.warn('Display name could not be synced:', error);
    });
    saveUserProfileSafely(userCredential.user, {
      displayName: cleanDisplayName,
      avatarType: 'preset',
      avatarId: DEFAULT_PROFILE_AVATAR,
      avatarUrl: null,
      avatar: DEFAULT_PROFILE_AVATAR,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    return userCredential.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password, rememberSession = true) => {
  try {
    await setAuthPersistence(rememberSession);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    saveUserProfileSafely(userCredential.user, {
      createdAt: getAuthCreatedAt(userCredential.user),
      lastLoginAt: serverTimestamp(),
    });
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

export const onUserStateChanged = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserProfile = async (uid) => {
  try {
    const snapshot = await withTimeout(
      getDoc(doc(db, USERS_COLLECTION, uid)),
      4000,
      'User profile request timed out'
    );
    if (!snapshot.exists()) return null;

    const profile = snapshot.data();
    return {
      ...profile,
      ...normalizeProfileAvatarFields(profile),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateAccountSettings = async ({
  displayName,
  email,
  password,
  profileNote,
  currentPassword,
  avatar,
  avatarType,
  avatarId,
  avatarUrl,
}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to update account settings');

  // E-posta veya şifre değiştirilecekse, yeniden doğrulama gerekiyor
  if ((email && email.trim().toLowerCase() !== user.email) || password?.trim()) {
    if (!currentPassword?.trim()) {
      throw new Error('require-reauthentication');
    }
    
    // Kullanıcıyı yeniden doğrula
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    try {
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      console.error('Reauthentication failed:', error);
      throw new Error('Mevcut şifre hatalı.', { cause: error });
    }
  }

  const cleanDisplayName = displayName?.trim() || user.displayName || user.email?.split('@')[0] || 'Kullanıcı';
  const cleanEmail = email?.trim().toLowerCase() || user.email;
  const cleanProfileNote = profileNote?.trim() || '';
  const avatarUpdates = { avatar, avatarType, avatarId, avatarUrl };
  const cleanAvatarFields = hasProfileAvatarUpdate(avatarUpdates)
    ? normalizeProfileAvatarFields(avatarUpdates)
    : null;

  // displayName güncellemesi (non-sensitive)
  if (cleanDisplayName && cleanDisplayName !== user.displayName) {
    try {
      await updateProfile(user, { displayName: cleanDisplayName });
    } catch (error) {
      console.error('Error updating display name:', error);
      throw error;
    }
  }

  // E-posta güncellemesi (sensitive - sırayla yapılmalı)
  if (cleanEmail && cleanEmail !== user.email) {
    try {
      await updateEmail(user, cleanEmail);
    } catch (error) {
      console.error('Error updating email:', error);
      throw error;
    }
  }

  // Şifre güncellemesi (sensitive - sırayla yapılmalı)
  if (password?.trim()) {
    try {
      await updatePassword(user, password.trim());
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  // Firestore'a profil kaydet
  try {
    const profileUpdates = {
      displayName: cleanDisplayName,
      email: cleanEmail,
      profileNote: cleanProfileNote,
      updatedAt: serverTimestamp(),
    };

    if (cleanAvatarFields) {
      Object.assign(profileUpdates, cleanAvatarFields);
    }

    await saveUserProfile(user, profileUpdates);
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }

  return {
    uid: user.uid,
    email: cleanEmail,
    displayName: cleanDisplayName,
    photoURL: user.photoURL || null,
    provider: 'password',
    profileNote: cleanProfileNote,
    ...(cleanAvatarFields || normalizeProfileAvatarFields({ avatar: DEFAULT_PROFILE_AVATAR })),
  };
};

export default {
  addMovie,
  getAllMovies,
  deleteMovie,
  updateMovieStatus,
  registerUser,
  loginUser,
  logoutUser,
  onUserStateChanged,
  getUserProfile,
  syncCurrentUserProfileMetadata,
  updateAccountSettings,
};
