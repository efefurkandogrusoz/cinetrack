/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import * as firebaseService from '../services/firebase';
import * as storageService from '../services/storage';
import {
  getMediaKey,
  getNextEpisodeProgress,
  isTvShow,
  normalizeMediaItem,
  normalizeTvTracking,
} from '../utils/media';
import {
  DEFAULT_PROFILE_AVATAR,
  hasProfileAvatarUpdate,
  normalizeProfileAvatarFields,
} from '../constants/profileAvatars';

export const MovieContext = createContext();

export const themeOptions = [
  { id: 'crimson', name: 'Klasik Kırmızı', color: '#e50914' },
  { id: 'amber', name: 'Altın Sarısı', color: '#f5b301' },
  { id: 'emerald', name: 'Zümrüt Yeşili', color: '#20c997' },
  { id: 'sapphire', name: 'Sinematik Mavi', color: '#3b82f6' },
  { id: 'violet', name: 'Gece Moru', color: '#8b5cf6' },
  { id: 'rose', name: 'Neon Pembe', color: '#f43f5e' },
];

const defaultTheme = 'crimson';

const getStoredTheme = () => {
  if (typeof window === 'undefined') return defaultTheme;

  const storedTheme = window.localStorage.getItem('cinetrack-theme');
  return themeOptions.some(theme => theme.id === storedTheme) ? storedTheme : defaultTheme;
};

const initialState = {
  movies: [],
  filter: 'all', // 'all', 'watched', 'watchlist'
  searchResults: [],
  loading: false,
  moviesReady: false,
  error: null,
  user: null,
  userProfile: null,
  authReady: false,
  theme: getStoredTheme(),
};

const RECENT_MOVIES_LIMIT = 5;

const getDateTime = (value) => {
  if (!value) return 0;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value?.toDate === 'function') {
    const time = value.toDate().getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  if (typeof value === 'number') {
    return value;
  }

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

const getSortDateTime = (movie, fields) => {
  for (const field of fields) {
    const time = getDateTime(movie[field]);
    if (time > 0) return time;
  }

  return 0;
};

const getRecentMovies = (movies, predicate, dateFields) => (
  movies
    .map((movie, index) => ({
      movie,
      index,
      time: getSortDateTime(movie, dateFields),
    }))
    .filter(({ movie }) => predicate(movie))
    .sort((a, b) => (b.time - a.time) || (b.index - a.index))
    .slice(0, RECENT_MOVIES_LIMIT)
    .map(({ movie }) => movie)
);

const findMedia = (movies, media) => movies.some(movie => getMediaKey(movie) === getMediaKey(media));

const movieReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MOVIES':
      return { ...state, movies: action.payload.map(normalizeMediaItem), moviesReady: true, error: null };
    
    case 'ADD_MOVIE':
      if (findMedia(state.movies, action.payload)) {
        return state;
      }
      return { ...state, movies: [...state.movies, normalizeMediaItem(action.payload)] };
    
    case 'DELETE_MOVIE':
      return {
        ...state,
        movies: state.movies.filter(m => m.docId !== action.payload),
      };
    
    case 'UPDATE_MOVIE':
      return {
        ...state,
        movies: state.movies.map(m =>
          m.docId === action.payload.docId ? normalizeMediaItem({ ...m, ...action.payload }) : m
        ),
      };
    
    case 'SET_FILTER':
      return { ...state, filter: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload
          ? { ...action.payload, ...normalizeProfileAvatarFields(action.payload) }
          : null,
      };

    case 'SET_AUTH_READY':
      return { ...state, authReady: action.payload };

    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
};

