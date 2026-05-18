// Local Storage Service with Firestore fallback
// Handles data persistence with automatic sync between localStorage and Firestore

const STORAGE_KEY = 'cinetrack_movies';

const getStorageKey = (userId = 'guest') => `${STORAGE_KEY}_${userId}`;

const getDateTime = (value) => {
  if (!value) return 0;

  if (typeof value?.toDate === 'function') {
    const time = value.toDate().getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;

    if (typeof seconds === 'number') {
      return (seconds * 1000) + Math.floor(nanoseconds / 1000000);
    }
  }

  return 0;
};

const getUpdatedTime = (movie) => Math.max(
  getDateTime(movie.updatedAt),
  getDateTime(movie.updated_at),
  getDateTime(movie.createdAt),
  getDateTime(movie.created_at),
);

// Save movies to localStorage
export const saveMoviesToLocal = (movies, userId) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(movies));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Get movies from localStorage
export const getMoviesFromLocal = (userId) => {
  try {
    const data = localStorage.getItem(getStorageKey(userId));
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};

// Clear localStorage
export const clearLocal = (userId) => {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

// Sync local data with Firestore (for offline-first approach)
export const syncWithFirebase = async (firebaseMovies, userId) => {
  try {
    const localMovies = getMoviesFromLocal(userId);
    
    // Merge: prefer newer updates
    const merged = [...firebaseMovies];
    
    for (const localMovie of localMovies) {
      const existingIndex = merged.findIndex(m => m.id === localMovie.id);
      if (existingIndex === -1) {
        merged.push(localMovie);
      } else if (getUpdatedTime(localMovie) > getUpdatedTime(merged[existingIndex])) {
        merged[existingIndex] = localMovie;
      }
    }
    
    saveMoviesToLocal(merged, userId);
    return merged;
  } catch (error) {
    console.error('Error syncing with Firebase:', error);
    return getMoviesFromLocal(userId);
  }
};

// Check if browser is online
export const isOnline = () => {
  return navigator.onLine;
};

export default {
  saveMoviesToLocal,
  getMoviesFromLocal,
  clearLocal,
  syncWithFirebase,
  isOnline,
};
