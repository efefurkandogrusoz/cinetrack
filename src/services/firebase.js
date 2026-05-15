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
  updateProfile,
  setPersistence,
  inMemoryPersistence,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBhImB694lNfX1-Iqz4tA30RDNYV-gQ4DE",
    authDomain: "film-takip-d93f9.firebaseapp.com",
    projectId: "film-takip-d93f9",
    storageBucket: "film-takip-d93f9.firebasestorage.app",
    messagingSenderId: "230298985707",
    appId: "1:230298985707:web:f3408817a4097cab2f0aae"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
const authPersistenceReady = setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

// Firestore Movies Collection
const MOVIES_COLLECTION = 'movies';
const USERS_COLLECTION = 'users';

const saveUserProfile = async (user, extra = {}) => {
  const displayName = extra.displayName || user.displayName || user.email?.split('@')[0] || 'Kullanici';

  await setDoc(doc(db, USERS_COLLECTION, user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: user.photoURL || null,
    provider: 'password',
    updatedAt: serverTimestamp(),
    ...extra,
  }, { merge: true });
};

// Add movie to Firestore
export const addMovie = async (movie) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be signed in to add movies');

    const docRef = await addDoc(collection(db, MOVIES_COLLECTION), {
      ...movie,
      userId: user.uid,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { ...movie, userId: user.uid, docId: docRef.id };
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
    const querySnapshot = await getDocs(moviesQuery);
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
    await updateDoc(doc(db, MOVIES_COLLECTION, docId), {
      ...updates,
      updated_at: new Date(),
    });
  } catch (error) {
    console.error('Error updating movie:', error);
    throw error;
  }
};

// Auth functions
export const registerUser = async (email, password, displayName = '') => {
  try {
    await authPersistenceReady;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const cleanDisplayName = displayName.trim() || email.split('@')[0];
    await updateProfile(userCredential.user, { displayName: cleanDisplayName });
    await saveUserProfile(userCredential.user, {
      displayName: cleanDisplayName,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    return userCredential.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    await authPersistenceReady;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(userCredential.user, {
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
    const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
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
};