export const MovieProvider = ({ children }) => {
  const [state, dispatch] = useReducer(movieReducer, initialState);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    window.localStorage.setItem('cinetrack-theme', state.theme);
  }, [state.theme]);

  const loadMovies = useCallback(async (useFirebase = Boolean(firebaseService.auth.currentUser)) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!useFirebase) {
        dispatch({ type: 'SET_MOVIES', payload: storageService.getMoviesFromLocal() });
        return;
      }

      const user = firebaseService.auth.currentUser;
      if (!user) {
        dispatch({ type: 'SET_MOVIES', payload: [] });
        return;
      }

      // Try to get from Firebase first
      const firebaseMovies = await firebaseService.getAllMovies();

      // Sync with local storage
      const syncedMovies = await storageService.syncWithFirebase(firebaseMovies, user.uid);

      dispatch({ type: 'SET_MOVIES', payload: syncedMovies });
    } catch (error) {
      console.error('Error loading movies:', error);
      // Fallback to local storage
      const localMovies = storageService.getMoviesFromLocal(firebaseService.auth.currentUser?.uid);
      dispatch({ type: 'SET_MOVIES', payload: localMovies });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to sync with server, using local data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load movies on mount
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = firebaseService.onUserStateChanged((user) => {
      dispatch({ type: 'SET_USER', payload: user });
      dispatch({ type: 'SET_AUTH_READY', payload: true });

      if (user) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
            profileNote: '',
            avatarType: 'preset',
            avatarId: DEFAULT_PROFILE_AVATAR,
            avatarUrl: null,
            avatar: DEFAULT_PROFILE_AVATAR,
          },
        });

        firebaseService.getUserProfile(user.uid).then((profile) => {
          if (profile) {
            dispatch({ type: 'SET_USER_PROFILE', payload: profile });
          }
        });

        loadMovies(true);
      } else {
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
        loadMovies(false);
      }
    });

    return () => unsubscribe();
  }, [loadMovies]);

  // Sync local storage
  useEffect(() => {
    if (state.authReady && state.moviesReady) {
      storageService.saveMoviesToLocal(state.movies, state.user?.uid);
    }
  }, [state.authReady, state.movies, state.moviesReady, state.user]);

  const addMovie = useCallback(async (movieData) => {
    const normalizedInput = normalizeMediaItem(movieData);

    if (findMedia(state.movies, normalizedInput)) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const now = new Date();
      const mediaType = normalizedInput.mediaType;
      const watchStatus = normalizedInput.watchStatus;
      const tvTracking = isTvShow(normalizedInput) ? normalizeTvTracking(normalizedInput) : null;
      const isWatched = isTvShow(normalizedInput)
        ? tvTracking.watchStatus === 'completed'
        : Boolean(normalizedInput.watched) || watchStatus === 'watched';
      const isFavorite = Boolean(normalizedInput.favorite);
      const createdAt = movieData.createdAt || movieData.created_at || now;
      const updatedAt = movieData.updatedAt || movieData.updated_at || now;
      const watchedAt = isWatched
        ? movieData.watchedAt || movieData.watched_at || now
        : null;
      const favoriteAt = isFavorite
        ? movieData.favoriteAt || movieData.favorite_at || now
        : null;

      const newMovie = {
        id: normalizedInput.id,
        mediaType,
        title: normalizedInput.title,
        poster: normalizedInput.poster || null,
        posterPath: normalizedInput.posterPath || null,
        poster_path: normalizedInput.poster_path || normalizedInput.posterPath || null,
        year: normalizedInput.year || 'N/A',
        releaseDate: normalizedInput.releaseDate || '',
        release_date: normalizedInput.release_date || normalizedInput.releaseDate,
        firstAirDate: normalizedInput.firstAirDate || '',
        first_air_date: normalizedInput.first_air_date || normalizedInput.firstAirDate || '',
        genre_ids: normalizedInput.genre_ids || [],
        genres: normalizedInput.genres || [],
        backdrop: normalizedInput.backdrop || null,
        backdropPath: normalizedInput.backdropPath || null,
        backdrop_path: normalizedInput.backdrop_path || normalizedInput.backdropPath || null,
        trailerKey: normalizedInput.trailerKey || null,
        runtime: normalizedInput.runtime || null,
        watched: isWatched,
        favorite: isFavorite,
        isFavorite,
        watchStatus: tvTracking?.watchStatus || watchStatus,
        reaction: normalizedInput.reaction || null,
        rating: normalizedInput.rating || normalizedInput.voteAverage || 0,
        voteAverage: normalizedInput.voteAverage || normalizedInput.rating || 0,
        overview: normalizedInput.overview || '',
        currentSeason: tvTracking?.currentSeason || normalizedInput.currentSeason,
        currentEpisode: tvTracking?.currentEpisode || normalizedInput.currentEpisode,
        watchedEpisodes: tvTracking?.watchedEpisodes || normalizedInput.watchedEpisodes,
        totalWatchedEpisodes: tvTracking?.totalWatchedEpisodes || normalizedInput.totalWatchedEpisodes,
        progressPercent: tvTracking?.progressPercent || normalizedInput.progressPercent,
        totalSeasons: normalizedInput.totalSeasons,
        totalEpisodes: normalizedInput.totalEpisodes,
        seasonEpisodeCounts: normalizedInput.seasonEpisodeCounts,
        status: normalizedInput.status || null,
        watchedAt,
        watched_at: watchedAt,
        favoriteAt,
        favorite_at: favoriteAt,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
      };

      // Try to add to Firebase first
      if (state.user) {
        const result = await firebaseService.addMovie(newMovie);
        dispatch({ type: 'ADD_MOVIE', payload: result });
      } else {
        // Offline: add to local only
        const movieWithDocId = { ...newMovie, docId: `local_${Date.now()}` };
        dispatch({ type: 'ADD_MOVIE', payload: movieWithDocId });
      }
    } catch (error) {
      console.error('Error adding movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const deleteMovie = useCallback(async (docId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (state.user) {
        await firebaseService.deleteMovie(docId);
      }
      dispatch({ type: 'DELETE_MOVIE', payload: docId });
    } catch (error) {
      console.error('Error deleting movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user]);

  const toggleWatched = useCallback(async (docId, currentStatus) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const now = new Date();
      const movie = state.movies.find(m => (m.docId || m.id) === docId);
      const newStatus = !currentStatus;
      const updates = {
        watched: newStatus,
        watchStatus: isTvShow(movie) ? (newStatus ? 'completed' : 'watchlist') : (newStatus ? 'watched' : 'watchlist'),
        watchedAt: newStatus ? now : null,
        watched_at: newStatus ? now : null,
        updatedAt: now,
        updated_at: now,
      };

      if (state.user) {
        await firebaseService.updateMovieStatus(docId, updates);
      }
      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, ...updates } });
    } catch (error) {
      console.error('Error updating movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const toggleFavorite = useCallback(async (docId, currentStatus) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const now = new Date();
      const newStatus = !currentStatus;
      const updates = {
        favorite: newStatus,
        isFavorite: newStatus,
        favoriteAt: newStatus ? now : null,
        favorite_at: newStatus ? now : null,
        updatedAt: now,
        updated_at: now,
      };

      if (state.user) {
        await firebaseService.updateMovieStatus(docId, updates);
      }
      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, ...updates } });
    } catch (error) {
      console.error('Error updating movie:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.user]);

  const setReaction = useCallback(async (docId, reaction) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const now = new Date();
      const movie = state.movies.find(m => (m.docId || m.id) === docId);
      const nextReaction = movie?.reaction === reaction ? null : reaction;
      const updates = {
        reaction: nextReaction,
        watched: true,
        updatedAt: now,
        updated_at: now,
      };

      if (!movie?.watched || getDateTime(movie?.watchedAt || movie?.watched_at) === 0) {
        updates.watchedAt = now;
        updates.watched_at = now;
      }

      if (state.user) {
        await firebaseService.updateMovieStatus(docId, updates);
      }

      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, ...updates } });
    } catch (error) {
      console.error('Error updating reaction:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update movie reaction' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const updateMediaProgress = useCallback(async (docId, progressUpdates) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const now = new Date();
      const movie = state.movies.find(m => (m.docId || m.id) === docId);
      const tvShow = isTvShow(movie);
      const tvTracking = tvShow ? normalizeTvTracking(movie, progressUpdates) : null;
      const nextStatus = tvTracking?.watchStatus || progressUpdates.watchStatus || movie?.watchStatus || 'watchlist';
      const completed = nextStatus === 'completed';
      const updates = {
        ...progressUpdates,
        currentSeason: tvTracking?.currentSeason || Number(progressUpdates.currentSeason ?? movie?.currentSeason) || 1,
        currentEpisode: tvTracking?.currentEpisode || Number(progressUpdates.currentEpisode ?? movie?.currentEpisode) || 0,
        watchedEpisodes: tvTracking?.watchedEpisodes || Number(progressUpdates.watchedEpisodes ?? movie?.watchedEpisodes) || 0,
        totalWatchedEpisodes: tvTracking?.totalWatchedEpisodes || Number(progressUpdates.totalWatchedEpisodes ?? movie?.totalWatchedEpisodes) || 0,
        progressPercent: tvTracking?.progressPercent || Number(progressUpdates.progressPercent ?? movie?.progressPercent) || 0,
        watchStatus: nextStatus,
        watched: completed,
        updatedAt: now,
        updated_at: now,
      };

      if (completed && getDateTime(movie?.watchedAt || movie?.watched_at) === 0) {
        updates.watchedAt = now;
        updates.watched_at = now;
      } else if (!completed && tvShow) {
        updates.watchedAt = null;
        updates.watched_at = null;
      }

      if (state.user) {
        await firebaseService.updateMovieStatus(docId, updates);
      }

      dispatch({ type: 'UPDATE_MOVIE', payload: { docId, ...updates } });
    } catch (error) {
      console.error('Error updating media progress:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update media progress' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.movies, state.user]);

  const setWatchStatus = useCallback(async (docId, watchStatus) => {
    await updateMediaProgress(docId, { watchStatus });
  }, [updateMediaProgress]);

  const advanceEpisode = useCallback(async (docId) => {
    const movie = state.movies.find(m => (m.docId || m.id) === docId);
    if (!movie || !isTvShow(movie)) return;

    const currentSeason = Number(movie.currentSeason) || 1;
    const nextTracking = getNextEpisodeProgress({
      ...movie,
      currentSeason,
    });

    await updateMediaProgress(docId, {
      currentSeason: nextTracking.currentSeason,
      currentEpisode: nextTracking.currentEpisode,
      watchedEpisodes: nextTracking.watchedEpisodes,
      totalWatchedEpisodes: nextTracking.totalWatchedEpisodes,
      progressPercent: nextTracking.progressPercent,
      watchStatus: nextTracking.watchStatus,
    });
  }, [state.movies, updateMediaProgress]);

  const setFilter = useCallback((filter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  }, []);

  const setSearchResults = useCallback((results) => {
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const setTheme = useCallback((themeId) => {
    const nextTheme = themeOptions.some(theme => theme.id === themeId) ? themeId : defaultTheme;
    dispatch({ type: 'SET_THEME', payload: nextTheme });
  }, []);

  const updateAccountSettings = useCallback(async (updates) => {
    if (firebaseService.auth.currentUser) {
      const nextProfile = await firebaseService.updateAccountSettings(updates);
      dispatch({ type: 'SET_USER', payload: firebaseService.auth.currentUser });
      dispatch({ type: 'SET_USER_PROFILE', payload: nextProfile });
      return nextProfile;
    }

    const avatarFields = normalizeProfileAvatarFields(
      hasProfileAvatarUpdate(updates) ? updates : state.userProfile || {},
    );
    const nextProfile = storageService.saveUserProfileToLocal({
      uid: state.user?.uid || 'guest',
      email: updates.email?.trim().toLowerCase() || state.userProfile?.email || '',
      displayName: updates.displayName?.trim() || state.userProfile?.displayName || 'Kullanıcı',
      profileNote: updates.profileNote?.trim() || '',
      ...avatarFields,
    }, state.user?.uid);

    dispatch({ type: 'SET_USER_PROFILE', payload: nextProfile });
    return nextProfile;
  }, [state.user, state.userProfile]);

  const getFilteredMovies = () => {
    switch (state.filter) {
      case 'watched':
        return state.movies.filter(m => m.watched || m.watchStatus === 'completed' || m.watchStatus === 'watched');
      case 'watchlist':
        return state.movies.filter(m => m.watchStatus === 'watchlist' || (!m.watched && !m.watchStatus));
      case 'favorites':
        return state.movies.filter(m => m.favorite || m.isFavorite);
      case 'watching':
        return state.movies.filter(m => m.watchStatus === 'watching');
      case 'completed':
        return state.movies.filter(m => m.watchStatus === 'completed' || m.watched);
      case 'dropped':
        return state.movies.filter(m => m.watchStatus === 'dropped');
      default:
        return state.movies;
    }
  };

  const recentWatchedMovies = useMemo(
    () => getRecentMovies(
      state.movies,
      movie => movie.watched || movie.watchStatus === 'completed' || movie.watchStatus === 'watched',
      ['watchedAt', 'watched_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'],
    ),
    [state.movies],
  );

  const recentFavoriteMovies = useMemo(
    () => getRecentMovies(
      state.movies,
      movie => movie.favorite || movie.isFavorite,
      ['favoriteAt', 'favorite_at', 'updatedAt', 'updated_at', 'createdAt', 'created_at'],
    ),
    [state.movies],
  );

  const value = {
    ...state,
    filteredMovies: getFilteredMovies(),
    recentWatchedMovies,
    recentFavoriteMovies,
    loadMovies,
    addMovie,
    deleteMovie,
    toggleWatched,
    toggleFavorite,
    setReaction,
    setWatchStatus,
    updateMediaProgress,
    advanceEpisode,
    setFilter,
    setSearchResults,
    clearError,
    setTheme,
    themeOptions,
    updateAccountSettings,
  };

  return (
    <MovieContext.Provider value={value}>
      {children}
    </MovieContext.Provider>
  );
};

export const useMovies = () => {
  const context = useContext(MovieContext);
  if (!context) {
    throw new Error('useMovies must be used within MovieProvider');
  }
  return context;
};
